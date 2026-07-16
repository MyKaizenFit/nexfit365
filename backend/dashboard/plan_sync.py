"""
Sincroniza objetivos del usuario desde los planes activos asignados por el admin.
El plan del administrador tiene preferencia sobre el perfil / UserStats cacheados.
"""

from __future__ import annotations

from typing import Iterable

from django.contrib.auth import get_user_model

User = get_user_model()

DAY_NAME_TO_NUMBER = {
    "monday": 1,
    "tuesday": 2,
    "wednesday": 3,
    "thursday": 4,
    "friday": 5,
    "saturday": 6,
    "sunday": 7,
}


def get_active_nutrition_plan(user):
    from nutrition.views import get_active_plan_for_user

    return get_active_plan_for_user(user)


def get_active_workout_program(user):
    from workouts.models import WorkoutProgram

    return (
        WorkoutProgram.objects.filter(user=user, is_active=True)
        .prefetch_related("days")
        .order_by("-updated_at", "-created_at")
        .first()
    )


def infer_training_day_numbers(program) -> list[int]:
    """Días de la semana (1=Lunes..7=Domingo) con sesión según el plan del admin."""
    if not program:
        return []

    from workouts.workout_week_utils import slot_in_week_from_day_number

    numbers: list[int] = []
    for day in program.days.filter(is_rest_day=False).order_by("day_number", "order_index"):
        day_number = int(day.day_number or 0)
        if day_number >= 1:
            numbers.append(slot_in_week_from_day_number(day_number))
            continue
        if day.day_of_week:
            weekday = DAY_NAME_TO_NUMBER.get(str(day.day_of_week).lower())
            if weekday:
                numbers.append(weekday)

    return sorted(set(numbers))


def derive_plan_targets(user) -> dict:
    """Objetivos efectivos leyendo planes activos (fuente de verdad del admin)."""
    from workouts.services import DefaultWorkoutAssignmentService

    targets: dict = {
        "calories_goal": None,
        "workouts_goal": None,
        "training_days": [],
        "nutrition_goal": None,
    }

    nutrition_plan = get_active_nutrition_plan(user)
    if nutrition_plan and nutrition_plan.daily_calories:
        targets["calories_goal"] = int(nutrition_plan.daily_calories)
        if nutrition_plan.goal:
            targets["nutrition_goal"] = nutrition_plan.goal

    workout_program = get_active_workout_program(user)
    if workout_program:
        weekly = DefaultWorkoutAssignmentService.infer_weekly_training_days(workout_program)
        targets["workouts_goal"] = weekly
        targets["training_days"] = infer_training_day_numbers(workout_program)

    return targets


def sync_user_from_active_plans(user, *, persist_user: bool = True, persist_stats: bool = True) -> dict:
    """
    Aplica en BD los objetivos del plan activo (UserStats + training_days del perfil).
    """
    from dashboard.models import UserStats
    from workouts.services import DefaultWorkoutAssignmentService

    targets = derive_plan_targets(user)
    user_updates: list[str] = []

    workout_program = get_active_workout_program(user)
    if workout_program:
        weekly = targets.get("workouts_goal")
        day_numbers = targets.get("training_days") or []

        if weekly and getattr(user, "training_days_per_week", None) != weekly:
            user.training_days_per_week = weekly
            user_updates.append("training_days_per_week")

        if day_numbers and list(user.training_days or []) != day_numbers:
            user.training_days = day_numbers
            user_updates.append("training_days")

        if weekly and workout_program.days_per_week != weekly:
            workout_program.days_per_week = weekly
            workout_program.save(update_fields=["days_per_week", "updated_at"])

    if persist_user and user_updates:
        user.save(update_fields=[*user_updates, "updated_at"])

    stats_fields: dict = {}
    if targets.get("calories_goal"):
        stats_fields["calories_goal"] = targets["calories_goal"]
    if targets.get("workouts_goal"):
        stats_fields["workouts_goal"] = targets["workouts_goal"]

    if persist_stats and stats_fields:
        stats, _ = UserStats.objects.get_or_create(
            user=user,
            defaults={
                "calories_goal": stats_fields.get("calories_goal", 2000),
                "workouts_goal": stats_fields.get("workouts_goal", 5),
            },
        )
        changed = []
        for field, value in stats_fields.items():
            if getattr(stats, field) != value:
                setattr(stats, field, value)
                changed.append(field)
        if changed:
            stats.save(update_fields=changed)

    return targets


def sync_users_from_nutrition_plan(plan) -> None:
    users: list = []
    if plan.user_id:
        users.append(plan.user)
    for assignment in plan.assignments.filter(is_active=True).select_related("user"):
        users.append(assignment.user)
    _sync_unique_users(users)


def sync_users_from_workout_program(program) -> None:
    users: list = []
    if program.user_id:
        users.append(program.user)
    _sync_unique_users(users)


def _sync_unique_users(users: Iterable) -> None:
    seen = set()
    for user in users:
        if not user or user.pk in seen:
            continue
        seen.add(user.pk)
        sync_user_from_active_plans(user)
