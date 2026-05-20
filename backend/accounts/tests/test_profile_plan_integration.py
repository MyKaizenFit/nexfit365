"""Tests de integración: cambios de perfil -> actualización/reasignación de planes."""

import pytest
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from accounts.services import DefaultPlanAssignmentService
from dashboard.models import DefaultPlanConfiguration
from nutrition.models import NutritionPlan, NutritionPlanAssignment, PlanMeal
from workouts.models import Exercise, WorkoutDay, WorkoutDayExercise, WorkoutProgram


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

    def test_default_assignment_creates_user_plans_and_active_nutrition_assignment(self, user):
        nutrition_template = NutritionPlan.objects.create(
            name="Plantilla pérdida",
            daily_calories=1800,
            goal="lose_weight",
            is_template=True,
            is_active=True,
        )
        PlanMeal.objects.create(
            plan=nutrition_template,
            name="Desayuno",
            meal_type="breakfast",
            order_index=1,
            calories=450,
            protein=Decimal("30.0"),
            carbs=Decimal("45.0"),
            fat=Decimal("12.0"),
        )
        workout_template = WorkoutProgram.objects.create(
            name="Rutina pérdida",
            goal="weight_loss",
            is_template=True,
            is_active=True,
            days_per_week=1,
        )
        workout_day = WorkoutDay.objects.create(
            program=workout_template,
            name="Full body",
            day_number=1,
            order_index=1,
        )
        exercise = Exercise.objects.create(name="Sentadilla test", is_system=True)
        WorkoutDayExercise.objects.create(
            workout_day=workout_day,
            exercise=exercise,
            sets=3,
            reps="10",
        )
        DefaultPlanConfiguration.objects.create(
            name="Config pérdida",
            priority=1,
            is_active=True,
            main_goal="lose_weight",
            default_nutrition_plan=nutrition_template,
            default_workout_program=workout_template,
        )

        result = DefaultPlanAssignmentService(user).assign()

        assert result.nutrition_plan is not None
        assert result.workout_program is not None
        assert result.nutrition_plan.user == user
        assert result.workout_program.user == user
        assert NutritionPlanAssignment.objects.filter(
            plan=result.nutrition_plan,
            user=user,
            is_active=True,
        ).exists()
        assert result.nutrition_plan.meals.count() == 1
        assert result.workout_program.days.first().exercises.count() == 1

    def test_default_assignment_preserves_active_custom_workout_plan(self, user):
        custom_workout = WorkoutProgram.objects.create(
            user=user,
            name="Vamos Miriam!!!",
            is_active=True,
            is_template=False,
            is_system=False,
        )
        workout_template = WorkoutProgram.objects.create(
            name="Rutina pérdida",
            goal="weight_loss",
            is_template=True,
            is_active=True,
            days_per_week=1,
        )
        DefaultPlanConfiguration.objects.create(
            name="Config pérdida",
            priority=1,
            is_active=True,
            main_goal="lose_weight",
            default_workout_program=workout_template,
        )

        result = DefaultPlanAssignmentService(user).assign()

        custom_workout.refresh_from_db()
        assert result.workout_program == custom_workout
        assert custom_workout.is_active is True
        assert WorkoutProgram.objects.filter(user=user).count() == 1
