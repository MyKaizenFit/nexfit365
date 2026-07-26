"""Shared fixtures for accounts app tests."""

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="accounts-conftest@test.com",
        password="testpass123",
    )
