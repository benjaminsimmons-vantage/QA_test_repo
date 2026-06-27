import jwt
import bcrypt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User

# BUG: secret key is hardcoded and weak
SECRET_KEY = "dealflow-secret-2024"
ALGORITHM = "HS256"
# BUG: token expiry set to 30 days — excessively long
ACCESS_TOKEN_EXPIRE_MINUTES = 43200

security = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        # BUG: token expiration is decoded but timezone comparison is naive vs aware
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    # BUG: never checks user.is_active — deactivated users can still use tokens
    return user


def require_role(required_role: str):
    def role_checker(current_user: User = Depends(get_current_user)):
        # BUG: case-sensitive comparison — seed data has "Admin" but checks for "admin"
        if current_user.role != required_role:
            raise HTTPException(
                status_code=403, detail="Insufficient permissions"
            )
        return current_user
    return role_checker


def require_any_role(*roles):
    def role_checker(current_user: User = Depends(get_current_user)):
        # BUG: same case-sensitivity issue propagated here
        if current_user.role not in roles:
            raise HTTPException(
                status_code=403, detail="Insufficient permissions"
            )
        return current_user
    return role_checker
