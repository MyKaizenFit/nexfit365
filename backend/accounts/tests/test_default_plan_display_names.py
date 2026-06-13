"""Tests de nombres genéricos y saneamiento."""

import pytest

from accounts.default_plan_display_names import (
    build_user_nutrition_plan_name,
    build_user_workout_plan_name,
    looks_like_personal_title,
    sanitize_source_name,
)
from nutrition.models import NutritionPlan
from workouts.models import WorkoutProgram


@pytest.mark.django_db
class TestDefaultPlanDisplayNames:
    def test_sanitize_removes_personal_suffix(self):
        assert sanitize_source_name("¡AUMENTA TU POMPOSO I! - María") == "¡AUMENTA TU POMPOSO I!"
        assert sanitize_source_name("Dieta Flexible (Copia)") == "Dieta Flexible"

    def test_personal_greeting_detected(self):
        assert looks_like_personal_title("¡A por todas Marina!")
        assert looks_like_personal_title("Vamos Miriam!!!")
        assert not looks_like_personal_title("¡AUMENTA TU POMPOSO II!")

    def test_user_nutrition_name_is_generic_for_auto_default(self, user):
        template = NutritionPlan(
            name="[AUTO-DEFECTO] Nutrición general",
            goal="lose_weight",
            tags=["auto_default"],
        )
        user.main_goal = "lose_weight"
        assert build_user_nutrition_plan_name(template, user) == "Menú semanal · Pérdida de peso"

    def test_user_nutrition_name_hides_personal_template(self, user):
        template = NutritionPlan(name="¡A por todas Paola!", goal="maintain", tags=[])
        user.main_goal = "lose_weight"
        assert build_user_nutrition_plan_name(template, user) == "Menú semanal · Pérdida de peso"

    def test_user_workout_name_is_generic(self, user):
        template = WorkoutProgram(
            name="[AUTO-DEFECTO] Entreno 3 días gimnasio",
            goal="general_fitness",
            days_per_week=3,
            tags=["auto_default"],
        )
        user.main_goal = "gain_muscle"
        user.training_location = "gym"
        user.training_days_per_week = 3
        name = build_user_workout_plan_name(template, user)
        assert "María" not in name
        assert "AUTO-DEFECTO" not in name
        assert "Programa de entrenamiento" in name
