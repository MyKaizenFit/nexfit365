"""Tests para workouts/workout_week_utils.py"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from workouts.models import WorkoutProgram, WorkoutDay, WorkoutDayExercise, Exercise
from workouts.workout_week_utils import (
    copy_program_weeks,
    week_number_from_day_number,
    day_number_for_week_slot,
)

User = get_user_model()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email='admin-week-copy@test.com',
        password='testpass123',
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email='user-week-copy@test.com',
        password='testpass123',
    )


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def exercise(db):
    return Exercise.objects.create(
        name='Sentadilla Test',
        category='strength',
        muscle_groups=['legs'],
        difficulty='beginner',
    )


@pytest.fixture
def program_with_weeks(db, regular_user, exercise):
    program = WorkoutProgram.objects.create(
        name="Programa Multi Semana",
        user=regular_user,
        difficulty="beginner",
        goal="general_fitness",
        days_per_week=3,
        duration_weeks=4,
    )
    week1 = WorkoutDay.objects.create(
        program=program,
        name="Pierna",
        day_number=1,
        day_of_week="monday",
        order_index=1,
    )
    WorkoutDayExercise.objects.create(
        workout_day=week1,
        exercise=exercise,
        sets=3,
        reps="10",
        order_index=1,
    )
    WorkoutDay.objects.create(
        program=program,
        name="Descanso",
        day_number=2,
        day_of_week="tuesday",
        is_rest_day=True,
        order_index=2,
    )
    week1_day3 = WorkoutDay.objects.create(
        program=program,
        name="Torso",
        day_number=3,
        day_of_week="wednesday",
        order_index=3,
    )
    WorkoutDayExercise.objects.create(
        workout_day=week1_day3,
        exercise=exercise,
        sets=4,
        reps="8",
        order_index=1,
    )
    return program


@pytest.mark.django_db
class TestWorkoutWeekUtils:
    def test_week_number_from_day_number(self):
        assert week_number_from_day_number(1) == 1
        assert week_number_from_day_number(7) == 1
        assert week_number_from_day_number(8) == 2

    def test_day_number_for_week_slot(self):
        assert day_number_for_week_slot(2, 1) == 8
        assert day_number_for_week_slot(2, 3) == 10


@pytest.mark.django_db
class TestCopyProgramWeeks:
    def test_copy_week_to_single_target(self, admin_client, program_with_weeks):
        result = copy_program_weeks(program_with_weeks, source_week=1, target_weeks=[2])
        assert result["copied_days"] == 3
        assert program_with_weeks.days.filter(day_number=8, name="Pierna").exists()
        assert program_with_weeks.days.filter(day_number=10, name="Torso").exists()
        assert WorkoutDayExercise.objects.filter(workout_day__program=program_with_weeks, workout_day__day_number=8).count() == 1

    def test_copy_week_to_multiple_targets(self, program_with_weeks):
        result = copy_program_weeks(program_with_weeks, source_week=1, target_weeks=[2, 3])
        assert result["copied_days"] == 6
        assert program_with_weeks.days.filter(day_number=15, name="Pierna").exists()

    def test_copy_week_api(self, admin_client, program_with_weeks):
        response = admin_client.post(
            f'/api/admin/workouts/programs/{program_with_weeks.id}/copy-weeks/',
            {'source_week': 1, 'target_weeks': [2]},
            format='json',
        )
        assert response.status_code == 200
        assert 'copiada' in response.data['detail'].lower()
        assert response.data['copied_days'] == 3
        assert response.data['program']['days']

    def test_copy_week_rejects_empty_source(self, program_with_weeks):
        program_with_weeks.days.all().delete()
        with pytest.raises(ValueError, match="no tiene entrenamientos"):
            copy_program_weeks(program_with_weeks, source_week=1, target_weeks=[2])
