"""Sincronización de semanas en planes nutricionales (BD)."""

from __future__ import annotations

from nutrition.models import NutritionPlan, PlanMeal, PlanMealRecipe
from nutrition.plan_week_utils import plan_duration_weeks


def plan_has_inconsistent_week_structure(plan: NutritionPlan) -> bool:
    meals = list(plan.meals.all())
    duration = plan_duration_weeks(plan)
    if duration <= 1 or not meals:
        return False

    for day in range(1, 8):
        counts: set[int] = set()
        for week in range(1, duration + 1):
            count = sum(
                1
                for meal in meals
                if max(1, int(meal.week_number or 1)) == week and meal.day_of_week == day
            )
            if count > 0:
                counts.add(count)
        if len(counts) > 1:
            return True
    return False


def sync_plan_meals_from_week(plan: NutritionPlan, *, source_week: int = 1) -> dict:
    """
    Copia comidas de source_week a las demás semanas del plan (modo replace).
    Devuelve resumen de la operación.
    """
    source_week = max(1, int(source_week or 1))
    duration = plan_duration_weeks(plan)
    target_weeks = [week for week in range(1, duration + 1) if week != source_week]

    source_meals = list(
        plan.meals.filter(week_number=source_week)
        .prefetch_related('meal_recipes', 'suggested_recipes')
        .order_by('day_of_week', 'order_index', 'created_at')
    )
    if not source_meals:
        return {
            'plan_id': str(plan.id),
            'plan_name': plan.name,
            'source_week': source_week,
            'target_weeks': target_weeks,
            'skipped': True,
            'reason': f'Semana origen {source_week} sin comidas',
            'deleted_meals': 0,
            'created_meals': 0,
        }

    deleted_meals = 0
    created_meals = 0

    for target_week in target_weeks:
        deleted, _ = plan.meals.filter(week_number=target_week).delete()
        deleted_meals += deleted

        for src in source_meals:
            new_meal = PlanMeal.objects.create(
                plan=plan,
                day_of_week=src.day_of_week,
                week_number=target_week,
                name=src.name,
                meal_type=src.meal_type,
                time=src.time,
                calories=src.calories,
                protein=src.protein,
                carbs=src.carbs,
                fat=src.fat,
                description=src.description,
                order_index=src.order_index,
            )
            new_meal.suggested_recipes.set(src.suggested_recipes.all())
            for meal_recipe in src.meal_recipes.all().order_by('display_order', 'created_at'):
                PlanMealRecipe.objects.create(
                    meal=new_meal,
                    recipe=meal_recipe.recipe,
                    servings=meal_recipe.servings,
                    custom_calories=meal_recipe.custom_calories,
                    custom_protein=meal_recipe.custom_protein,
                    custom_carbs=meal_recipe.custom_carbs,
                    custom_fat=meal_recipe.custom_fat,
                    display_order=meal_recipe.display_order,
                )
            created_meals += 1

    return {
        'plan_id': str(plan.id),
        'plan_name': plan.name,
        'source_week': source_week,
        'target_weeks': target_weeks,
        'skipped': False,
        'deleted_meals': deleted_meals,
        'created_meals': created_meals,
    }
