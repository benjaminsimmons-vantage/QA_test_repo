from app.models import User
from tests.conftest import auth_header


def test_admin_can_list_users(client, admin_user, rep_user):
    headers = auth_header(client, "admin@test.com", "password")
    resp = client.get("/api/users/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


def test_admin_can_delete_user(client, admin_user, rep_user):
    headers = auth_header(client, "admin@test.com", "password")
    resp = client.delete(f"/api/users/{rep_user.id}", headers=headers)
    assert resp.status_code == 200


def test_non_admin_cannot_delete_user(client, admin_user, rep_user):
    headers = auth_header(client, "rep@test.com", "password")
    resp = client.delete(f"/api/users/{admin_user.id}", headers=headers)
    assert resp.status_code == 403


def test_register_normalizes_role_to_lowercase(client, db, seed_org):
    resp = client.post("/api/users/register", json={
        "email": "newadmin@test.com",
        "password": "pass123",
        "name": "New Admin",
        "org_id": seed_org.id,
        "role": "Admin",
    })
    assert resp.status_code == 200
    user = db.query(User).filter(User.email == "newadmin@test.com").first()
    assert user.role == "admin"


def test_update_user_normalizes_role_to_lowercase(client, admin_user, rep_user):
    headers = auth_header(client, "admin@test.com", "password")
    resp = client.put(f"/api/users/{rep_user.id}", json={"role": "Manager"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["role"] == "manager"
