"""Utilidades para semanas independientes en planes nutricionales."""

from __future__ import annotations

from datetime import date


def plan_duration_weeks(plan) -> int:
    value = getattr(plan, "duration_weeks", None)
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = 1
    return max(1, parsed)


def resolve_plan_week_number(plan, target_date: date) -> int:
    """
    Semana del ciclo del plan para una fecha concreta.
    Con start_date: cicla 1..duration_weeks desde el inicio del plan.
    Sin start_date: semana 1 (menú base que se repite).
    """
    duration = plan_duration_weeks(plan)
    start = getattr(plan, "start_date", None)
    if not start:
        return 1
    days = (target_date - start).days
    if days < 0:
        return 1
    return (days // 7) % duration + 1


def normalize_week_list(raw_weeks) -> list[int]:
    weeks: list[int] = []
    for value in raw_weeks or []:
        try:
            week = int(value)
        except (TypeError, ValueError):
            continue
        if week >= 1:
            weeks.append(week)
    return sorted(set(weeks))


def expand_meals_payload_sync_weeks(
    meals_payload: list[dict],
    *,
    source_week: int,
    duration_weeks: int,
) -> list[dict]:
    """
    Copia las comidas de source_week a las demás semanas del ciclo.
    Reemplaza por completo cada semana destino (modo replace).
    """
    source_week = max(1, int(source_week or 1))
    duration = max(1, int(duration_weeks or 1))
    if not isinstance(meals_payload, list):
        return meals_payload

    source_meals = [
        meal for meal in meals_payload
        if isinstance(meal, dict) and max(1, int(meal.get('week_number') or 1)) == source_week
    ]
    if not source_meals:
        return meals_payload

    target_weeks = [week for week in range(1, duration + 1) if week != source_week]
    if not target_weeks:
        return meals_payload

    retained = [
        meal for meal in meals_payload
        if isinstance(meal, dict) and max(1, int(meal.get('week_number') or 1)) not in target_weeks
    ]

    expanded = list(retained)
    for target_week in target_weeks:
        for meal in sorted(
            source_meals,
            key=lambda item: (
                item.get('day_of_week') or 0,
                item.get('order_index') or 0,
            ),
        ):
            cloned = dict(meal)
            cloned['week_number'] = target_week
            cloned.pop('id', None)
            meal_recipes = cloned.get('meal_recipes')
            if isinstance(meal_recipes, list):
                cloned['meal_recipes'] = [dict(option) for option in meal_recipes]
            expanded.append(cloned)

    return expanded


def week_number_from_month_calendar_date(target_date: date, duration_weeks: int = 4) -> int:
    """
    Semana dentro del mes mostrado en el calendario admin (1-based).
    Permite editar semana 1/2/3/4 del mes sin mezclar todos los lunes.
    """
    duration = max(1, int(duration_weeks or 1))
    first_of_month = target_date.replace(day=1)
    leading = first_of_month.weekday()  # 0=lunes
    week_index = (target_date.day - 1 + leading) // 7 + 1
    return ((week_index - 1) % duration) + 1
