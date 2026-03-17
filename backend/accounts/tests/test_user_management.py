import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from model_bakery import baker

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user():
    return baker.make(User, email="admin@test.com", role="admin", is_staff=True, is_superuser=True)


@pytest.fixture
def member_user():
    return baker.make(User, email="member@test.com", role="basic", is_staff=False)


@pytest.mark.django_db
class TestProfileEndpoints:
    def test_me_authenticated(self, api_client, member_user):
        api_client.force_authenticate(user=member_user)
        url = reverse("me")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == member_user.email

    def test_me_unauthenticated(self, api_client):
        url = reverse("me")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_profile_patch_updates_names(self, api_client, member_user):
        api_client.force_authenticate(user=member_user)
        url = reverse("profile")

        response = api_client.patch(url, {"first_name": "Nuevo", "last_name": "Nombre"})

        assert response.status_code == status.HTTP_200_OK
        member_user.refresh_from_db()
        assert member_user.first_name == "Nuevo"
        assert member_user.last_name == "Nombre"

    def test_profile_summary_authenticated(self, api_client, member_user):
        api_client.force_authenticate(user=member_user)
        url = reverse("profile_summary")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "email" in response.data
        assert "name" in response.data

    def test_update_goals(self, api_client, member_user):
        api_client.force_authenticate(user=member_user)
        url = reverse("update_goals")

        payload = {
            "main_goal": "lose_weight",
            "activity_level": "active",
            "target_weight": 75,
        }
        response = api_client.put(url, payload)

        assert response.status_code == status.HTTP_200_OK
        member_user.refresh_from_db()
        assert member_user.main_goal == "lose_weight"
        assert member_user.activity_level == "active"

    def test_initial_registration_status(self, api_client, member_user):
        api_client.force_authenticate(user=member_user)
        url = reverse("initial_registration_status")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "is_complete" in response.data
        assert "completion_percentage" in response.data


@pytest.mark.django_db
class TestAdminUsersEndpoints:
    def test_admin_users_list_admin_allowed(self, api_client, admin_user):
        baker.make(User, email="u1@test.com", role="basic")
        baker.make(User, email="u2@test.com", role="pro")

        api_client.force_authenticate(user=admin_user)
        url = reverse("admin-users-list")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert response.data["count"] >= 3

    def test_admin_users_list_member_forbidden(self, api_client, member_user):
        api_client.force_authenticate(user=member_user)
        url = reverse("admin-users-list")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_users_create(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        url = reverse("admin-users-list")

        payload = {
            "email": "created@test.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
            "first_name": "Created",
            "last_name": "User",
            "role": "member",
        }
        response = api_client.post(url, payload)

        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email="created@test.com").exists()

    def test_admin_users_toggle_status(self, api_client, admin_user, member_user):
        api_client.force_authenticate(user=admin_user)
        url = reverse("admin-users-toggle-status", kwargs={"pk": member_user.pk})

        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        member_user.refresh_from_db()
        assert member_user.is_active is False

    def test_admin_users_change_role(self, api_client, admin_user, member_user):
        api_client.force_authenticate(user=admin_user)
        url = reverse("admin-users-change-role", kwargs={"pk": member_user.pk})

        response = api_client.post(url, {"role": "trainer"})

        assert response.status_code == status.HTTP_200_OK
        member_user.refresh_from_db()
        assert member_user.role == "pro"

    def test_admin_users_stats(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        url = reverse("admin-users-stats")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "total_users" in response.data
        assert "active_users" in response.data
