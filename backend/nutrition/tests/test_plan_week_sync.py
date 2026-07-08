from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from nutrition.models import NutritionPlan, PlanMeal
from nutrition.plan_week_utils import expand_meals_payload_sync_weeks

User = get_user_model()
PLANS_URL = "/api/admin/nutrition/plans/"


class ExpandMealsPayloadSyncWeeksTests(TestCase):
    def test_copies_source_week_to_all_other_weeks(self):
        payload = [
            {
                "week_number": 1,
                "day_of_week": 1,
                "name": "Desayuno S1",
                "meal_type": "breakfast",
                "order_index": 1,
                "meal_recipes": [],
            },
            {
                "week_number": 2,
                "day_of_week": 1,
                "name": "Desayuno legacy S2",
                "meal_type": "breakfast",
                "order_index": 1,
                "meal_recipes": [],
            },
        ]

        synced = expand_meals_payload_sync_weeks(payload, source_week=1, duration_weeks=4)

        week1 = [meal for meal in synced if meal["week_number"] == 1]
        week2 = [meal for meal in synced if meal["week_number"] == 2]
        week3 = [meal for meal in synced if meal["week_number"] == 3]

        assert len(week1) == 1
        assert week1[0]["name"] == "Desayuno S1"
        assert len(week2) == 1
        assert week2[0]["name"] == "Desayuno S1"
        assert len(week3) == 1
        assert week3[0]["name"] == "Desayuno S1"


class NutritionCopyWeeksApiTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin-copy-weeks@test.com",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    @override_settings(SECURE_SSL_REDIRECT=False)
    def test_copy_weeks_endpoint_replaces_target_weeks(self):
        plan = NutritionPlan.objects.create(
            name="Plan copy weeks",
            is_template=True,
            is_active=True,
            duration_weeks=4,
            daily_calories=1800,
        )
        PlanMeal.objects.create(
            plan=plan,
            week_number=1,
            day_of_week=1,
            name="Tres comidas S1",
            meal_type="breakfast",
            order_index=1,
            calories=600,
        )
        PlanMeal.objects.create(
            plan=plan,
            week_number=2,
            day_of_week=1,
            name="Cuatro comidas legacy S2",
            meal_type="breakfast",
            order_index=1,
            calories=450,
        )
        PlanMeal.objects.create(
            plan=plan,
            week_number=2,
            day_of_week=1,
            name="Snack legacy S2",
            meal_type="snack",
            order_index=2,
            calories=450,
        )

        response = self.client.post(
            f"{PLANS_URL}{plan.id}/copy-weeks/",
            {"source_week": 1, "target_weeks": [2, 3, 4]},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        week2_meals = PlanMeal.objects.filter(plan=plan, week_number=2, day_of_week=1)
        self.assertEqual(week2_meals.count(), 1)
        self.assertEqual(week2_meals.first().name, "Tres comidas S1")

    @override_settings(SECURE_SSL_REDIRECT=False)
    def test_update_with_sync_weeks_from_propagates_active_week(self):
        plan = NutritionPlan.objects.create(
            name="Plan sync on save",
            is_template=True,
            is_active=True,
            duration_weeks=4,
            daily_calories=1650,
            meals_per_day=3,
        )
        PlanMeal.objects.create(
            plan=plan,
            week_number=2,
            day_of_week=1,
            name="Snack legacy",
            meal_type="snack",
            order_index=4,
            calories=400,
        )

        payload = {
            "sync_weeks_from": 1,
            "meals": [
                {
                    "week_number": 1,
                    "day_of_week": 1,
                    "name": "Desayuno",
                    "meal_type": "breakfast",
                    "order_index": 1,
                    "calories": 550,
                    "protein": 30,
                    "carbs": 50,
                    "fat": 20,
                    "meal_recipes": [],
                },
                {
                    "week_number": 1,
                    "day_of_week": 1,
                    "name": "Comida",
                    "meal_type": "lunch",
                    "order_index": 2,
                    "calories": 550,
                    "protein": 30,
                    "carbs": 50,
                    "fat": 20,
                    "meal_recipes": [],
                },
                {
                    "week_number": 1,
                    "day_of_week": 1,
                    "name": "Cena",
                    "meal_type": "dinner",
                    "order_index": 3,
                    "calories": 550,
                    "protein": 30,
                    "carbs": 50,
                    "fat": 20,
                    "meal_recipes": [],
                },
            ],
        }

        response = self.client.patch(f"{PLANS_URL}{plan.id}/", payload, format="json")
        self.assertEqual(response.status_code, 200)

        plan.refresh_from_db()
        self.assertEqual(plan.meals_per_day, 3)
        week2 = PlanMeal.objects.filter(plan=plan, week_number=2, day_of_week=1)
        self.assertEqual(week2.count(), 3)
        self.assertEqual(sum(meal.calories for meal in week2), 1650)
