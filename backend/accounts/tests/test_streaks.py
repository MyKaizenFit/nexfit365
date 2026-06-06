from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model

from accounts.streaks import compute_activity_streak_from_dates, get_user_activity_streak
from nutrition.models import MealLog
from progress.models import WeightEntry
from workouts.models import WorkoutLog


User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="streaks@example.com",
        password="testpass123",
    )


def test_compute_activity_streak_keeps_current_when_last_activity_was_yesterday():
    today = date(2026, 6, 6)
    stats = compute_activity_streak_from_dates(
        [today - timedelta(days=2), today - timedelta(days=1)],
        reference_date=today,
    )

    assert stats.current == 2
    assert stats.longest == 2
    assert stats.total_active_days == 2
    assert stats.last_activity_date == today - timedelta(days=1)


def test_compute_activity_streak_resets_current_after_gap():
    today = date(2026, 6, 6)
    stats = compute_activity_streak_from_dates(
        [today - timedelta(days=5), today - timedelta(days=4), today - timedelta(days=2)],
        reference_date=today,
    )

    assert stats.current == 0
    assert stats.longest == 2
    assert stats.total_active_days == 3


@pytest.mark.django_db
def test_user_activity_streak_uses_completed_activity_across_modules(user):
    today = date(2026, 6, 6)

    WorkoutLog.objects.create(user=user, date=today - timedelta(days=2), completed=True)
    MealLog.objects.create(user=user, date=today - timedelta(days=1), meal_type="lunch", completed=True)
    WeightEntry.objects.create(user=user, date=today, weight=Decimal("80.00"))
    WorkoutLog.objects.create(user=user, date=today - timedelta(days=5), completed=False)

    stats = get_user_activity_streak(user, reference_date=today)

    assert stats.current == 3
    assert stats.longest == 3
    assert stats.total_active_days == 3
    assert stats.last_activity_date == today
