import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import Organization, User, Deal
from app.auth import hash_password, create_access_token

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestSession()
    org = Organization(id=1, name="TestOrg")
    db.add(org)
    user = User(
        id=1,
        email="test@test.com",
        password_hash=hash_password("password"),
        name="Test User",
        role="admin",
        org_id=1,
    )
    db.add(user)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    from app.main import app
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_header():
    token = create_access_token({"user_id": 1})
    return {"Authorization": f"Bearer {token}"}


def _seed_deals(count, stage=None):
    db = TestSession()
    for i in range(count):
        db.add(Deal(
            title=f"Deal {i + 1}",
            value=float((i + 1) * 1000),
            stage=stage or "lead",
            org_id=1,
            assigned_to=1,
        ))
    db.commit()
    db.close()


class TestDealsPagination:
    def test_page1_returns_first_page(self, client, auth_header):
        _seed_deals(25)
        resp = client.get("/api/deals/?page=1&per_page=10", headers=auth_header)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["deals"]) == 10
        assert data["page"] == 1

    def test_page2_continues_without_gap(self, client, auth_header):
        _seed_deals(25)
        resp1 = client.get("/api/deals/?page=1&per_page=10&sort_by=id&sort_order=asc", headers=auth_header)
        resp2 = client.get("/api/deals/?page=2&per_page=10&sort_by=id&sort_order=asc", headers=auth_header)
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        page1_ids = {d["id"] for d in resp1.json()["deals"]}
        page2_ids = {d["id"] for d in resp2.json()["deals"]}
        assert len(page1_ids) == 10
        assert len(page2_ids) == 10
        assert page1_ids.isdisjoint(page2_ids)
        assert max(page1_ids) < min(page2_ids)

    def test_all_pages_cover_every_deal(self, client, auth_header):
        _seed_deals(25)
        all_ids = set()
        for page in range(1, 4):
            resp = client.get(f"/api/deals/?page={page}&per_page=10&sort_by=id&sort_order=asc", headers=auth_header)
            assert resp.status_code == 200
            ids = {d["id"] for d in resp.json()["deals"]}
            assert all_ids.isdisjoint(ids)
            all_ids.update(ids)
        assert len(all_ids) == 25

    def test_total_pages_exact_multiple(self, client, auth_header):
        _seed_deals(20)
        resp = client.get("/api/deals/?per_page=10", headers=auth_header)
        assert resp.json()["total_pages"] == 2

    def test_total_pages_not_exact_multiple(self, client, auth_header):
        _seed_deals(25)
        resp = client.get("/api/deals/?per_page=10", headers=auth_header)
        assert resp.json()["total_pages"] == 3

    def test_total_pages_minimum_one_when_empty(self, client, auth_header):
        resp = client.get("/api/deals/?per_page=10", headers=auth_header)
        assert resp.json()["total_pages"] == 1
        assert resp.json()["total"] == 0

    def test_pagination_with_stage_filter(self, client, auth_header):
        _seed_deals(15, stage="lead")
        _seed_deals(5, stage="qualified")
        resp = client.get("/api/deals/?stage=lead&page=1&per_page=10&sort_by=id&sort_order=asc", headers=auth_header)
        data = resp.json()
        assert data["total"] == 15
        assert len(data["deals"]) == 10
        assert data["total_pages"] == 2

        resp2 = client.get("/api/deals/?stage=lead&page=2&per_page=10&sort_by=id&sort_order=asc", headers=auth_header)
        data2 = resp2.json()
        assert len(data2["deals"]) == 5
        page1_ids = {d["id"] for d in data["deals"]}
        page2_ids = {d["id"] for d in data2["deals"]}
        assert page1_ids.isdisjoint(page2_ids)

    def test_pagination_with_assigned_to_filter(self, client, auth_header):
        _seed_deals(12)
        resp = client.get("/api/deals/?assigned_to=1&page=1&per_page=5", headers=auth_header)
        data = resp.json()
        assert data["total"] == 12
        assert len(data["deals"]) == 5
        assert data["total_pages"] == 3
