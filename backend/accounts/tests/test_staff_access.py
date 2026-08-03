import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

from accounts.permissions import IsAdminOrStaff, user_has_staff_access

User = get_user_model()


@pytest.mark.django_db
def test_role_admin_without_staff_has_no_elevated_access():
    user = User.objects.create_user(
        email="role-admin-only@test.com",
        password="testpass123",
        role="admin",
        is_staff=False,
        is_superuser=False,
    )
    assert user_has_staff_access(user) is False

    factory = APIRequestFactory()
    request = factory.get("/")
    request.user = user
    assert IsAdminOrStaff().has_permission(request, None) is False


@pytest.mark.django_db
def test_staff_user_has_elevated_access():
    user = User.objects.create_user(
        email="staff@test.com",
        password="testpass123",
        role="basic",
        is_staff=True,
    )
    assert user_has_staff_access(user) is True
