from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from nutrition.models import NutritionPlan, PlanMeal
from nutrition.plan_week_sync import plan_has_inconsistent_week_structure, sync_plan_meals_from_week
from progress.models import RestWellnessAssessment

User = get_user_model()


class TestPlanWeekSync(TestCase):
    def test_detects_inconsistent_week_structure(self):
        plan = NutritionPlan.objects.create(
            name="Plan inconsistente",
            is_active=True,
            duration_weeks=4,
            daily_calories=1800,
        )
        PlanMeal.objects.create(
            plan=plan, week_number=1, day_of_week=1,
            name="Tres", meal_type="breakfast", order_index=1, calories=600,
        )
        PlanMeal.objects.create(
            plan=plan, week_number=2, day_of_week=1,
            name="Cuatro A", meal_type="breakfast", order_index=1, calories=450,
        )
        PlanMeal.objects.create(
            plan=plan, week_number=2, day_of_week=1,
            name="Cuatro B", meal_type="snack", order_index=2, calories=450,
        )

        self.assertTrue(plan_has_inconsistent_week_structure(plan))

    def test_sync_copies_source_week_to_targets(self):
        plan = NutritionPlan.objects.create(
            name="Plan sync",
            is_active=True,
            duration_weeks=4,
            daily_calories=1800,
        )
        PlanMeal.objects.create(
            plan=plan, week_number=1, day_of_week=1,
            name="Origen", meal_type="breakfast", order_index=1, calories=600,
        )
        PlanMeal.objects.create(
            plan=plan, week_number=2, day_of_week=1,
            name="Legacy", meal_type="snack", order_index=1, calories=400,
        )

        result = sync_plan_meals_from_week(plan, source_week=1)
        self.assertFalse(result["skipped"])
        self.assertEqual(result["created_meals"], 3)

        week2 = PlanMeal.objects.filter(plan=plan, week_number=2, day_of_week=1)
        self.assertEqual(week2.count(), 1)
        self.assertEqual(week2.first().name, "Origen")


class TestAdminRestWellnessEndpoint(TestCase):
    @override_settings(SECURE_SSL_REDIRECT=False)
    def test_admin_lists_user_assessments(self):
        admin = User.objects.create_superuser(email="admin-rw@test.com", password="pass123")
        member = User.objects.create_user(email="member-rw@test.com", password="pass123", role="MEMBER")

        RestWellnessAssessment.objects.create(
            user=member,
            answers=[False] * 32,
            scores={"sleep": 0},
            script="Guión test",
            top_categories=["sleep"],
        )

        client = APIClient()
        client.force_authenticate(user=admin)
        response = client.get(f"/api/admin/progress/users/{member.id}/rest-wellness/")
        self.assertEqual(response.status_code, 200)
        rows = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(rows), 1)
        self.assertNotIn("script", rows[0])

        detail = client.get(f"/api/admin/progress/users/{member.id}/rest-wellness/{rows[0]['id']}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["script"], "Guión test")
