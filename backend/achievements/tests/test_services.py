"""
Tests for achievements.services — pure/isolated functions and dataclasses.
DB-dependent tests use pytest-django fixtures.
"""
from datetime import date
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model

from achievements.services import (
    DayCompletionStatus,
    normalize_training_days,
    get_streak_target,
    calculate_streak_progress,
    is_workout_required_for_date,
)
from achievements.models import Achievement

User = get_user_model()


# ---------------------------------------------------------------------------
# normalize_training_days
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestNormalizeTrainingDays:
    def test_empty_input_returns_empty_list(self):
        assert normalize_training_days([]) == []

    def test_none_input_returns_empty_list(self):
        assert normalize_training_days(None) == []

    def test_integer_days_pass_through(self):
        result = normalize_training_days([1, 3, 5])
        assert result == [1, 3, 5]

    def test_string_day_names_converted(self):
        result = normalize_training_days(["monday", "wednesday", "friday"])
        assert result == [1, 3, 5]

    def test_mixed_case_day_names(self):
        result = normalize_training_days(["Monday", "TUESDAY"])
        assert result == [1, 2]

    def test_invalid_values_are_ignored(self):
        result = normalize_training_days(["monday", "notaday", 99, "tuesday"])
        assert result == [1, 2]

    def test_duplicates_are_removed(self):
        result = normalize_training_days([1, 1, 2, 2])
        assert result == [1, 2]

    def test_all_seven_days(self):
        days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        result = normalize_training_days(days)
        assert result == [1, 2, 3, 4, 5, 6, 7]

    def test_boundary_values(self):
        assert normalize_training_days([1]) == [1]
        assert normalize_training_days([7]) == [7]

    def test_out_of_range_integers_ignored(self):
        result = normalize_training_days([0, 8, 3])
        assert result == [3]


# ---------------------------------------------------------------------------
# DayCompletionStatus
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestDayCompletionStatus:
    def _make(self, **kwargs):
        defaults = dict(
            date=date(2026, 6, 1),
            workout_required=True,
            workout_completed=True,
            nutrition_required=True,
            nutrition_completed=True,
        )
        defaults.update(kwargs)
        return DayCompletionStatus(**defaults)

    def test_complete_when_all_done(self):
        s = self._make()
        assert s.is_complete is True

    def test_not_complete_when_workout_missing(self):
        s = self._make(workout_completed=False)
        assert s.is_complete is False

    def test_not_complete_when_nutrition_missing(self):
        s = self._make(nutrition_completed=False)
        assert s.is_complete is False

    def test_complete_when_workout_not_required(self):
        # If workout not required, it doesn't block completion
        s = self._make(workout_required=False, workout_completed=False)
        assert s.is_complete is True

    def test_not_complete_when_nutrition_required_but_not_done(self):
        s = self._make(nutrition_required=True, nutrition_completed=False)
        assert s.is_complete is False

    def test_as_dict_contains_expected_keys(self):
        s = self._make()
        d = s.as_dict()
        assert set(d.keys()) == {
            "date", "is_complete", "workout_required", "workout_completed",
            "nutrition_required", "nutrition_completed"
        }

    def test_as_dict_date_is_iso_format(self):
        s = self._make(date=date(2026, 1, 15))
        d = s.as_dict()
        assert d["date"] == "2026-01-15"

    def test_is_frozen_dataclass(self):
        s = self._make()
        with pytest.raises((AttributeError, TypeError)):
            s.workout_completed = False  # type: ignore[misc]


# ---------------------------------------------------------------------------
# is_workout_required_for_date
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestIsWorkoutRequiredForDate:
    def _make_user(self, training_days):
        user = MagicMock()
        user.training_days = training_days
        return user

    def test_required_when_day_in_training_days(self):
        # Monday = isoweekday 1
        user = self._make_user([1, 3, 5])
        assert is_workout_required_for_date(user, date(2026, 6, 1)) is True  # Monday

    def test_not_required_when_day_not_in_training_days(self):
        user = self._make_user([1, 3, 5])
        assert is_workout_required_for_date(user, date(2026, 6, 2)) is False  # Tuesday

    def test_required_when_no_training_days_set(self):
        user = self._make_user([])
        assert is_workout_required_for_date(user, date(2026, 6, 1)) is True

    def test_required_when_training_days_none(self):
        user = self._make_user(None)
        assert is_workout_required_for_date(user, date(2026, 6, 1)) is True


# ---------------------------------------------------------------------------
# get_streak_target
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestGetStreakTarget:
    def _achievement(self, criteria):
        a = MagicMock(spec=Achievement)
        a.criteria = criteria
        return a

    def test_returns_days_key(self):
        assert get_streak_target(self._achievement({"days": 7})) == 7

    def test_returns_count_key(self):
        assert get_streak_target(self._achievement({"count": 30})) == 30

    def test_returns_target_key(self):
        assert get_streak_target(self._achievement({"target": 14})) == 14

    def test_returns_streak_key(self):
        assert get_streak_target(self._achievement({"streak": 100})) == 100

    def test_returns_none_when_no_valid_key(self):
        assert get_streak_target(self._achievement({})) is None

    def test_returns_none_when_criteria_none(self):
        assert get_streak_target(self._achievement(None)) is None

    def test_ignores_zero_values(self):
        assert get_streak_target(self._achievement({"days": 0})) is None

    def test_ignores_negative_values(self):
        assert get_streak_target(self._achievement({"days": -5})) is None

    def test_ignores_non_numeric_values(self):
        assert get_streak_target(self._achievement({"days": "not-a-number"})) is None

    def test_string_numeric_is_converted(self):
        assert get_streak_target(self._achievement({"days": "7"})) == 7

    def test_prefers_first_valid_key_in_order(self):
        # 'days' should be found first
        result = get_streak_target(self._achievement({"target": 30, "days": 7}))
        assert result == 7


# ---------------------------------------------------------------------------
# calculate_streak_progress
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestCalculateStreakProgress:
    def _make_user(self, daily_streak):
        user = MagicMock()
        user.daily_streak = daily_streak
        return user

    def _achievement(self, criteria):
        a = MagicMock(spec=Achievement)
        a.criteria = criteria
        return a

    def test_returns_tuple_of_three(self):
        user = self._make_user(5)
        ach = self._achievement({"days": 10})
        result = calculate_streak_progress(user, ach)
        assert len(result) == 3

    def test_current_capped_at_target(self):
        user = self._make_user(15)  # More than target
        ach = self._achievement({"days": 10})
        current, target, pct = calculate_streak_progress(user, ach)
        assert current == 10  # capped at target

    def test_percentage_capped_at_99_9(self):
        user = self._make_user(100)
        ach = self._achievement({"days": 10})
        _, _, pct = calculate_streak_progress(user, ach)
        assert pct <= 99.9

    def test_percentage_is_proportional(self):
        user = self._make_user(5)
        ach = self._achievement({"days": 10})
        current, target, pct = calculate_streak_progress(user, ach)
        assert current == 5
        assert target == 10
        assert abs(pct - 50.0) < 0.01

    def test_zero_streak(self):
        user = self._make_user(0)
        ach = self._achievement({"days": 7})
        current, target, pct = calculate_streak_progress(user, ach)
        assert current == 0
        assert pct == 0.0

    def test_none_streak_treated_as_zero(self):
        user = self._make_user(None)
        ach = self._achievement({"days": 7})
        current, _, pct = calculate_streak_progress(user, ach)
        assert current == 0
