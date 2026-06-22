from datetime import date

from django.test import TestCase

from accounts.models import CustomUser
from workouts.management.commands.repair_user_workout_programs import (
    _anchor_start_for_week,
    _sync_program_dates_preserve_progress,
)
from workouts.models import WorkoutDay, WorkoutProgram


class RepairUserWorkoutProgramsTest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="repair-user@example.com",
            password="testpass123",
        )

    def test_sync_preserves_start_date_and_extends_end_date(self):
        program = WorkoutProgram.objects.create(
            user=self.user,
            name="Plan 8 semanas",
            is_active=True,
            start_date=date(2026, 4, 7),
            end_date=date(2026, 5, 5),
            duration_weeks=4,
        )
        WorkoutDay.objects.create(program=program, day_number=56, name="Semana 8", order_index=56)

        changes = _sync_program_dates_preserve_progress(
            program,
            date(2026, 5, 15),
            preserve_start_date=True,
        )

        self.assertEqual(program.duration_weeks, 8)
        self.assertEqual(program.start_date, date(2026, 4, 7))
        self.assertEqual(program.end_date, date(2026, 6, 1))
        self.assertTrue(any("duration_weeks" in change for change in changes))
        self.assertTrue(any("end_date" in change for change in changes))
        self.assertFalse(any("start_date" in change for change in changes))

    def test_anchor_start_for_week_sets_expected_dates(self):
        program = WorkoutProgram.objects.create(
            user=self.user,
            name="Plan 4 semanas",
            is_active=True,
            duration_weeks=4,
        )
        WorkoutDay.objects.create(program=program, day_number=15, name="Semana 3", order_index=15)

        _anchor_start_for_week(program, 3, date(2026, 6, 22))

        self.assertEqual(program.start_date, date(2026, 6, 8))
        self.assertEqual(program.end_date, date(2026, 7, 6))
