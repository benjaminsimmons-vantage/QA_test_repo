import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.auth import hash_password
from app.models import Organization, User

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def override_get_db(db):
    def _get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = _get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def seed_org(db):
    org = Organization(name="Test Org")
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@pytest.fixture()
def admin_user(db, seed_org):
    user = User(
        email="admin@test.com",
        password_hash=hash_password("password"),
        name="Admin User",
        role="admin",
        org_id=seed_org.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def rep_user(db, seed_org):
    user = User(
        email="rep@test.com",
        password_hash=hash_password("password"),
        name="Rep User",
        role="rep",
        org_id=seed_org.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def auth_header(client, email, password):
    resp = client.post("/api/users/login", json={"email": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
