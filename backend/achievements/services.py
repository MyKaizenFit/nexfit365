from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import Achievement, UserAchievement


@dataclass(frozen=True)
class DayCompletionStatus:
    date: date
    workout_required: bool
    workout_completed: bool
    nutrition_required: bool
    nutrition_completed: bool

    @property
    def is_complete(self) -> bool:
        workout_ok = self.workout_completed if self.workout_required else True
        nutrition_ok = self.nutrition_completed if self.nutrition_required else False
        return workout_ok and nutrition_ok

    def as_dict(self) -> dict[str, Any]:
        return {
            "date": self.date.isoformat(),
            "is_complete": self.is_complete,
            "workout_required": self.workout_required,
            "workout_completed": self.workout_completed,
            "nutrition_required": self.nutrition_required,
            "nutrition_completed": self.nutrition_completed,
        }


def normalize_training_days(raw_days: Any) -> list[int]:
    day_name_map = {
        "monday": 1,
        "tuesday": 2,
        "wednesday": 3,
        "thursday": 4,
        "friday": 5,
        "saturday": 6,
        "sunday": 7,
    }

    if not raw_days:
        return []

    normalized: list[int] = []
    for day in raw_days:
        value = day_name_map.get(str(day).strip().lower(), day)
        try:
            day_number = int(value)
        except (TypeError, ValueError):
            continue
        if 1 <= day_number <= 7 and day_number not in normalized:
            normalized.append(day_number)
    return normalized


def is_workout_required_for_date(user, target_date: date) -> bool:
    training_days = normalize_training_days(getattr(user, "training_days", None))
    if not training_days:
        return True
    return target_date.isoweekday() in training_days


def is_workout_completed_for_date(user, target_date: date) -> bool:
    from workouts.models import WorkoutLog

    return WorkoutLog.objects.filter(
        user=user,
        date=target_date,
        completed=True,
    ).exists()


def get_active_nutrition_plan(user):
    from nutrition.models import NutritionPlan, NutritionPlanAssignment

    assignment = NutritionPlanAssignment.objects.filter(
        user=user,
        is_active=True,
        plan__is_active=True,
    ).select_related("plan").order_by("-assigned_at").first()
    if assignment:
        return assignment.plan

    return NutritionPlan.objects.filter(
        user=user,
        is_active=True,
    ).order_by("-created_at").first()


def get_required_plan_meals(user, target_date: date):
    plan = get_active_nutrition_plan(user)
    if not plan:
        return []

    from nutrition.plan_week_utils import resolve_plan_week_number

    plan_week = resolve_plan_week_number(plan, target_date)
    weekday = target_date.isoweekday()
    base_qs = plan.meals.filter(Q(day_of_week=weekday) | Q(day_of_week__isnull=True))
    if base_qs.filter(week_number=plan_week).exists():
        meals = list(base_qs.filter(week_number=plan_week).order_by("order_index", "created_at"))
    else:
        meals = list(base_qs.filter(week_number=1).order_by("order_index", "created_at"))
    if meals:
        return meals

    return list(plan.meals.filter(day_of_week__isnull=True, week_number=1).order_by("order_index", "created_at"))


def is_nutrition_completed_for_date(user, target_date: date) -> tuple[bool, bool]:
    from nutrition.models import MealLog

    required_meals = get_required_plan_meals(user, target_date)
    if not required_meals:
        return False, False

    completed_logs = MealLog.objects.filter(
        user=user,
        date=target_date,
        completed=True,
        is_skipped=False,
    )

    completed_plan_meal_ids = set(
        completed_logs.exclude(plan_meal_id__isnull=True).values_list("plan_meal_id", flat=True)
    )
    completed_meal_types = set(completed_logs.values_list("meal_type", flat=True))

    for meal in required_meals:
        if meal.id in completed_plan_meal_ids:
            continue
        if meal.meal_type in completed_meal_types:
            continue
        return True, False

    return True, True


def get_day_completion_status(user, target_date: date | None = None) -> DayCompletionStatus:
    target_date = target_date or timezone.localdate()
    workout_required = is_workout_required_for_date(user, target_date)
    workout_completed = is_workout_completed_for_date(user, target_date) if workout_required else False
    nutrition_required, nutrition_completed = is_nutrition_completed_for_date(user, target_date)

    return DayCompletionStatus(
        date=target_date,
        workout_required=workout_required,
        workout_completed=workout_completed,
        nutrition_required=nutrition_required,
        nutrition_completed=nutrition_completed,
    )


def get_streak_target(achievement: Achievement) -> int | None:
    criteria = achievement.criteria or {}
    for key in ("days", "count", "target", "required_days", "streak"):
        value = criteria.get(key)
        try:
            target = int(value)
        except (TypeError, ValueError):
            continue
        if target > 0:
            return target
    return None


def unlock_streak_achievements(user, current_streak: int) -> list[UserAchievement]:
    unlocked: list[UserAchievement] = []
    achievements = Achievement.objects.filter(is_active=True, category="streak")

    for achievement in achievements:
        target = get_streak_target(achievement)
        if not target or current_streak < target:
            continue

        user_achievement, created = UserAchievement.objects.get_or_create(
            user=user,
            achievement=achievement,
            defaults={
                "progress": {
                    "current_streak": current_streak,
                    "target": target,
                    "source": "streak_validation",
                },
            },
        )
        if not created and not user_achievement.progress:
            user_achievement.progress = {
                "current_streak": current_streak,
                "target": target,
                "source": "streak_validation",
            }
            user_achievement.save(update_fields=["progress", "updated_at"])
        unlocked.append(user_achievement)

    return unlocked


@transaction.atomic
def complete_user_day(user, target_date: date | None = None, validate: bool = True) -> dict[str, Any]:
    target_date = target_date or timezone.localdate()
    today = timezone.localdate()
    if target_date > today:
        raise ValueError("No se puede completar un día futuro")

    user = user.__class__.objects.select_for_update().get(pk=user.pk)
    status = get_day_completion_status(user, target_date)
    if validate and not status.is_complete:
        return {
            "completed": False,
            "daily_streak": user.daily_streak,
            "longest_streak": user.longest_streak,
            "last_completed_day": user.last_completed_day.isoformat() if user.last_completed_day else None,
            "status": status.as_dict(),
            "message": "El día todavía no cumple las condiciones para sumarse a la racha",
            "unlocked_achievements": [],
        }

    if user.last_completed_day == target_date:
        unlocked = unlock_streak_achievements(user, user.daily_streak)
        return {
            "completed": True,
            "already_completed": True,
            "daily_streak": user.daily_streak,
            "longest_streak": user.longest_streak,
            "last_completed_day": target_date.isoformat(),
            "status": status.as_dict(),
            "message": "El día ya fue marcado como completo",
            "unlocked_achievements": [str(item.achievement_id) for item in unlocked],
        }

    if user.last_completed_day:
        days_diff = (target_date - user.last_completed_day).days
        if days_diff == 1:
            user.daily_streak = max((user.daily_streak or 0) + 1, 1)
        elif days_diff > 1:
            user.daily_streak = 1
        elif days_diff < 0:
            user.longest_streak = max(user.longest_streak or 0, user.daily_streak or 0)
            user.save(update_fields=["longest_streak"])
            unlocked = unlock_streak_achievements(user, user.daily_streak)
            return {
                "completed": True,
                "backfilled": True,
                "daily_streak": user.daily_streak,
                "longest_streak": user.longest_streak,
                "last_completed_day": user.last_completed_day.isoformat() if user.last_completed_day else None,
                "status": status.as_dict(),
                "message": "Día anterior validado sin reducir la racha actual",
                "unlocked_achievements": [str(item.achievement_id) for item in unlocked],
            }
        else:
            user.daily_streak = max(user.daily_streak or 1, 1)
    else:
        user.daily_streak = 1

    user.longest_streak = max(user.longest_streak or 0, user.daily_streak or 0)
    user.last_completed_day = target_date
    user.save(update_fields=["daily_streak", "longest_streak", "last_completed_day"])

    unlocked = unlock_streak_achievements(user, user.daily_streak)
    return {
        "completed": True,
        "already_completed": False,
        "daily_streak": user.daily_streak,
        "longest_streak": user.longest_streak,
        "last_completed_day": target_date.isoformat(),
        "status": status.as_dict(),
        "message": f"Día completo registrado. Racha actual: {user.daily_streak} días",
        "unlocked_achievements": [str(item.achievement_id) for item in unlocked],
    }


def calculate_streak_progress(user, achievement: Achievement) -> tuple[int, int, float]:
    target = get_streak_target(achievement) or 1
    current = min(user.daily_streak or 0, target)
    percentage = min((current / target) * 100, 99.9)
    return current, target, percentage
