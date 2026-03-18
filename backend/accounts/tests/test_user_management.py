import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from model_bakery import baker
from nutrition.models import NutritionPlan, PlanMeal
from accounts.views import profile as profile_view

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

    def test_profile_patch_reassigns_nutrition_plan_when_food_preferences_change(self, api_client, member_user):
        template_plan = baker.make(
            NutritionPlan,
            name="Plantilla base",
            is_system=True,
            is_active=True,
            goal="maintain",
            user=None,
        )
        template_meal = baker.make(
            PlanMeal,
            plan=template_plan,
            name="Desayuno",
            meal_type="breakfast",
            order_index=1,
        )
        blocked_recipe = baker.make(
            "nutrition.Recipe",
            name="Tostada con huevo",
            is_active=True,
            category="Desayuno",
            meal_types=["breakfast"],
            allergens=["eggs"],
            ingredients=[{"name": "Huevo", "amount": "2", "unit": "u"}],
        )
        safe_recipe = baker.make(
            "nutrition.Recipe",
            name="Porridge de avena",
            is_active=True,
            category="Desayuno",
            meal_types=["breakfast"],
            allergens=[],
            ingredients=[{"name": "Avena", "amount": "60", "unit": "g"}],
        )
        template_meal.suggested_recipes.set([blocked_recipe, safe_recipe])
        previous_plan = baker.make(
            NutritionPlan,
            user=member_user,
            name="Plan actual",
            is_active=True,
        )

        request = APIRequestFactory().patch(
            "/api/profile/",
            {"allergies": "eggs", "disliked_foods": ""},
            format="json",
        )
        force_authenticate(request, user=member_user)
        response = profile_view(request)

        assert response.status_code == status.HTTP_200_OK
        previous_plan.refresh_from_db()
        assert previous_plan.is_active is False

        new_plan = NutritionPlan.objects.filter(user=member_user, is_active=True).exclude(id=previous_plan.id).first()
        assert new_plan is not None
        new_meal = new_plan.meals.get(name="Desayuno")
        assigned_recipe_ids = list(new_meal.suggested_recipes.values_list("id", flat=True))
        assert safe_recipe.id in assigned_recipe_ids
        assert blocked_recipe.id not in assigned_recipe_ids

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
