"""Prefetch y filtros de semana para programas de entrenamiento."""

from __future__ import annotations

from django.db.models import Prefetch

from .models import ExerciseSubstitution, WorkoutDay, WorkoutDayExercise
from .workout_week_utils import day_numbers_for_week


def substitutions_prefetch(prefix: str = "") -> Prefetch:
    """Prefetch ordenado de sustitutos (evita N+1 por order_by en get_substitutes)."""
    path = f"{prefix}substitutions" if prefix else "substitutions"
    return Prefetch(
        path,
        queryset=ExerciseSubstitution.objects.select_related("substitute").order_by(
            "priority", "created_at"
        ),
    )


def program_days_prefetch(*, week: int | None = None) -> Prefetch:
    """Prefetch de días (+ejercicios +substitutes), opcionalmente limitado a una semana."""
    days_qs = WorkoutDay.objects.all().order_by("order_index", "day_number")
    if week is not None:
        days_qs = days_qs.filter(day_number__in=list(day_numbers_for_week(week)))

    exercises_qs = WorkoutDayExercise.objects.select_related("exercise").prefetch_related(
        substitutions_prefetch("exercise__"),
    ).order_by("order_index")

    return Prefetch(
        "days",
        queryset=days_qs.prefetch_related(
            Prefetch("exercises", queryset=exercises_qs),
        ),
    )


def parse_week_param(raw) -> int | None:
    if raw in (None, "", "null", "undefined"):
        return None
    try:
        week = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError("week debe ser un entero >= 1") from exc
    if week < 1:
        raise ValueError("week debe ser un entero >= 1")
    return week


def resolve_program_current_week(program, *, reference_date=None) -> int:
    """Semana del programa relativa a start_date (1-indexed), acotada a duration_weeks."""
    from datetime import timedelta

    from django.utils import timezone

    today = reference_date or timezone.localdate()
    duration = max(1, int(program.duration_weeks or 1))
    start = program.start_date
    if not start:
        return 1

    start_monday = start - timedelta(days=start.weekday())
    today_monday = today - timedelta(days=today.weekday())
    weeks_elapsed = (today_monday - start_monday).days // 7
    if weeks_elapsed < 0:
        return 1
    week = weeks_elapsed + 1
    if week > duration:
        return duration
    return week
