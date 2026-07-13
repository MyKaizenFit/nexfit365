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
    """Deriva el día de la semana desde day_number; ignora valores legacy inconsistentes."""
    slot = slot_in_week_from_day_number(day_number)
    return DAY_OF_WEEK_BY_SLOT.get(slot, "monday")


def day_numbers_for_week(week_number: int) -> range:
    start = day_number_for_week_slot(week_number, 1)
    end = day_number_for_week_slot(week_number, 7)
    return range(start, end + 1)


def get_scheduled_week_numbers(program) -> list[int]:
    weeks: set[int] = set()
    for day in program.days.all():
        day_number = getattr(day, "day_number", None)
        if day_number:
            weeks.add(week_number_from_day_number(day_number))
    return sorted(weeks)


def is_multi_week_program(program) -> bool:
    return any((getattr(day, "day_number", 0) or 0) > 7 for day in program.days.all())


def fill_missing_program_weeks(
    program,
    *,
    through_week: int | None = None,
    source_week: int | None = None,
) -> dict:
    """
    Copia la semana origen a cada semana faltante entre la última configurada y through_week.
    """
    scheduled_weeks = get_scheduled_week_numbers(program)
    if not scheduled_weeks:
        raise ValueError("El programa no tiene semanas configuradas")

    duration = max(int(program.duration_weeks or 1), scheduled_weeks[-1])
    target_through = min(int(through_week or duration), duration)
    last_scheduled = scheduled_weeks[-1]
    source = int(source_week or last_scheduled)

    missing_weeks = [
        week
        for week in range(last_scheduled + 1, target_through + 1)
        if week not in scheduled_weeks
    ]
    if not missing_weeks:
        return {
            "source_week": source,
            "target_weeks": [],
            "copied_days": 0,
            "missing_weeks": [],
        }

    if source not in scheduled_weeks:
        raise ValueError(f"La semana origen {source} no existe en el programa")

    result = copy_program_weeks(program, source_week=source, target_weeks=missing_weeks)
    result["missing_weeks"] = missing_weeks
    return result


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
                    day_of_week=day_of_week_for_day_number(new_day_number),
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
