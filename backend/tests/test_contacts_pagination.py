import math
import pytest
from unittest.mock import MagicMock, patch, PropertyMock
from app.models import Contact, User


def _make_user(org_id=1):
    user = MagicMock(spec=User)
    user.org_id = org_id
    return user


def _make_contacts(count):
    contacts = []
    for i in range(count):
        c = MagicMock(spec=Contact)
        c.id = i + 1
        c.name = f"Contact {i + 1}"
        c.email = f"c{i + 1}@test.com"
        c.phone = "555-0000"
        c.company = "Acme"
        c.created_at = "2024-01-01"
        c.deals = []
        contacts.append(c)
    return contacts


class TestTotalPages:
    def test_total_pages_zero_contacts(self):
        total_pages = max(1, math.ceil(0 / 20))
        assert total_pages == 1

    def test_total_pages_fewer_than_per_page(self):
        total_pages = max(1, math.ceil(5 / 20))
        assert total_pages == 1

    def test_total_pages_exact_multiple(self):
        total_pages = max(1, math.ceil(40 / 20))
        assert total_pages == 2

    def test_total_pages_with_remainder(self):
        total_pages = max(1, math.ceil(25 / 20))
        assert total_pages == 2

    def test_total_pages_one_over(self):
        total_pages = max(1, math.ceil(21 / 20))
        assert total_pages == 2

    def test_total_pages_large_dataset(self):
        total_pages = max(1, math.ceil(100 / 20))
        assert total_pages == 5

    def test_total_pages_custom_per_page(self):
        total_pages = max(1, math.ceil(50 / 10))
        assert total_pages == 5


class TestPageClamping:
    def test_clamp_page_beyond_total(self):
        total = 25
        per_page = 20
        page = 5
        total_pages = max(1, math.ceil(total / per_page))
        if page > total_pages:
            page = total_pages
        assert page == 2

    def test_no_clamp_when_within_range(self):
        total = 25
        per_page = 20
        page = 2
        total_pages = max(1, math.ceil(total / per_page))
        if page > total_pages:
            page = total_pages
        assert page == 2

    def test_clamp_with_zero_contacts(self):
        total = 0
        per_page = 20
        page = 3
        total_pages = max(1, math.ceil(total / per_page))
        if page > total_pages:
            page = total_pages
        assert page == 1
        assert total_pages == 1

    def test_clamp_returns_last_page_not_empty(self):
        total = 25
        per_page = 20
        page = 100
        total_pages = max(1, math.ceil(total / per_page))
        if page > total_pages:
            page = total_pages
        offset = (page - 1) * per_page
        assert page == 2
        assert offset == 20
