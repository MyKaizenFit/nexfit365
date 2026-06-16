"""
Tests for workouts.services — pure functions and PersonalizedWorkoutService logic.
DB tests use pytest-django.
"""
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model

from workouts.services import (
    source_template_tag,
    extract_source_template_id,
    build_assigned_program_tags,
    SOURCE_TEMPLATE_TAG_PREFIX,
    PersonalizedWorkoutService,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# source_template_tag / extract_source_template_id
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestSourceTemplateFunctions:
    def test_source_template_tag_format(self):
        result = source_template_tag("abc-123")
        assert result == f"{SOURCE_TEMPLATE_TAG_PREFIX}abc-123"

    def test_source_template_tag_with_uuid(self):
        uid = "550e8400-e29b-41d4-a716-446655440000"
        tag = source_template_tag(uid)
        assert tag.endswith(uid)
        assert tag.startswith(SOURCE_TEMPLATE_TAG_PREFIX)

    def test_extract_finds_tag(self):
        tags = ["tag1", f"{SOURCE_TEMPLATE_TAG_PREFIX}myid", "tag2"]
        result = extract_source_template_id(tags)
        assert result == "myid"

    def test_extract_returns_none_when_no_tag(self):
        tags = ["tag1", "tag2"]
        result = extract_source_template_id(tags)
        assert result is None

    def test_extract_returns_none_for_empty_list(self):
        assert extract_source_template_id([]) is None

    def test_extract_returns_none_for_none(self):
        assert extract_source_template_id(None) is None

    def test_extract_ignores_prefix_without_id(self):
        tags = [SOURCE_TEMPLATE_TAG_PREFIX]  # prefix but no id after
        result = extract_source_template_id(tags)
        assert result is None

    def test_round_trip(self):
        original_id = "test-program-99"
        tags = build_assigned_program_tags(MagicMock(id=original_id))
        extracted = extract_source_template_id(tags)
        assert extracted == str(original_id)

    def test_build_assigned_program_tags_returns_list(self):
        mock_program = MagicMock(id="prog-1")
        result = build_assigned_program_tags(mock_program)
        assert isinstance(result, list)
        assert len(result) == 1


# ---------------------------------------------------------------------------
# PersonalizedWorkoutService — pure logic methods (no DB)
# ---------------------------------------------------------------------------

@pytest.fixture
def basic_user():
    user = MagicMock()
    user.training_days_per_week = 3
    user.activity_level = "moderate"
    user.main_goal = "lose_weight"
    user.training_location = "gym"
    user.injuries_or_medical_issues = None
    return user


@pytest.mark.unit
class TestDetermineWorkoutLevel:
    def test_no_training_days_is_beginner(self, basic_user):
        basic_user.training_days_per_week = None
        svc = PersonalizedWorkoutService(basic_user)
        assert svc.determine_workout_level() == "beginner"

    def test_two_days_is_beginner(self, basic_user):
        basic_user.training_days_per_week = 2
        svc = PersonalizedWorkoutService(basic_user)
        assert svc.determine_workout_level() == "beginner"

    def test_three_days_is_intermediate(self, basic_user):
        basic_user.training_days_per_week = 3
        svc = PersonalizedWorkoutService(basic_user)
        assert svc.determine_workout_level() == "intermediate"

    def test_four_days_is_intermediate(self, basic_user):
        basic_user.training_days_per_week = 4
        svc = PersonalizedWorkoutService(basic_user)
        assert svc.determine_workout_level() == "intermediate"

    def test_five_days_is_advanced(self, basic_user):
        basic_user.training_days_per_week = 5
        svc = PersonalizedWorkoutService(basic_user)
        assert svc.determine_workout_level() == "advanced"

    def test_seven_days_is_advanced(self, basic_user):
        basic_user.training_days_per_week = 7
        svc = PersonalizedWorkoutService(basic_user)
        assert svc.determine_workout_level() == "advanced"


@pytest.mark.unit
class TestDetermineWorkoutGoal:
    def test_lose_weight_mapped(self, basic_user):
        basic_user.main_goal = "lose_weight"
        svc = PersonalizedWorkoutService(basic_user)
        assert svc.determine_workout_goal() == "weight_loss"

    def test_gain_muscle_mapped(self, basic_user):
        basic_user.main_goal = "gain_muscle"
        svc = PersonalizedWorkoutService(basic_user)
        assert svc.determine_workout_goal() == "muscle_gain"

    def test_body_recomposition_mapped(self, basic_user):
        basic_user.main_goal = "body_recomposition"
        svc = PersonalizedWorkoutService(basic_user)
        assert svc.determine_workout_goal() == "strength_building"

    def test_unknown_goal_defaults_to_general_fitness(self, basic_user):
        basic_user.main_goal = "unknown_goal"
        svc = PersonalizedWorkoutService(basic_user)
        assert svc.determine_workout_goal() == "general_fitness"

    def test_no_goal_defaults_to_general_fitness(self, basic_user):
        basic_user.main_goal = None
        svc = PersonalizedWorkoutService(basic_user)
        assert svc.determine_workout_goal() == "general_fitness"


@pytest.mark.unit
class TestGetWorkoutDuration:
    def test_no_days_returns_30(self, basic_user):
        basic_user.training_days_per_week = None
        svc = PersonalizedWorkoutService(basic_user)
        assert svc.get_workout_duration() == 30

    def test_sedentary_has_shorter_base(self, basic_user):
        basic_user.activity_level = "sedentary"
        basic_user.training_days_per_week = 3
        svc = PersonalizedWorkoutService(basic_user)
        duration = svc.get_workout_duration()
        assert duration < 50  # sedentary base is 25

    def test_very_active_has_longer_base(self, basic_user):
        basic_user.activity_level = "very_active"
        basic_user.training_days_per_week = 3
        svc = PersonalizedWorkoutService(basic_user)
        duration = svc.get_workout_duration()
        # very_active base 45 + 10 for 3-4 days = 55
        assert duration >= 45

    def test_more_days_increases_duration(self, basic_user):
        basic_user.activity_level = "moderate"
        basic_user.training_days_per_week = 1
        svc1 = PersonalizedWorkoutService(basic_user)
        d1 = svc1.get_workout_duration()

        basic_user.training_days_per_week = 5
        svc2 = PersonalizedWorkoutService(basic_user)
        d2 = svc2.get_workout_duration()

        assert d2 > d1


@pytest.mark.unit
class TestGetMusclGroupCategory:
    def _svc(self):
        user = MagicMock()
        return PersonalizedWorkoutService(user)

    def test_empty_groups_is_full_body(self):
        svc = self._svc()
        assert svc._get_muscle_group_category([]) == "full_body"

    def test_chest_is_push(self):
        svc = self._svc()
        assert svc._get_muscle_group_category(["pecho", "tríceps"]) == "push"

    def test_back_is_pull(self):
        svc = self._svc()
        assert svc._get_muscle_group_category(["espalda", "bíceps"]) == "pull"

    def test_legs_is_legs(self):
        svc = self._svc()
        assert svc._get_muscle_group_category(["piernas", "glúteos"]) == "legs"

    def test_mixed_push_pull_is_upper_body(self):
        svc = self._svc()
        assert svc._get_muscle_group_category(["pecho", "espalda"]) == "upper_body"

    def test_legs_with_upper_is_full_body(self):
        svc = self._svc()
        assert svc._get_muscle_group_category(["piernas", "pecho"]) == "full_body"
