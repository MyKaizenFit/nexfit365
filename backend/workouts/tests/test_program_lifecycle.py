from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

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
    # Completed relative to a fixed calendar day; rollover anchors to current local Monday.
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

    today = timezone.localdate()
    monday = today - timedelta(days=today.weekday())

    assert updated.is_active is True
    assert updated.start_date == monday
    assert get_program_lifecycle_status(updated, today) == "active"


@pytest.mark.django_db
def test_prepare_user_program_activation_resets_completed_plan(user):
    program = WorkoutProgram.objects.create(
        user=user,
        name="Plan reactivado",
        is_active=False,
        duration_weeks=4,
        start_date=date(2026, 3, 1),
        end_date=date(2026, 3, 29),
    )
    WorkoutDay.objects.create(program=program, day_number=1, name="Día 1", order_index=1)

    from workouts.services import prepare_user_program_activation

    updated = prepare_user_program_activation(program)
    updated.refresh_from_db()

    today = timezone.localdate()
    monday = today - timedelta(days=today.weekday())
    duration = program_duration_weeks_from_plan(updated)

    assert updated.is_active is True
    assert updated.start_date == monday
    assert updated.end_date == monday + timedelta(weeks=duration)
    assert get_program_lifecycle_status(updated, today) == "active"
