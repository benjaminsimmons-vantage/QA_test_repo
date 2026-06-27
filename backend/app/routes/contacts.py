from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import Contact, User
from app.auth import get_current_user

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


class CreateContactRequest(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None


class UpdateContactRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None


@router.get("/")
def list_contacts(
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Contact).filter(Contact.org_id == current_user.org_id)

    if search:
        # BUG: OR chain doesn't use proper grouping with the org_id filter
        # This means the name/email/company filters bypass the org_id restriction
        query = db.query(Contact).filter(
            (Contact.name.ilike(f"%{search}%"))
            | (Contact.email.ilike(f"%{search}%"))
            | (Contact.company.ilike(f"%{search}%"))
        )

    total = query.count()
    offset = (page - 1) * per_page
    contacts = query.offset(offset).limit(per_page).all()

    return {
        "contacts": [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "company": c.company,
                "created_at": str(c.created_at),
                "deal_count": len(c.deals),
            }
            for c in contacts
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/{contact_id}")
def get_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.org_id == current_user.org_id,
    ).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    return {
        "id": contact.id,
        "name": contact.name,
        "email": contact.email,
        "phone": contact.phone,
        "company": contact.company,
        "created_at": str(contact.created_at),
        "deals": [
            {"id": d.id, "title": d.title, "stage": d.stage, "value": d.value}
            for d in contact.deals
        ],
        "activities": [
            {
                "id": a.id,
                "type": a.type,
                "description": a.description,
                "created_at": str(a.created_at),
            }
            for a in contact.activities
        ],
    }


@router.post("/")
def create_contact(
    request: CreateContactRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # BUG: no duplicate check on email within org
    # BUG: no email format validation
    contact = Contact(
        name=request.name,
        email=request.email,
        phone=request.phone,
        company=request.company,
        org_id=current_user.org_id,
        created_by=current_user.id,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)

    return {
        "id": contact.id,
        "name": contact.name,
        "email": contact.email,
        "phone": contact.phone,
        "company": contact.company,
    }


@router.put("/{contact_id}")
def update_contact(
    contact_id: int,
    request: UpdateContactRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.org_id == current_user.org_id,
    ).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # BUG: allows setting name to empty string
    if request.name is not None:
        contact.name = request.name
    if request.email is not None:
        contact.email = request.email
    if request.phone is not None:
        contact.phone = request.phone
    if request.company is not None:
        contact.company = request.company

    db.commit()
    db.refresh(contact)

    return {
        "id": contact.id,
        "name": contact.name,
        "email": contact.email,
        "phone": contact.phone,
        "company": contact.company,
    }


@router.delete("/{contact_id}")
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.org_id == current_user.org_id,
    ).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # BUG: doesn't check if contact has active deals — will orphan deal.contact_id references
    # BUG: doesn't handle associated activities
    db.delete(contact)
    db.commit()

    return {"message": "Contact deleted"}
