from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from nutrition.models import NutritionPlan, PlanMeal

User = get_user_model()
PLANS_URL = "/api/admin/nutrition/plans/"


class PlanWeekIndependenceTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin-week@test.com",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    @override_settings(SECURE_SSL_REDIRECT=False)
    def test_replace_plan_meals_keeps_independent_weeks(self):
        plan = NutritionPlan.objects.create(
            name="Plan semanas",
            is_template=True,
            is_active=True,
            duration_weeks=4,
            daily_calories=1800,
        )
        payload = {
            "meals": [
                {
                    "week_number": 1,
                    "day_of_week": 1,
                    "name": "Semana1 Lunes Comida",
                    "meal_type": "lunch",
                    "order_index": 1,
                    "suggested_recipes_ids": [],
                    "meal_recipes": [],
                },
                {
                    "week_number": 2,
                    "day_of_week": 1,
                    "name": "Semana2 Lunes Comida",
                    "meal_type": "lunch",
                    "order_index": 1,
                    "suggested_recipes_ids": [],
                    "meal_recipes": [],
                },
            ]
        }

        response = self.client.patch(f"{PLANS_URL}{plan.id}/", payload, format="json")
        self.assertEqual(response.status_code, 200)

        meals = list(PlanMeal.objects.filter(plan=plan).order_by("week_number", "day_of_week"))
        self.assertEqual(len(meals), 2)
        self.assertEqual(meals[0].week_number, 1)
        self.assertEqual(meals[0].name, "Semana1 Lunes Comida")
        self.assertEqual(meals[1].week_number, 2)
        self.assertEqual(meals[1].name, "Semana2 Lunes Comida")

        response = self.client.patch(
            f"{PLANS_URL}{plan.id}/",
            {
                "meals": [
                    {
                        "week_number": 1,
                        "day_of_week": 1,
                        "name": "Semana1 Lunes EDITADA",
                        "meal_type": "lunch",
                        "order_index": 1,
                        "suggested_recipes_ids": [],
                        "meal_recipes": [],
                    },
                    {
                        "week_number": 2,
                        "day_of_week": 1,
                        "name": "Semana2 Lunes Comida",
                        "meal_type": "lunch",
                        "order_index": 1,
                        "suggested_recipes_ids": [],
                        "meal_recipes": [],
                    },
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        week2 = PlanMeal.objects.get(plan=plan, week_number=2, day_of_week=1)
        self.assertEqual(week2.name, "Semana2 Lunes Comida")
