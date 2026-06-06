from dataclasses import dataclass
from datetime import date, timedelta

from django.utils import timezone


@dataclass(frozen=True)
class ActivityStreak:
    current: int
    longest: int
    total_active_days: int
    last_activity_date: date | None


def compute_activity_streak_from_dates(
    activity_dates,
    reference_date: date | None = None,
) -> ActivityStreak:
    reference_date = reference_date or timezone.localdate()
    unique_dates = sorted({item for item in activity_dates if item and item <= reference_date})

    if not unique_dates:
        return ActivityStreak(
            current=0,
            longest=0,
            total_active_days=0,
            last_activity_date=None,
        )

    longest = 0
    run = 0
    previous = None
    for activity_date in unique_dates:
        if previous and (activity_date - previous).days == 1:
            run += 1
        else:
            run = 1
        longest = max(longest, run)
        previous = activity_date

    last_activity_date = unique_dates[-1]
    if (reference_date - last_activity_date).days > 1:
        current = 0
    else:
        current = 1
        expected = last_activity_date - timedelta(days=1)
        active_set = set(unique_dates)
        while expected in active_set:
            current += 1
            expected -= timedelta(days=1)

    return ActivityStreak(
        current=current,
        longest=longest,
        total_active_days=len(unique_dates),
        last_activity_date=last_activity_date,
    )


def get_user_activity_dates(user, reference_date: date | None = None) -> set[date]:
    reference_date = reference_date or timezone.localdate()

    from nutrition.models import MealLog
    from progress.models import WeightEntry
    from workouts.models import WorkoutLog

    activity_dates: set[date] = set()

    activity_dates.update(
        WorkoutLog.objects.filter(
            user=user,
            completed=True,
            date__lte=reference_date,
        ).values_list("date", flat=True)
    )
    activity_dates.update(
        MealLog.objects.filter(
            user=user,
            completed=True,
            date__lte=reference_date,
        ).values_list("date", flat=True)
    )
    activity_dates.update(
        WeightEntry.objects.filter(
            user=user,
            date__lte=reference_date,
        ).values_list("date", flat=True)
    )

    return activity_dates


def get_user_activity_streak(user, reference_date: date | None = None) -> ActivityStreak:
    reference_date = reference_date or timezone.localdate()
    return compute_activity_streak_from_dates(
        get_user_activity_dates(user, reference_date=reference_date),
        reference_date=reference_date,
    )
