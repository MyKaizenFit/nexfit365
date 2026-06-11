from datetime import date
from django.test import SimpleTestCase, TestCase

from nutrition.plan_week_utils import (
    plan_duration_weeks,
    resolve_plan_week_number,
    week_number_from_month_calendar_date,
)


class PlanWeekUtilsTests(SimpleTestCase):
    def test_plan_duration_weeks(self):
        self.assertEqual(plan_duration_weeks(type("Plan", (), {"duration_weeks": 4})()), 4)
        self.assertEqual(plan_duration_weeks(type("Plan", (), {"duration_weeks": None})()), 1)

    def test_resolve_plan_week_number_cycles_from_start_date(self):
        plan = type("Plan", (), {"duration_weeks": 4, "start_date": date(2026, 6, 1)})()
        self.assertEqual(resolve_plan_week_number(plan, date(2026, 6, 1)), 1)
        self.assertEqual(resolve_plan_week_number(plan, date(2026, 6, 8)), 2)
        self.assertEqual(resolve_plan_week_number(plan, date(2026, 6, 22)), 4)
        self.assertEqual(resolve_plan_week_number(plan, date(2026, 6, 29)), 1)

    def test_resolve_plan_week_number_without_start_date_defaults_to_one(self):
        plan = type("Plan", (), {"duration_weeks": 4, "start_date": None})()
        self.assertEqual(resolve_plan_week_number(plan, date(2026, 6, 15)), 1)

    def test_week_number_from_month_calendar_date(self):
        self.assertEqual(week_number_from_month_calendar_date(date(2026, 6, 1), 4), 1)
        self.assertEqual(week_number_from_month_calendar_date(date(2026, 6, 8), 4), 2)
        self.assertEqual(week_number_from_month_calendar_date(date(2026, 6, 15), 4), 3)
