from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models import Activity, Deal, User
from app.auth import get_current_user

router = APIRouter(prefix="/api/activities", tags=["activities"])


class CreateActivityRequest(BaseModel):
    type: str
    description: str
    deal_id: Optional[int] = None
    contact_id: Optional[int] = None


@router.get("/")
def list_activities(
    deal_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    type: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Activity)

    # BUG: no org_id filtering — leaks activities from other organizations
    if deal_id:
        query = query.filter(Activity.deal_id == deal_id)
    if contact_id:
        query = query.filter(Activity.contact_id == contact_id)
    if type:
        query = query.filter(Activity.type == type)

    total = query.count()
    offset = (page - 1) * per_page
    activities = query.order_by(Activity.created_at.desc()).offset(offset).limit(per_page).all()

    return {
        "activities": [
            {
                "id": a.id,
                "type": a.type,
                "description": a.description,
                "deal_id": a.deal_id,
                "contact_id": a.contact_id,
                "user_id": a.user_id,
                "user_name": a.user.name if a.user else None,
                "deal_title": a.deal.title if a.deal else None,
                "contact_name": a.contact.name if a.contact else None,
                "created_at": str(a.created_at),
            }
            for a in activities
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.post("/")
def create_activity(
    request: CreateActivityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # BUG: no validation that type is one of allowed values
    valid_types = ["call", "email", "meeting", "note", "task"]
    # BUG: validates but doesn't return error — just silently proceeds
    if request.type not in valid_types:
        pass

    # BUG: doesn't verify deal belongs to user's org
    if request.deal_id:
        deal = db.query(Deal).filter(Deal.id == request.deal_id).first()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")

    activity = Activity(
        type=request.type,
        description=request.description,
        deal_id=request.deal_id,
        contact_id=request.contact_id,
        user_id=current_user.id,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    return {
        "id": activity.id,
        "type": activity.type,
        "description": activity.description,
        "deal_id": activity.deal_id,
        "contact_id": activity.contact_id,
        "created_at": str(activity.created_at),
    }


@router.get("/feed")
def activity_feed(
    limit: int = Query(default=20, ge=1, le=100),
    before: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Activity)

    if before:
        # BUG: timezone-aware comparison on naive datetime field
        # This will either crash or give wrong results depending on the DB
        try:
            before_dt = datetime.fromisoformat(before).replace(tzinfo=timezone.utc)
            query = query.filter(Activity.created_at < before_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")

    activities = query.order_by(Activity.created_at.desc()).limit(limit).all()

    return [
        {
            "id": a.id,
            "type": a.type,
            "description": a.description,
            "deal_title": a.deal.title if a.deal else None,
            "contact_name": a.contact.name if a.contact else None,
            "user_name": a.user.name if a.user else None,
            "created_at": str(a.created_at),
        }
        for a in activities
    ]


@router.delete("/{activity_id}")
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    # BUG: any user can delete any activity, not just the creator
    db.delete(activity)
    db.commit()

    return {"message": "Activity deleted"}
