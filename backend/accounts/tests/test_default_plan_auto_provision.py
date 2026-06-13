"""Tests de selección de plantillas en auto-provisionado."""

import pytest
from decimal import Decimal

from accounts.default_plan_auto_provision import pick_nutrition_source_name, pick_workout_source_name
from nutrition.models import NutritionPlan, PlanMeal
from workouts.models import Exercise, WorkoutDay, WorkoutDayExercise, WorkoutProgram


@pytest.fixture
def catalog(db):
    nutrition_general = NutritionPlan.objects.create(
        name="Dieta Flexible Personalizada",
        goal="maintain",
        is_template=True,
        is_active=True,
        daily_calories=2000,
    )
    PlanMeal.objects.create(
        plan=nutrition_general,
        name="Comida",
        meal_type="lunch",
        order_index=1,
        calories=500,
        protein=Decimal("30.0"),
        carbs=Decimal("50.0"),
        fat=Decimal("12.0"),
    )
    nutrition_muscle = NutritionPlan.objects.create(
        name="Segundo Menú Personalizado!",
        goal="gain_muscle",
        is_template=True,
        is_active=True,
        daily_calories=2600,
    )
    PlanMeal.objects.create(
        plan=nutrition_muscle,
        name="Comida",
        meal_type="lunch",
        order_index=1,
        calories=650,
        protein=Decimal("45.0"),
        carbs=Decimal("60.0"),
        fat=Decimal("18.0"),
    )

    templates = {
        "home": "BAJA DE PESO DESDE CASA!!!",
        "outdoor": "PROGRESIÓN DE 4 SEMANAS!",
        "male_strength": "FUERZA MARC! (Copia)",
        "female_recomp": "MUJER3DÍASGYMRECOMPOSICION",
        "pomposo_4": "¡AUMENTA TU POMPOSO II!",
    }
    exercise = Exercise.objects.create(name="Test exercise", is_system=True)
    for key, name in templates.items():
        program = WorkoutProgram.objects.create(
            name=name,
            goal="general_fitness",
            is_template=True,
            is_active=True,
            days_per_week=3,
        )
        day = WorkoutDay.objects.create(program=program, name="Día 1", day_number=1, order_index=1)
        WorkoutDayExercise.objects.create(workout_day=day, exercise=exercise, sets=3, reps="10")
        templates[key] = program

    return templates


@pytest.mark.django_db
class TestAutoProvisionTemplatePicks:
    def test_pick_nutrition_for_gain_muscle(self, catalog, user):
        user.main_goal = "gain_muscle"
        user.save(update_fields=["main_goal"])
        assert pick_nutrition_source_name(user) == "Segundo Menú Personalizado!"

    def test_pick_workout_outdoor_male_gain_muscle(self, catalog, user):
        user.main_goal = "gain_muscle"
        user.gender = "male"
        user.training_location = "outdoor"
        user.training_days_per_week = 5
        user.save()
        assert pick_workout_source_name(user) == "FUERZA MARC! (Copia)"

    def test_pick_workout_home_lose_weight(self, catalog, user):
        user.main_goal = "lose_weight"
        user.training_location = "home"
        user.training_days_per_week = 3
        user.save()
        assert pick_workout_source_name(user) == "BAJA DE PESO DESDE CASA!!!"

    def test_pick_workout_gym_female_recomposition(self, catalog, user):
        user.main_goal = "body_recomposition"
        user.gender = "female"
        user.training_location = "gym"
        user.training_days_per_week = 3
        user.save()
        assert pick_workout_source_name(user) == "MUJER3DÍASGYMRECOMPOSICION"

    def test_pick_workout_gym_lose_weight_4_days(self, catalog, user):
        user.main_goal = "lose_weight"
        user.training_location = "gym"
        user.training_days_per_week = 4
        user.save()
        assert pick_workout_source_name(user) == "¡AUMENTA TU POMPOSO II!"
