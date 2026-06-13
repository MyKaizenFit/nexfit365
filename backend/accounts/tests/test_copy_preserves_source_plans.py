"""Tests: copiar desde plan de usuario no modifica el original."""

import pytest
from decimal import Decimal

from accounts.default_plan_templates import copy_nutrition_plan_template, copy_workout_program_template
from nutrition.models import NutritionPlan, PlanMeal
from workouts.models import Exercise, WorkoutDay, WorkoutDayExercise, WorkoutProgram


@pytest.mark.django_db
class TestCopyPreservesUserSourcePlans:
    def test_copy_nutrition_from_user_plan_preserves_original(self, user):
        original = NutritionPlan.objects.create(
            user=user,
            name="Menú personal Lucía",
            is_active=True,
            is_template=False,
            is_system=False,
            daily_calories=1900,
        )
        PlanMeal.objects.create(
            plan=original,
            name="Desayuno",
            meal_type="breakfast",
            order_index=1,
            calories=400,
            protein=Decimal("25.0"),
            carbs=Decimal("45.0"),
            fat=Decimal("10.0"),
        )
        before = {
            "id": original.id,
            "user_id": original.user_id,
            "is_template": original.is_template,
            "is_active": original.is_active,
            "name": original.name,
            "meal_count": original.meals.count(),
        }

        copied, created = copy_nutrition_plan_template(original, label="Nutrición test copia")

        original.refresh_from_db()
        assert created is True
        assert copied.id != original.id
        assert copied.user_id is None
        assert copied.is_template is True
        assert original.user_id == user.id
        assert original.is_template is False
        assert original.is_active is True
        assert original.name == before["name"]
        assert original.meals.count() == before["meal_count"]
        assert "auto_default_source_nutrition_id:" in " ".join(copied.tags)

    def test_copy_workout_from_user_plan_preserves_original(self, user):
        exercise = Exercise.objects.create(name="Sentadilla preservar", is_system=True)
        original = WorkoutProgram.objects.create(
            user=user,
            name="Rutina personal Pedro",
            is_active=True,
            is_template=False,
            is_system=False,
            days_per_week=2,
        )
        day = WorkoutDay.objects.create(program=original, name="Día pierna", day_number=1, order_index=1)
        WorkoutDayExercise.objects.create(workout_day=day, exercise=exercise, sets=3, reps="10")

        copied, created = copy_workout_program_template(original, label="Entreno test copia")

        original.refresh_from_db()
        assert created is True
        assert copied.id != original.id
        assert copied.user_id is None
        assert copied.is_template is True
        assert original.user_id == user.id
        assert original.is_template is False
        assert original.is_active is True
        assert original.days.count() == 1
        assert original.days.first().exercises.count() == 1
