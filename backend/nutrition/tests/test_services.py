from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from model_bakery import baker

from nutrition.models import Food, NutritionPlan, NutritionPlanHistory, PlanMeal, Recipe, RecipeIngredient
from nutrition.services import PersonalizedNutritionService

User = get_user_model()


class PersonalizedNutritionServiceTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            birth_date=date(1994, 1, 1),
            gender="male",
            height=175,
            weight=80,
            activity_level="moderate",
            training_days_per_week=3,
            training_location="gym",
            main_goal="lose_weight",
            role="basic",
        )

        self.system_plan = NutritionPlan.objects.create(
            name="Pérdida de peso sistema",
            description="Plan base",
            daily_calories=1800,
            goal="lose_weight",
            is_system=True,
            is_active=True,
        )
        PlanMeal.objects.create(
            plan=self.system_plan,
            name="Desayuno",
            meal_type="breakfast",
            day_of_week=1,
            calories=450,
            protein=30,
            carbs=50,
            fat=15,
            order_index=1,
        )
        PlanMeal.objects.create(
            plan=self.system_plan,
            name="Almuerzo",
            meal_type="lunch",
            day_of_week=1,
            calories=600,
            protein=40,
            carbs=70,
            fat=20,
            order_index=2,
        )

        self.template_plan = NutritionPlan.objects.create(
            name="Plantilla pérdida",
            daily_calories=1900,
            goal="lose_weight",
            is_template=True,
            is_active=True,
        )

    def test_calculate_daily_calories_with_complete_profile(self):
        service = PersonalizedNutritionService(self.user)
        calories = service.calculate_daily_calories()
        self.assertGreaterEqual(calories, 1700)
        self.assertLessEqual(calories, 2600)

    def test_calculate_daily_calories_with_missing_data_uses_weight_estimation(self):
        incomplete_user = User.objects.create_user(email="incomplete@example.com", password="testpass123")
        incomplete_user.weight = 80
        incomplete_user.activity_level = 'moderate'
        incomplete_user.main_goal = 'lose_weight'
        incomplete_user.save(update_fields=['weight', 'activity_level', 'main_goal'])
        calories = PersonalizedNutritionService(incomplete_user).calculate_daily_calories()
        self.assertEqual(calories, 2040)

    def test_calculate_macros_for_goal(self):
        macros = PersonalizedNutritionService(self.user).calculate_macros(1800)
        self.assertEqual(macros["protein_percentage"], 30)
        self.assertEqual(macros["carbs_percentage"], 40)
        self.assertEqual(macros["fat_percentage"], 30)

    def test_calculate_macros_keto_restriction(self):
        keto_user = User.objects.create_user(
            email="keto@example.com",
            password="testpass123",
            main_goal="maintain",
            dietary_restrictions=["keto"],
        )
        macros = PersonalizedNutritionService(keto_user).calculate_macros(2000)
        self.assertEqual(macros["protein_percentage"], 20)
        self.assertEqual(macros["carbs_percentage"], 5)
        self.assertEqual(macros["fat_percentage"], 75)

    def test_get_suitable_plans_returns_system_or_template_active(self):
        NutritionPlan.objects.create(name="Inactivo", is_system=True, is_active=False, goal="lose_weight")
        plans = PersonalizedNutritionService(self.user).get_suitable_plans()
        self.assertTrue(plans.filter(id=self.system_plan.id).exists())
        self.assertTrue(plans.filter(id=self.template_plan.id).exists())

    def test_personalized_recipe_uses_relational_ingredients(self):
        recipe = Recipe.objects.create(
            name="Bowl con ingredientes relacionales",
            calories=400,
            protein=30,
            carbs=45,
            fat=12,
        )
        food = Food.objects.create(
            name="Pollo test relacional",
            calories=120,
            protein=22,
            carbs=0,
            fat=3,
        )
        RecipeIngredient.objects.create(
            recipe=recipe,
            food=food,
            quantity=100,
            unit="g",
        )

        personalized = PersonalizedNutritionService(self.user).calculate_personalized_recipe_quantities(
            recipe,
            "breakfast",
        )

        self.assertEqual(personalized["ingredients"][0]["name"], "Pollo test relacional")
        self.assertGreater(personalized["ingredients"][0]["amount"], 0)

    def test_assign_best_plan_creates_user_plan_and_history(self):
        service = PersonalizedNutritionService(self.user)
        assigned_plan = service.assign_best_plan()

        self.assertIsNotNone(assigned_plan)
        self.assertEqual(assigned_plan.user, self.user)
        self.assertTrue(assigned_plan.is_active)
        self.assertGreater(assigned_plan.meals.count(), 0)

        history = NutritionPlanHistory.objects.filter(user=self.user).order_by("-created_at").first()
        self.assertIsNotNone(history)
        self.assertEqual(history.reason, "auto_assigned")
        self.assertEqual(history.new_plan_id, assigned_plan.id)

    def test_assign_best_plan_deactivates_existing_user_plan(self):
        existing_plan = NutritionPlan.objects.create(user=self.user, name="Activo previo", is_active=True)
        assigned_plan = PersonalizedNutritionService(self.user).assign_best_plan()

        existing_plan.refresh_from_db()
        self.assertFalse(existing_plan.is_active)
        self.assertIsNotNone(existing_plan.end_date)
        self.assertTrue(assigned_plan.is_active)

    def test_assign_best_plan_filters_blocked_recipes(self):
        breakfast = self.system_plan.meals.get(name="Desayuno")
        blocked_recipe = baker.make(
            "nutrition.Recipe",
            name="Tostada con cacahuete",
            is_active=True,
            category="Desayuno",
            meal_types=["breakfast"],
            allergens=["peanuts"],
            ingredients=[{"name": "Mantequilla de cacahuete", "amount": "20", "unit": "g"}],
        )
        safe_recipe = baker.make(
            "nutrition.Recipe",
            name="Avena con frutas",
            is_active=True,
            category="Desayuno",
            meal_types=["breakfast"],
            allergens=[],
            ingredients=[{"name": "Avena", "amount": "50", "unit": "g"}],
        )
        breakfast.suggested_recipes.set([blocked_recipe, safe_recipe])
        self.user.allergies = ["peanuts"]
        self.user.save(update_fields=["allergies"])

        assigned_plan = PersonalizedNutritionService(self.user).assign_best_plan()

        assigned_breakfast = assigned_plan.meals.get(name="Desayuno")
        assigned_recipe_ids = list(assigned_breakfast.suggested_recipes.values_list("id", flat=True))
        self.assertIn(safe_recipe.id, assigned_recipe_ids)
        self.assertNotIn(blocked_recipe.id, assigned_recipe_ids)
