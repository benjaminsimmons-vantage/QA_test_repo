from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.database import get_db
from app.models import Deal, StageHistory, Activity, User
from app.auth import get_current_user

router = APIRouter(prefix="/api/deals", tags=["deals"])

VALID_STAGES = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]


class CreateDealRequest(BaseModel):
    title: str
    value: float
    stage: Optional[str] = "lead"
    contact_id: Optional[int] = None
    assigned_to: Optional[int] = None
    expected_close_date: Optional[str] = None
    notes: Optional[str] = ""
    priority: Optional[str] = "3"


class UpdateDealRequest(BaseModel):
    title: Optional[str] = None
    value: Optional[float] = None
    stage: Optional[str] = None
    contact_id: Optional[int] = None
    assigned_to: Optional[int] = None
    expected_close_date: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[str] = None


class MoveDealRequest(BaseModel):
    stage: str


@router.get("/")
def list_deals(
    stage: Optional[str] = None,
    assigned_to: Optional[int] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # BUG: IDOR — no org_id filter, users can see deals from other orgs
    query = db.query(Deal)

    if stage:
        query = query.filter(Deal.stage == stage)

    if assigned_to:
        query = query.filter(Deal.assigned_to == assigned_to)

    if search:
        # BUG: SQL injection vulnerability — raw SQL with string interpolation
        raw_sql = text(f"SELECT id FROM deals WHERE title LIKE '%{search}%' OR notes LIKE '%{search}%'")
        result = db.execute(raw_sql)
        deal_ids = [row[0] for row in result]
        query = query.filter(Deal.id.in_(deal_ids))

    # BUG: sort_by not validated — could sort by arbitrary columns
    if sort_by and sort_order:
        col = getattr(Deal, sort_by, Deal.created_at)
        if sort_order == "desc":
            query = query.order_by(col.desc())
        else:
            query = query.order_by(col.asc())

    total = query.count()

    # BUG: off-by-one — page 2 skips one deal
    # Should be (page - 1) * per_page, but uses page * per_page for offset
    offset = page * per_page if page > 1 else 0
    deals = query.offset(offset).limit(per_page).all()

    return {
        "deals": [
            {
                "id": d.id,
                "title": d.title,
                "value": d.value,
                "stage": d.stage,
                "contact_id": d.contact_id,
                "assigned_to": d.assigned_to,
                "assigned_user_name": d.assigned_user.name if d.assigned_user else None,
                "contact_name": d.contact.name if d.contact else None,
                "org_id": d.org_id,
                "created_at": str(d.created_at),
                "updated_at": str(d.updated_at),
                "expected_close_date": d.expected_close_date,
                "notes": d.notes,
                "priority": d.priority,
            }
            for d in deals
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        # BUG: total_pages calculation uses integer division, off by one when not evenly divisible
        "total_pages": total // per_page,
    }


@router.get("/{deal_id}")
def get_deal(
    deal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # BUG: no org_id check — any authenticated user can view any deal
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    return {
        "id": deal.id,
        "title": deal.title,
        "value": deal.value,
        "stage": deal.stage,
        "contact_id": deal.contact_id,
        "assigned_to": deal.assigned_to,
        "assigned_user_name": deal.assigned_user.name if deal.assigned_user else None,
        "contact_name": deal.contact.name if deal.contact else None,
        "org_id": deal.org_id,
        "created_at": str(deal.created_at),
        "updated_at": str(deal.updated_at),
        "expected_close_date": deal.expected_close_date,
        "notes": deal.notes,
        "priority": deal.priority,
        "stage_history": [
            {
                "from_stage": sh.from_stage,
                "to_stage": sh.to_stage,
                "changed_at": str(sh.changed_at),
            }
            for sh in deal.stage_history
        ],
        "activities": [
            {
                "id": a.id,
                "type": a.type,
                "description": a.description,
                "created_at": str(a.created_at),
                "user_name": a.user.name if a.user else None,
            }
            for a in deal.activities
        ],
    }


@router.post("/")
def create_deal(
    request: CreateDealRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # BUG: no validation that value is positive
    # BUG: no validation that stage is in VALID_STAGES
    # BUG: no validation that contact_id belongs to same org
    deal = Deal(
        title=request.title,
        value=request.value,
        stage=request.stage,
        contact_id=request.contact_id,
        assigned_to=request.assigned_to or current_user.id,
        org_id=current_user.org_id,
        expected_close_date=request.expected_close_date,
        notes=request.notes,
        priority=request.priority,
    )
    db.add(deal)
    db.commit()
    db.refresh(deal)

    history = StageHistory(
        deal_id=deal.id,
        from_stage=None,
        to_stage=deal.stage,
        changed_by=current_user.id,
    )
    db.add(history)
    db.commit()

    return {"id": deal.id, "title": deal.title, "stage": deal.stage, "value": deal.value}


@router.put("/{deal_id}")
def update_deal(
    deal_id: int,
    request: UpdateDealRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # BUG: no org_id verification
    # BUG: no check if user has permission to update this deal

    old_stage = deal.stage

    if request.title is not None:
        deal.title = request.title
    if request.value is not None:
        deal.value = request.value
    if request.stage is not None:
        deal.stage = request.stage
    if request.contact_id is not None:
        deal.contact_id = request.contact_id
    if request.assigned_to is not None:
        deal.assigned_to = request.assigned_to
    if request.expected_close_date is not None:
        deal.expected_close_date = request.expected_close_date
    if request.notes is not None:
        deal.notes = request.notes
    if request.priority is not None:
        deal.priority = request.priority

    # BUG: stage history recorded even if stage didn't actually change
    if request.stage is not None:
        history = StageHistory(
            deal_id=deal.id,
            from_stage=old_stage,
            to_stage=request.stage,
            changed_by=current_user.id,
        )
        db.add(history)

    db.commit()
    db.refresh(deal)

    return {
        "id": deal.id,
        "title": deal.title,
        "value": deal.value,
        "stage": deal.stage,
    }


@router.put("/{deal_id}/move")
def move_deal(
    deal_id: int,
    request: MoveDealRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    if request.stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail="Invalid stage")

    # BUG: no check preventing moving closed deals back to open stages
    # BUG: no optimistic locking — race condition if two users move simultaneously
    old_stage = deal.stage
    deal.stage = request.stage

    history = StageHistory(
        deal_id=deal.id,
        from_stage=old_stage,
        to_stage=request.stage,
        changed_by=current_user.id,
    )
    db.add(history)

    activity = Activity(
        type="stage_change",
        description=f"Moved deal from {old_stage} to {request.stage}",
        deal_id=deal.id,
        user_id=current_user.id,
    )
    db.add(activity)

    db.commit()
    db.refresh(deal)

    return {
        "id": deal.id,
        "title": deal.title,
        "stage": deal.stage,
        "previous_stage": old_stage,
    }


@router.delete("/{deal_id}")
def delete_deal(
    deal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # BUG: no role check — any user can delete any deal
    # BUG: doesn't delete associated stage_history and activities (FK constraint may fail)
    # BUG: no org_id check
    db.delete(deal)
    db.commit()

    return {"message": "Deal deleted"}


@router.get("/{deal_id}/history")
def get_deal_history(
    deal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    history = (
        db.query(StageHistory)
        .filter(StageHistory.deal_id == deal_id)
        # BUG: sorts ascending but frontend expects descending (newest first)
        .order_by(StageHistory.changed_at.asc())
        .all()
    )

    return [
        {
            "id": h.id,
            "from_stage": h.from_stage,
            "to_stage": h.to_stage,
            "changed_at": str(h.changed_at),
        }
        for h in history
    ]
