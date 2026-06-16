"""Utilidades para comidas de planes nutricionales: conteo, totales y rebalanceo."""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable, Optional

from nutrition.models import NutritionPlan, PlanMeal, PlanMealRecipe


MAX_CUSTOM_MACRO = Decimal('9999.99')


def _meal_effective_macros(meal: PlanMeal) -> dict[str, float]:
    """Macros de una comida; si tiene recetas usa su promedio (opciones alternativas)."""
    meal_recipes = list(meal.meal_recipes.all())
    if meal_recipes:
        display_calories = [mr.get_display_calories() for mr in meal_recipes]
        display_protein = [mr.get_display_protein() for mr in meal_recipes]
        display_carbs = [mr.get_display_carbs() for mr in meal_recipes]
        display_fat = [mr.get_display_fat() for mr in meal_recipes]
        count = len(meal_recipes)
        return {
            'calories': sum(display_calories) / count,
            'protein': sum(display_protein) / count,
            'carbs': sum(display_carbs) / count,
            'fat': sum(display_fat) / count,
        }
    return {
        'calories': float(meal.calories or 0),
        'protein': float(meal.protein or 0),
        'carbs': float(meal.carbs or 0),
        'fat': float(meal.fat or 0),
    }


def _sum_meal_macros(meals: Iterable[PlanMeal]) -> dict[str, float]:
    totals = {'calories': 0.0, 'protein': 0.0, 'carbs': 0.0, 'fat': 0.0}
    for meal in meals:
        macros = _meal_effective_macros(meal)
        totals['calories'] += macros['calories']
        totals['protein'] += macros['protein']
        totals['carbs'] += macros['carbs']
        totals['fat'] += macros['fat']
    return totals


def resolve_meals_for_calendar_day(
    meals: Iterable[PlanMeal],
    day_of_week: int,
    week_number: int,
) -> list[PlanMeal]:
    """
    Devuelve las comidas de un día/semana sin duplicar genéricas + específicas.
    Prioridad: comidas del día concreto; si no hay, comidas genéricas (day_of_week null).
    """
    week_number = max(1, int(week_number or 1))
    week_meals = [m for m in meals if max(1, int(m.week_number or 1)) == week_number]

    specific = [m for m in week_meals if m.day_of_week == day_of_week]
    if specific:
        return sorted(specific, key=lambda m: (m.order_index or 0, str(m.pk)))

    generic = [m for m in week_meals if m.day_of_week is None]
    return sorted(generic, key=lambda m: (m.order_index or 0, str(m.pk)))


def group_meals_by_day_key(meals: Iterable[PlanMeal]) -> dict[tuple[int, Optional[int]], list[PlanMeal]]:
    groups: dict[tuple[int, Optional[int]], list[PlanMeal]] = defaultdict(list)
    for meal in meals:
        week = max(1, int(meal.week_number or 1))
        key = (week, meal.day_of_week)
        groups[key].append(meal)
    for key in groups:
        groups[key] = sorted(groups[key], key=lambda m: (m.order_index or 0, str(m.pk)))
    return dict(groups)


def compute_meals_per_day(plan: NutritionPlan) -> int:
    meals = list(plan.meals.all())
    if not meals:
        return 0

    groups = group_meals_by_day_key(meals)
    specific_counts = [len(v) for (week, day), v in groups.items() if day is not None]
    if specific_counts:
        return max(specific_counts)

    generic_counts = [len(v) for (week, day), v in groups.items() if day is None]
    return max(generic_counts) if generic_counts else 0


def compute_average_day_macros(plan: NutritionPlan) -> dict[str, float]:
    """Promedio de totales diarios (sin duplicar genéricas + específicas)."""
    meals = list(plan.meals.all())
    if not meals:
        return {}

    groups = group_meals_by_day_key(meals)
    day_totals: list[dict[str, float]] = []

    specific_keys = [(w, d) for (w, d) in groups if d is not None]
    if specific_keys:
        for week, day in specific_keys:
            day_meals = resolve_meals_for_calendar_day(meals, day, week)
            totals = _sum_meal_macros(day_meals)
            if sum(totals.values()) > 0:
                day_totals.append(totals)
    else:
        for (week, day), group in groups.items():
            if day is None and group:
                totals = _sum_meal_macros(group)
                if sum(totals.values()) > 0:
                    day_totals.append(totals)

    if not day_totals:
        return {}

    return {
        'calories': sum(t['calories'] for t in day_totals) / len(day_totals),
        'protein': sum(t['protein'] for t in day_totals) / len(day_totals),
        'carbs': sum(t['carbs'] for t in day_totals) / len(day_totals),
        'fat': sum(t['fat'] for t in day_totals) / len(day_totals),
    }


def meal_calorie_fraction(meals_for_day: list[PlanMeal], meal: PlanMeal) -> float:
    """Reparto equitativo del objetivo diario entre las comidas del día."""
    if not meals_for_day:
        return 0.25
    return 1.0 / len(meals_for_day)


def _scale_meal_recipes(meal: PlanMeal, ratio: Decimal) -> None:
    """Escala recetas de una comida; usa custom_* para evitar overflow en servings."""
    meal_recipes = list(meal.meal_recipes.select_related('recipe').all())
    for meal_recipe in meal_recipes:
        display_calories = meal_recipe.get_display_calories()
        display_protein = meal_recipe.get_display_protein()
        display_carbs = meal_recipe.get_display_carbs()
        display_fat = meal_recipe.get_display_fat()

        meal_recipe.custom_calories = max(1, int(round(display_calories * float(ratio))))
        meal_recipe.custom_protein = min(
            (Decimal(str(display_protein)) * ratio).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            MAX_CUSTOM_MACRO,
        )
        meal_recipe.custom_carbs = min(
            (Decimal(str(display_carbs)) * ratio).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            MAX_CUSTOM_MACRO,
        )
        meal_recipe.custom_fat = min(
            (Decimal(str(display_fat)) * ratio).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            MAX_CUSTOM_MACRO,
        )
        meal_recipe.servings = Decimal('1.00')
        meal_recipe.save(update_fields=[
            'custom_calories', 'custom_protein', 'custom_carbs', 'custom_fat', 'servings',
        ])

    if meal_recipes:
        display_calories = [mr.get_display_calories() for mr in meal_recipes]
        display_protein = [mr.get_display_protein() for mr in meal_recipes]
        display_carbs = [mr.get_display_carbs() for mr in meal_recipes]
        display_fat = [mr.get_display_fat() for mr in meal_recipes]
        meal.calories = int(round(sum(display_calories) / len(display_calories)))
        meal.protein = round(sum(display_protein) / len(display_protein), 1)
        meal.carbs = round(sum(display_carbs) / len(display_carbs), 1)
        meal.fat = round(sum(display_fat) / len(display_fat), 1)
        meal.save(update_fields=['calories', 'protein', 'carbs', 'fat'])


def rebalance_meal_group(
    meals: list[PlanMeal],
    target_calories: int,
    target_protein: Optional[int] = None,
    target_carbs: Optional[int] = None,
    target_fat: Optional[int] = None,
) -> None:
    """Escala comidas de un día para que sumen el objetivo diario."""
    if not meals or target_calories <= 0:
        return

    totals = _sum_meal_macros(meals)
    current_calories = totals['calories']
    if current_calories <= 0:
        per_meal = target_calories // len(meals)
        remainder = target_calories - (per_meal * len(meals))
        for index, meal in enumerate(meals):
            meal.calories = per_meal + (1 if index < remainder else 0)
            if target_protein is not None:
                per_p = target_protein // len(meals)
                meal.protein = per_p + (1 if index < (target_protein % len(meals)) else 0)
            if target_carbs is not None:
                per_c = target_carbs // len(meals)
                meal.carbs = per_c + (1 if index < (target_carbs % len(meals)) else 0)
            if target_fat is not None:
                per_f = target_fat // len(meals)
                meal.fat = per_f + (1 if index < (target_fat % len(meals)) else 0)
            meal.save(update_fields=['calories', 'protein', 'carbs', 'fat'])
        return

    calorie_ratio = Decimal(str(target_calories)) / Decimal(str(current_calories))

    for meal in meals:
        old_calories = int(round(_meal_effective_macros(meal)['calories']))
        if old_calories <= 0:
            continue
        ratio = calorie_ratio
        _scale_meal_recipes(meal, ratio)
        if not meal.meal_recipes.exists():
            meal.calories = max(0, int((Decimal(old_calories) * ratio).quantize(Decimal('1'), rounding=ROUND_HALF_UP)))
            if meal.protein is not None:
                meal.protein = float((Decimal(str(meal.protein)) * ratio).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))
            if meal.carbs is not None:
                meal.carbs = float((Decimal(str(meal.carbs)) * ratio).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))
            if meal.fat is not None:
                meal.fat = float((Decimal(str(meal.fat)) * ratio).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))
            meal.save(update_fields=['calories', 'protein', 'carbs', 'fat'])


def finalize_plan_after_meal_changes(
    plan: NutritionPlan,
    *,
    preserve_daily_calories: Optional[int] = None,
    preserve_protein: Optional[int] = None,
    preserve_carbs: Optional[int] = None,
    preserve_fat: Optional[int] = None,
) -> NutritionPlan:
    """
    Tras reemplazar comidas:
    - Actualiza meals_per_day
    - Si hay objetivo de kcal, rebalancea cada día hacia ese objetivo
    - Si no, recalcula objetivos desde la suma real de comidas
    """
    meals = list(plan.meals.all())
    groups = group_meals_by_day_key(meals)

    target_cal = int(preserve_daily_calories or 0)
    target_protein = preserve_protein
    target_carbs = preserve_carbs
    target_fat = preserve_fat

    if target_cal > 0 and groups:
        specific_keys = [(w, d) for (w, d) in groups if d is not None]
        keys_to_rebalance = specific_keys if specific_keys else [(w, d) for (w, d) in groups if d is None]

        for week, day in keys_to_rebalance:
            if day is not None:
                day_meals = resolve_meals_for_calendar_day(meals, day, week)
            else:
                day_meals = groups.get((week, None), [])
            if not day_meals:
                continue
            rebalance_meal_group(
                day_meals,
                target_cal,
                target_protein=target_protein,
                target_carbs=target_carbs,
                target_fat=target_fat,
            )

        plan.daily_calories = target_cal
        if target_protein is not None:
            plan.protein_grams = target_protein
        if target_carbs is not None:
            plan.carbs_grams = target_carbs
        if target_fat is not None:
            plan.fat_grams = target_fat
    else:
        avg = compute_average_day_macros(plan)
        if avg:
            plan.daily_calories = int(round(avg['calories']))
            plan.protein_grams = int(round(avg['protein']))
            plan.carbs_grams = int(round(avg['carbs']))
            plan.fat_grams = int(round(avg['fat']))

    plan.meals_per_day = compute_meals_per_day(plan)
    plan.save(update_fields=[
        'daily_calories', 'protein_grams', 'carbs_grams', 'fat_grams', 'meals_per_day', 'updated_at',
    ])
    return plan
