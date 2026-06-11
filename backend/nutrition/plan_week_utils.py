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
