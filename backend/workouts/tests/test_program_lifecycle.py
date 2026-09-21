from datetime import date, datetime, timedelta, timezone as dt_timezone

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from freezegun import freeze_time

from workouts.models import WorkoutDay, WorkoutLog, WorkoutProgram
from workouts.program_lifecycle import (
    expected_program_end_date,
    get_program_lifecycle_status,
    is_program_completed,
    program_duration_weeks_from_plan,
    program_week_for_date,
)
from workouts.services import reset_weekly_workout_plan_if_needed, rollover_program_cycle_if_completed

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


def _multi_week_program(user, *, start, end, duration, max_day, name="Plan"):
    program = WorkoutProgram.objects.create(
        user=user,
        name=name,
        is_active=True,
        duration_weeks=duration,
        start_date=start,
        end_date=end,
    )
    WorkoutDay.objects.create(program=program, day_number=1, name="Día 1", order_index=1)
    if max_day != 1:
        WorkoutDay.objects.create(
            program=program,
            day_number=max_day,
            name=f"Día {max_day}",
            order_index=max_day,
        )
    return program


@pytest.mark.django_db
def test_stale_end_date_does_not_complete_mid_block(user):
    """Caso Laura: start 17/08, duration 8, end 21/09 obsoleto, referencia 22/09."""
    program = _multi_week_program(
        user,
        start=date(2026, 8, 17),
        end=date(2026, 9, 21),
        duration=8,
        max_day=56,
        name="Plan 8 semanas stale end",
    )
    reference = date(2026, 9, 22)

    assert expected_program_end_date(program) == date(2026, 10, 12)
    assert program_week_for_date(program, reference) == 6
    assert get_program_lifecycle_status(program, reference) == "active"
    assert is_program_completed(program, reference) is False

    updated = reset_weekly_workout_plan_if_needed(program)
    updated.refresh_from_db()

    assert updated.is_active is True
    assert updated.start_date == date(2026, 8, 17)
    assert updated.duration_weeks == 8
    assert updated.end_date == date(2026, 10, 12)
    assert program_week_for_date(updated, reference) == 6
    assert get_program_lifecycle_status(updated, reference) == "active"

    with freeze_time(datetime(2026, 9, 22, 10, 0, tzinfo=dt_timezone.utc)):
        rolled = rollover_program_cycle_if_completed(updated)
        rolled.refresh_from_db()
        assert rolled.start_date == date(2026, 8, 17)
        assert rolled.end_date == date(2026, 10, 12)


@pytest.mark.django_db
def test_reset_extends_end_date_when_duration_increases(user):
    program = _multi_week_program(
        user,
        start=date(2026, 8, 17),
        end=date(2026, 9, 21),
        duration=5,
        max_day=35,
        name="Plan 5 a 8",
    )
    program.duration_weeks = 8
    program.save(update_fields=["duration_weeks", "updated_at"])

    updated = reset_weekly_workout_plan_if_needed(program)
    updated.refresh_from_db()

    assert updated.duration_weeks == 8
    assert updated.end_date == date(2026, 10, 12)
    assert get_program_lifecycle_status(updated, date(2026, 9, 22)) == "active"


@pytest.mark.django_db
def test_reset_syncs_end_date_from_inferred_day_numbers(user):
    program = _multi_week_program(
        user,
        start=date(2026, 8, 17),
        end=date(2026, 9, 21),
        duration=5,
        max_day=56,
        name="Plan days week 8",
    )

    assert program_duration_weeks_from_plan(program) == 8

    updated = reset_weekly_workout_plan_if_needed(program)
    updated.refresh_from_db()

    assert updated.duration_weeks == 8
    assert updated.end_date == date(2026, 10, 12)
    assert get_program_lifecycle_status(updated, date(2026, 9, 22)) == "active"


@pytest.mark.django_db
def test_week_eight_stays_active_until_expected_end(user):
    program = _multi_week_program(
        user,
        start=date(2026, 8, 17),
        end=date(2026, 10, 12),
        duration=8,
        max_day=56,
        name="Plan semana 8",
    )

    assert program_week_for_date(program, date(2026, 10, 5)) == 8
    assert get_program_lifecycle_status(program, date(2026, 10, 5)) == "active"
    assert get_program_lifecycle_status(program, date(2026, 10, 11)) == "active"
    assert get_program_lifecycle_status(program, date(2026, 10, 12)) == "completed"


@pytest.mark.django_db
def test_genuine_completion_still_rolls_over_to_week_one(user):
    program = _multi_week_program(
        user,
        start=date(2026, 8, 17),
        end=date(2026, 10, 12),
        duration=8,
        max_day=56,
        name="Plan realmente terminado",
    )
    reference = date(2026, 10, 13)
    assert is_program_completed(program, reference)

    with freeze_time(datetime(2026, 10, 13, 10, 0, tzinfo=dt_timezone.utc)):
        updated = rollover_program_cycle_if_completed(program)
        updated.refresh_from_db()
        today = timezone.localdate()
        monday = today - timedelta(days=today.weekday())

        assert updated.is_active is True
        assert updated.start_date == monday
        assert updated.end_date == monday + timedelta(weeks=8)
        assert get_program_lifecycle_status(updated, today) == "active"
        assert program_week_for_date(updated, today) == 1


@pytest.mark.django_db
@override_settings(TIME_ZONE="Europe/Madrid", USE_TZ=True)
@freeze_time(datetime(2026, 9, 20, 22, 30, tzinfo=dt_timezone.utc))
def test_lifecycle_uses_madrid_date_near_midnight(user):
    # 22:30 UTC domingo 20/09 = 00:30 Europe/Madrid lunes 21/09.
    assert timezone.now().date() == date(2026, 9, 20)
    assert timezone.localdate() == date(2026, 9, 21)

    program = _multi_week_program(
        user,
        start=date(2026, 8, 17),
        end=date(2026, 10, 12),
        duration=8,
        max_day=56,
        name="Plan TZ Madrid",
    )

    assert program_week_for_date(program) == 6
    assert get_program_lifecycle_status(program) == "active"


@pytest.mark.django_db
def test_reset_does_not_touch_workout_logs(user):
    program = _multi_week_program(
        user,
        start=date(2026, 8, 17),
        end=date(2026, 9, 21),
        duration=8,
        max_day=56,
        name="Plan con histórico",
    )
    day = program.days.get(day_number=1)
    log = WorkoutLog.objects.create(
        user=user,
        workout_day=day,
        date=date(2026, 9, 15),
        completed=True,
        notes="histórico",
    )

    reset_weekly_workout_plan_if_needed(program)
    program.refresh_from_db()
    log.refresh_from_db()

    assert program.end_date == date(2026, 10, 12)
    assert WorkoutLog.objects.filter(user=user).count() == 1
    assert log.date == date(2026, 9, 15)
    assert log.workout_day_id == day.id
    assert log.notes == "histórico"
    assert log.completed is True
