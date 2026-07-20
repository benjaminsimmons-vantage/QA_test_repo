import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException
from app.models import User
from app.auth import require_role, require_any_role


def _make_user(role: str) -> User:
    user = MagicMock(spec=User)
    user.role = role
    return user


class TestRequireRole:
    def test_exact_match(self):
        checker = require_role("admin")
        user = _make_user("admin")
        assert checker(current_user=user) is user

    def test_case_insensitive_title_case(self):
        checker = require_role("admin")
        user = _make_user("Admin")
        assert checker(current_user=user) is user

    def test_case_insensitive_upper_case(self):
        checker = require_role("admin")
        user = _make_user("ADMIN")
        assert checker(current_user=user) is user

    def test_wrong_role_denied(self):
        checker = require_role("admin")
        user = _make_user("rep")
        with pytest.raises(HTTPException) as exc_info:
            checker(current_user=user)
        assert exc_info.value.status_code == 403


class TestRequireAnyRole:
    def test_exact_match(self):
        checker = require_any_role("admin", "manager")
        user = _make_user("admin")
        assert checker(current_user=user) is user

    def test_case_insensitive_title_case(self):
        checker = require_any_role("admin", "manager")
        user = _make_user("Manager")
        assert checker(current_user=user) is user

    def test_case_insensitive_upper_case(self):
        checker = require_any_role("admin", "manager")
        user = _make_user("ADMIN")
        assert checker(current_user=user) is user

    def test_wrong_role_denied(self):
        checker = require_any_role("admin", "manager")
        user = _make_user("rep")
        with pytest.raises(HTTPException) as exc_info:
            checker(current_user=user)
        assert exc_info.value.status_code == 403
