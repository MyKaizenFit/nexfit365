"""Tests para utilidades de comidas en planes nutricionales."""

from decimal import Decimal

import pytest

from nutrition.models import PlanMeal
from nutrition.plan_meal_utils import (
    finalize_plan_after_meal_changes,
    rebalance_meal_group,
    resolve_meals_for_calendar_day,
)


@pytest.mark.django_db
class TestResolveMealsForCalendarDay:
    def test_prefers_specific_over_generic(self, nutrition_plan):
        PlanMeal.objects.create(
            plan=nutrition_plan,
            day_of_week=None,
            week_number=1,
            name="Genérica",
            meal_type="breakfast",
            order_index=1,
            calories=900,
        )
        specific = PlanMeal.objects.create(
            plan=nutrition_plan,
            day_of_week=1,
            week_number=1,
            name="Lunes",
            meal_type="lunch",
            order_index=1,
            calories=500,
        )
        meals = list(nutrition_plan.meals.all())
        resolved = resolve_meals_for_calendar_day(meals, day_of_week=1, week_number=1)
        assert len(resolved) == 1
        assert resolved[0].id == specific.id

    def test_falls_back_to_generic_when_no_specific(self, nutrition_plan):
        PlanMeal.objects.create(
            plan=nutrition_plan,
            day_of_week=None,
            week_number=1,
            name="Genérica",
            meal_type="breakfast",
            order_index=1,
            calories=400,
        )
        meals = list(nutrition_plan.meals.all())
        resolved = resolve_meals_for_calendar_day(meals, day_of_week=2, week_number=1)
        assert len(resolved) == 1
        assert resolved[0].name == "Genérica"


@pytest.mark.django_db
class TestFinalizePlanAfterMealChanges:
    def test_rebalances_three_meals_to_preserve_daily_target(self, nutrition_plan):
        nutrition_plan.daily_calories = 1650
        nutrition_plan.protein_grams = 124
        nutrition_plan.carbs_grams = 165
        nutrition_plan.fat_grams = 55
        nutrition_plan.meals_per_day = 4
        nutrition_plan.save()

        for index, name in enumerate(["Desayuno", "Comida", "Cena"], start=1):
            PlanMeal.objects.create(
                plan=nutrition_plan,
                day_of_week=1,
                week_number=1,
                name=name,
                meal_type="lunch",
                order_index=index,
                calories=412,
                protein=Decimal("41.0"),
                carbs=Decimal("41.0"),
                fat=Decimal("14.0"),
            )

        finalize_plan_after_meal_changes(
            nutrition_plan,
            preserve_daily_calories=1650,
            preserve_protein=124,
            preserve_carbs=165,
            preserve_fat=55,
        )

        nutrition_plan.refresh_from_db()
        day_meals = resolve_meals_for_calendar_day(
            list(nutrition_plan.meals.all()), day_of_week=1, week_number=1
        )
        total_calories = sum(m.calories for m in day_meals)

        assert nutrition_plan.meals_per_day == 3
        assert nutrition_plan.daily_calories == 1650
        assert total_calories == 1650

    def test_recomputes_from_meals_when_no_preserve_target(self, nutrition_plan):
        PlanMeal.objects.create(
            plan=nutrition_plan,
            day_of_week=1,
            week_number=1,
            name="A",
            meal_type="breakfast",
            order_index=1,
            calories=500,
            protein=Decimal("30.0"),
            carbs=Decimal("50.0"),
            fat=Decimal("15.0"),
        )
        PlanMeal.objects.create(
            plan=nutrition_plan,
            day_of_week=1,
            week_number=1,
            name="B",
            meal_type="lunch",
            order_index=2,
            calories=700,
            protein=Decimal("40.0"),
            carbs=Decimal("70.0"),
            fat=Decimal("20.0"),
        )

        finalize_plan_after_meal_changes(nutrition_plan)

        nutrition_plan.refresh_from_db()
        assert nutrition_plan.daily_calories == 1200
        assert nutrition_plan.meals_per_day == 2


@pytest.mark.django_db
class TestRebalanceMealGroup:
    def test_scales_meals_proportionally(self, nutrition_plan):
        meals = [
            PlanMeal.objects.create(
                plan=nutrition_plan,
                day_of_week=1,
                week_number=1,
                name="A",
                meal_type="breakfast",
                order_index=1,
                calories=400,
                protein=Decimal("20.0"),
                carbs=Decimal("40.0"),
                fat=Decimal("10.0"),
            ),
            PlanMeal.objects.create(
                plan=nutrition_plan,
                day_of_week=1,
                week_number=1,
                name="B",
                meal_type="lunch",
                order_index=2,
                calories=800,
                protein=Decimal("40.0"),
                carbs=Decimal("80.0"),
                fat=Decimal("20.0"),
            ),
        ]

        rebalance_meal_group(meals, target_calories=1200)

        total = sum(m.calories for m in meals)
        assert total == 1200
