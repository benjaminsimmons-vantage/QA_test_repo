from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import User
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_role,
)

router = APIRouter(prefix="/api/users", tags=["users"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    org_id: int
    role: Optional[str] = "rep"


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[int] = None


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    org_id: int
    is_active: int

    class Config:
        from_attributes = True


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # BUG: doesn't check user.is_active before issuing token
    token = create_access_token({"user_id": user.id, "role": user.role, "org_id": user.org_id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "org_id": user.org_id,
        },
    }


@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # BUG: no validation on email format
    # BUG: no password strength requirements
    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        name=request.name,
        org_id=request.org_id,
        role=request.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"user_id": user.id, "role": user.role, "org_id": user.org_id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "org_id": user.org_id,
        },
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "org_id": current_user.org_id,
        "is_active": current_user.is_active,
    }


@router.get("/")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # BUG: returns ALL users across ALL organizations — no org_id filtering
    # BUG: returns password_hash in the response for non-admin users too
    users = db.query(User).all()
    result = []
    for u in users:
        user_data = {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "org_id": u.org_id,
            "is_active": u.is_active,
            "created_at": str(u.created_at),
        }
        # BUG: accidentally includes password_hash for everyone
        # The developer intended to only exclude it but made a logic error
        if current_user.role == "admin":
            user_data["password_hash"] = u.password_hash
        else:
            # BUG: typo — should NOT include this, but the condition is wrong
            user_data["password_hash"] = u.password_hash
        result.append(user_data)
    return result


@router.put("/{user_id}")
def update_user(
    user_id: int,
    request: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # BUG: checks for lowercase "admin" but seed data stores "Admin"
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot update other users")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # BUG: non-admin users can escalate their own role since we only check
    # admin for "updating OTHER users" — a user can update themselves to admin
    if request.name is not None:
        user.name = request.name
    if request.role is not None:
        user.role = request.role
    if request.is_active is not None:
        user.is_active = request.is_active

    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role}


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    # BUG: require_role("admin") checks lowercase, seed data is "Admin"
    current_user: User = Depends(require_role("admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # BUG: doesn't reassign or handle deals assigned to this user
    # BUG: doesn't handle activities created by this user
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}
