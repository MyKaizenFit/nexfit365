"""Utilidades para semanas en programas de entrenamiento."""

from __future__ import annotations

from typing import Iterable

DAY_OF_WEEK_BY_SLOT = {
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
    7: "sunday",
}


def week_number_from_day_number(day_number: int) -> int:
    return max(1, ((int(day_number) - 1) // 7) + 1)


def slot_in_week_from_day_number(day_number: int) -> int:
    return ((int(day_number) - 1) % 7) + 1


def day_number_for_week_slot(week_number: int, slot_in_week: int) -> int:
    return (max(1, int(week_number)) - 1) * 7 + max(1, min(7, int(slot_in_week)))


def day_of_week_for_day_number(day_number: int, explicit: str | None = None) -> str:
    if explicit:
        return explicit
    slot = slot_in_week_from_day_number(day_number)
    return DAY_OF_WEEK_BY_SLOT.get(slot, "monday")


def day_numbers_for_week(week_number: int) -> range:
    start = day_number_for_week_slot(week_number, 1)
    end = day_number_for_week_slot(week_number, 7)
    return range(start, end + 1)


def normalize_week_list(raw_weeks: Iterable) -> list[int]:
    weeks: list[int] = []
    for value in raw_weeks or []:
        try:
            week = int(value)
        except (TypeError, ValueError):
            continue
        if week >= 1:
            weeks.append(week)
    return sorted(set(weeks))


def copy_program_weeks(program, *, source_week: int, target_weeks: Iterable[int]) -> dict:
    """
    Copia los días (y ejercicios) de source_week a cada semana destino del mismo programa.
    Reemplaza los días existentes en las semanas destino.
    """
    from django.db import transaction

    from .models import WorkoutDay, WorkoutDayExercise

    source_week = int(source_week)
    if source_week < 1:
        raise ValueError("source_week debe ser >= 1")

    normalized_targets = [
        week for week in normalize_week_list(target_weeks)
        if week != source_week
    ]
    if not normalized_targets:
        raise ValueError("target_weeks debe incluir al menos una semana distinta de la origen")

    source_days = list(
        program.days.filter(day_number__in=day_numbers_for_week(source_week))
        .prefetch_related("exercises__exercise")
        .order_by("day_number", "order_index")
    )
    if not source_days:
        raise ValueError(f"La semana {source_week} no tiene entrenamientos para copiar")

    copied_day_count = 0

    with transaction.atomic():
        for target_week in normalized_targets:
            program.days.filter(day_number__in=day_numbers_for_week(target_week)).delete()

            for source_day in source_days:
                slot = slot_in_week_from_day_number(source_day.day_number)
                new_day_number = day_number_for_week_slot(target_week, slot)
                workout_day = WorkoutDay.objects.create(
                    program=program,
                    name=source_day.name,
                    day_number=new_day_number,
                    day_of_week=source_day.day_of_week or day_of_week_for_day_number(new_day_number),
                    is_rest_day=source_day.is_rest_day,
                    duration_minutes=source_day.duration_minutes,
                    focus=source_day.focus,
                    notes=source_day.notes or "",
                    order_index=new_day_number,
                )
                copied_day_count += 1

                for index, source_exercise in enumerate(
                    source_day.exercises.all().order_by("order_index"),
                    start=1,
                ):
                    WorkoutDayExercise.objects.create(
                        workout_day=workout_day,
                        exercise=source_exercise.exercise,
                        sets=source_exercise.sets,
                        reps=source_exercise.reps,
                        weight=source_exercise.weight or "",
                        rest_seconds=source_exercise.rest_seconds,
                        duration_seconds=source_exercise.duration_seconds,
                        notes=source_exercise.notes or "",
                        order_index=index,
                    )

        max_week = max(
            source_week,
            max(normalized_targets),
            max(
                (week_number_from_day_number(day.day_number) for day in program.days.all()),
                default=1,
            ),
        )
        if (program.duration_weeks or 1) < max_week:
            program.duration_weeks = max_week
            program.save(update_fields=["duration_weeks", "updated_at"])

    return {
        "source_week": source_week,
        "target_weeks": normalized_targets,
        "copied_days": copied_day_count,
    }
