"""Tests for multi-week workout template assignment."""

import pytest

from accounts.services import copy_template_days_to_user_program
from workouts.models import Exercise, WorkoutDay, WorkoutDayExercise, WorkoutProgram


@pytest.mark.django_db
def test_copy_multi_week_template_preserves_all_weeks_with_user_training_days(user):
    exercise = Exercise.objects.create(name="Squat", is_system=True)
    template = WorkoutProgram.objects.create(
        name="8 week plan",
        is_template=True,
        is_active=True,
        duration_weeks=8,
        days_per_week=2,
    )
    user_program = WorkoutProgram.objects.create(
        user=user,
        name="User plan",
        duration_weeks=8,
        days_per_week=2,
        is_active=True,
    )

    template_days = []
    for week in (1, 2):
        for day_number, label in ((1, "Mon"), (3, "Wed")):
            global_day = (week - 1) * 7 + day_number
            day = WorkoutDay.objects.create(
                program=template,
                name=f"W{week} {label}",
                day_number=global_day,
                order_index=global_day,
            )
            WorkoutDayExercise.objects.create(
                workout_day=day,
                exercise=exercise,
                sets=3 + week,
                reps="10",
            )
            template_days.append(day)

    copied_days, copied_exercises = copy_template_days_to_user_program(
        template_days,
        user_program,
        user_training_days=[1, 5],
    )

    assert copied_days == 4
    assert copied_exercises == 4

    assigned_day_numbers = sorted(
        user_program.days.values_list("day_number", flat=True)
    )
    assert assigned_day_numbers == [1, 5, 8, 12]

    week2_monday = user_program.days.get(day_number=8)
    assert week2_monday.exercises.first().sets == 5
