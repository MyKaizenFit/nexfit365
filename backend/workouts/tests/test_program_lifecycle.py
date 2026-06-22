from datetime import date

import pytest
from django.contrib.auth import get_user_model

from workouts.models import WorkoutDay, WorkoutProgram
from workouts.program_lifecycle import (
    get_program_lifecycle_status,
    is_program_completed,
    program_duration_weeks_from_plan,
)
from workouts.services import rollover_program_cycle_if_completed

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="lifecycle-test@example.com",
        password="testpass123",
    )


@pytest.mark.django_db
def test_duration_uses_max_of_field_and_day_numbers(user):
    program = WorkoutProgram.objects.create(
        user=user,
        name="Plan largo",
        is_active=True,
        duration_weeks=4,
        start_date=date(2026, 5, 20),
    )
    WorkoutDay.objects.create(program=program, day_number=40, name="Semana 6", order_index=40)

    assert program_duration_weeks_from_plan(program) == 6


@pytest.mark.django_db
def test_completed_plan_rolls_over_to_week_one(user):
    program = WorkoutProgram.objects.create(
        user=user,
        name="Plan 4 semanas",
        is_active=True,
        duration_weeks=4,
        start_date=date(2026, 5, 19),
        end_date=date(2026, 6, 16),
    )
    for day_number in (1, 3, 5):
        WorkoutDay.objects.create(
            program=program,
            day_number=day_number,
            name=f"Día {day_number}",
            order_index=day_number,
        )

    assert is_program_completed(program, date(2026, 6, 22))

    updated = rollover_program_cycle_if_completed(program)
    updated.refresh_from_db()

    assert updated.is_active is True
    assert updated.start_date == date(2026, 6, 16)  # lunes de la semana del 22-jun-2026
    assert get_program_lifecycle_status(updated, date(2026, 6, 22)) == "active"
