from datetime import date, time

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from nutrition.models import Food, MealLog, NutritionPlan, PlanMeal, Recipe
from nutrition.serializers import FoodSerializer, MealLogSerializer, NutritionPlanSerializer, PlanMealSerializer

User = get_user_model()


class FoodSerializerTest(TestCase):
    def test_serialize_food(self):
        food = Food.objects.create(
            name="Pollo",
            serving_unit="g",
            calories=165,
            protein=30,
            carbs=0,
            fat=5,
            allergens=["soy"],
        )

        data = FoodSerializer(food).data
        self.assertEqual(data["name"], "Pollo")
        self.assertEqual(data["calories"], 165)
        self.assertEqual(data["protein"], "30.00")
        self.assertEqual(data["allergens"], ["soy"])
        self.assertIn("id", data)

    def test_deserialize_food(self):
        serializer = FoodSerializer(
            data={
                "name": "Arroz",
                "serving_unit": "g",
                "calories": 130,
                "protein": 2.7,
                "carbs": 28.0,
                "fat": 0.3,
                "allergens": ["gluten"],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        food = serializer.save()
        self.assertEqual(food.name, "Arroz")
        self.assertEqual(food.calories, 130)
        self.assertEqual(food.allergens, ["gluten"])


class PlanMealSerializerTest(TestCase):
    def setUp(self):
        self.plan = NutritionPlan.objects.create(name="Plan Test", daily_calories=2000)
        self.recipe = Recipe.objects.create(name="Avena", calories=300, protein=15, carbs=40, fat=8)

    def test_serialize_plan_meal_with_recipes(self):
        meal = PlanMeal.objects.create(
            plan=self.plan,
            day_of_week=1,
            name="Desayuno",
            meal_type="breakfast",
            time=time(8, 0),
            calories=500,
            protein=30,
            carbs=50,
            fat=15,
            order_index=1,
        )
        meal.suggested_recipes.add(self.recipe)

        data = PlanMealSerializer(meal).data
        self.assertEqual(data["name"], "Desayuno")
        self.assertEqual(data["day_of_week"], 1)
        self.assertEqual(len(data["suggested_recipes"]), 1)
        self.assertEqual(data["suggested_recipes"][0]["name"], "Avena")


class NutritionPlanSerializerTest(TestCase):
    def test_serialize_plan_includes_meals_and_recommended_multiplier(self):
        plan = NutritionPlan.objects.create(
            name="Plan Déficit",
            goal="lose_weight",
            daily_calories=1800,
            protein_grams=140,
            carbs_grams=170,
            fat_grams=60,
        )
        PlanMeal.objects.create(plan=plan, name="Comida", meal_type="lunch", order_index=1)

        data = NutritionPlanSerializer(plan).data
        self.assertEqual(data["name"], "Plan Déficit")
        self.assertEqual(data["recommended_multiplier"], 0.85)
        self.assertEqual(len(data["meals"]), 1)

    def test_update_activating_plan_deactivates_others(self):
        user = User.objects.create_user(email="u1@example.com", password="testpass123")
        old_plan = NutritionPlan.objects.create(user=user, name="Activo", is_active=True)
        new_plan = NutritionPlan.objects.create(user=user, name="Nuevo", is_active=False)

        serializer = NutritionPlanSerializer(instance=new_plan, data={"is_active": True}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        old_plan.refresh_from_db()
        new_plan.refresh_from_db()
        self.assertFalse(old_plan.is_active)
        self.assertTrue(new_plan.is_active)


class MealLogSerializerTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.plan = NutritionPlan.objects.create(user=self.user, name="Plan", daily_calories=2000)
        self.plan_meal = PlanMeal.objects.create(
            plan=self.plan,
            name="Cena",
            meal_type="dinner",
            day_of_week=2,
            order_index=1,
        )

    def test_validate_rejects_duplicate_log_same_plan_meal_and_date(self):
        MealLog.objects.create(user=self.user, plan_meal=self.plan_meal, date=date.today(), meal_type="dinner")
        request = self.factory.post("/nutrition/meal-logs/")
        request.user = self.user

        serializer = MealLogSerializer(
            data={"date": date.today(), "meal_type": "dinner", "meal": self.plan_meal.id},
            context={"request": request},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("meal", serializer.errors)

    def test_validate_allows_new_log_on_different_date(self):
        MealLog.objects.create(user=self.user, plan_meal=self.plan_meal, date=date.today(), meal_type="dinner")
        request = self.factory.post("/nutrition/meal-logs/")
        request.user = self.user

        serializer = MealLogSerializer(
            data={"date": date(2030, 1, 1), "meal_type": "dinner", "meal": self.plan_meal.id},
            context={"request": request},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

