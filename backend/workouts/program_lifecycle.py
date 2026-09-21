"""Estado del ciclo de un programa de entrenamiento (semana actual, fin de bloque)."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Literal

from django.utils import timezone

from .workout_week_utils import week_number_from_day_number

ProgramLifecycleStatus = Literal["not_started", "active", "completed"]


def _monday_of(value: date) -> date:
    return value - timedelta(days=value.weekday())


def _business_date(reference: date | None = None) -> date:
    """Calendario de negocio: Europe/Madrid, no la fecha UTC del sistema."""
    return reference if reference is not None else timezone.localdate()


def expected_program_end_date(program, *, start_date=None, duration_weeks=None) -> date | None:
    """end_date derivado: start_date + duration efectiva en semanas.

    En planes de usuario activos end_date no es una fecha libre: se recalcula
    desde start_date y program_duration_weeks_from_plan(). Un formulario admin
    legado ofrece end_date opcional, pero el API user-workout-plans no existe
    y las asignaciones reales siempre derivan esta fecha.
    """
    start = start_date if start_date is not None else getattr(program, "start_date", None)
    if not start:
        return None
    duration = (
        duration_weeks
        if duration_weeks is not None
        else program_duration_weeks_from_plan(program)
    )
    if duration <= 0:
        return None
    return start + timedelta(weeks=duration)


def program_duration_weeks_from_plan(program) -> int:
    """Duración efectiva: el máximo entre duration_weeks y semanas inferidas de day_number."""
    explicit = program.duration_weeks or 0
    days = list(program.days.all()) if hasattr(program, "days") else []
    if not days:
        return max(explicit, 1) if explicit > 0 else 1

    max_day = max((day.day_number or 1) for day in days)
    from_days = week_number_from_day_number(max_day)
    if explicit > 0:
        return max(explicit, from_days)
    return from_days


def is_multi_week_plan(program) -> bool:
    if (program.duration_weeks or 0) > 1:
        return True
    days = list(program.days.all()) if hasattr(program, "days") else []
    return any((day.day_number or 0) > 7 for day in days)


def program_week_for_date(program, reference: date | None = None) -> int:
    reference = _business_date(reference)
    if not is_multi_week_plan(program):
        return 1
    if not program.start_date:
        return 1

    start_monday = _monday_of(program.start_date)
    ref_monday = _monday_of(reference)
    weeks_elapsed = (ref_monday - start_monday).days // 7
    if weeks_elapsed < 0:
        return 0

    program_week = weeks_elapsed + 1
    duration = program_duration_weeks_from_plan(program)
    if program_week > duration:
        return duration + 1
    return program_week


def get_program_lifecycle_status(program, reference: date | None = None) -> ProgramLifecycleStatus:
    reference = _business_date(reference)
    days = list(program.days.all()) if hasattr(program, "days") else []
    if not days:
        return "not_started"

    expected_end = expected_program_end_date(program)
    effective_end = program.end_date
    if expected_end and (effective_end is None or effective_end < expected_end):
        effective_end = expected_end
    if effective_end and reference > effective_end:
        return "completed"

    if not is_multi_week_plan(program):
        return "active"

    program_week = program_week_for_date(program, reference)
    duration = program_duration_weeks_from_plan(program)

    if program_week <= 0:
        return "not_started"
    if program_week > duration:
        return "completed"
    return "active"


def is_program_completed(program, reference: date | None = None) -> bool:
    return get_program_lifecycle_status(program, reference) == "completed"
