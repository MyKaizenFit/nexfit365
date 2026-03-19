"""Tests de integración: cambios de perfil -> actualización/reasignación de planes."""

import pytest
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from nutrition.models import NutritionPlan, PlanMeal


User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="integration_profile@test.com",
        password="testpass123",
        weight=Decimal("80.0"),
        target_weight=Decimal("75.0"),
        activity_level="moderate",
        main_goal="lose_weight",
    )


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def active_plan(user):
    plan = NutritionPlan.objects.create(
        user=user,
        name="Plan Integración",
        is_active=True,
        daily_calories=2000,
        protein_grams=150,
        carbs_grams=220,
        fat_grams=60,
    )
    PlanMeal.objects.create(
        plan=plan,
        name="Desayuno",
        meal_type="breakfast",
        order_index=1,
        calories=500,
        protein=Decimal("30.0"),
        carbs=Decimal("45.0"),
        fat=Decimal("15.0"),
    )
    return plan


@pytest.mark.django_db
class TestProfilePlanIntegration:
    def test_profile_weight_change_updates_plan_and_reflects_in_current_plan(
        self,
        auth_client,
        active_plan,
        monkeypatch,
    ):
        """PATCH /api/profile/ debe disparar ajuste del plan y devolver bandera plan_updated."""

        def fake_update(self, old_weight=None, old_goal=None, old_activity_level=None, reason="auto_updated"):
            plan = NutritionPlan.objects.get(id=active_plan.id)
            plan.daily_calories = 2100
            plan.protein_grams = 160
            plan.save(update_fields=["daily_calories", "protein_grams"])
            return plan

        monkeypatch.setattr(
            "nutrition.services.PlanAutoUpdateService.update_plan_if_needed",
            fake_update,
        )
        monkeypatch.setattr("notifications.signals.send_notifications_async", lambda *args, **kwargs: None)

        response = auth_client.patch(
            "/api/profile/",
            {"weight": "83.0"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data.get("plan_updated") is True

        current_plan_response = auth_client.get("/api/nutrition/current-plan/")
        assert current_plan_response.status_code == status.HTTP_200_OK
        assert current_plan_response.data is not None
        assert current_plan_response.data.get("plan", {}).get("daily_calories") == 2100

    def test_profile_assignment_fields_trigger_reassignment_service(
        self,
        auth_client,
        monkeypatch,
    ):
        """Cambiar training_location debe invocar DefaultPlanAssignmentService.assign."""
        calls = {"count": 0}

        def fake_assign(self):
            calls["count"] += 1
            return None

        monkeypatch.setattr(
            "accounts.services.DefaultPlanAssignmentService.assign",
            fake_assign,
        )

        response = auth_client.patch(
            "/api/profile/",
            {"training_location": "gym"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert calls["count"] == 1
