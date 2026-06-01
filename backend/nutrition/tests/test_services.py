from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from model_bakery import baker

from nutrition.models import Food, NutritionPlan, NutritionPlanHistory, PlanMeal, PlanMealRecipe, Recipe, RecipeIngredient
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
        bmr = 88.362 + (13.397 * self.user.weight) + (4.799 * self.user.height) - (5.677 * self.user.age)
        tdee = bmr * 1.55  # moderate
        expected = round(tdee - 500)
        self.assertEqual(calories, expected)

    def test_calculate_daily_calories_performance_matches_user_property(self):
        self.user.main_goal = "performance"
        self.user.save(update_fields=["main_goal"])

        service_value = PersonalizedNutritionService(self.user).calculate_daily_calories()
        self.assertEqual(service_value, int(self.user.daily_calories_target))

    def test_calculate_daily_calories_uses_admin_override(self):
        self.user.admin_calories_override = 2300
        self.user.save(update_fields=["admin_calories_override"])

        calories = PersonalizedNutritionService(self.user).calculate_daily_calories()

        self.assertEqual(calories, 2300)

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

    def test_calculate_macros_for_performance_goal_is_explicit(self):
        self.user.main_goal = "performance"
        self.user.save(update_fields=["main_goal"])

        macros = PersonalizedNutritionService(self.user).calculate_macros(2400)

        self.assertEqual(macros["protein_percentage"], 30)
        self.assertEqual(macros["carbs_percentage"], 45)
        self.assertEqual(macros["fat_percentage"], 25)

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

    def test_personalized_recipe_does_not_apply_goal_adjustment_twice(self):
        recipe = Recipe.objects.create(
            name="Receta escala limpia",
            calories=500,
            protein=30,
            carbs=45,
            fat=15,
        )

        service = PersonalizedNutritionService(self.user)
        daily = service.calculate_daily_calories()
        expected_scale = (daily * 0.25) / recipe.calories
        expected_scale = max(0.5, min(2.0, expected_scale))

        personalized = service.calculate_personalized_recipe_quantities(recipe, "breakfast")

        self.assertAlmostEqual(personalized["scale_factor"], round(expected_scale, 2), places=2)

    def test_create_personalized_plan_meals_sum_matches_daily_calories(self):
        service = PersonalizedNutritionService(self.user)
        plan = service.create_personalized_plan()

        meals_total = sum(meal.calories for meal in plan.meals.all())
        self.assertEqual(meals_total, plan.daily_calories)

    def test_create_personalized_plan_stores_percentages_from_persisted_grams(self):
        service = PersonalizedNutritionService(self.user)
        plan = service.create_personalized_plan()

        protein_pct = round((plan.protein_grams * 4 / plan.daily_calories) * 100)
        carbs_pct = round((plan.carbs_grams * 4 / plan.daily_calories) * 100)
        fat_pct = round((plan.fat_grams * 9 / plan.daily_calories) * 100)

        self.assertEqual(plan.protein_percentage, protein_pct)
        self.assertEqual(plan.carbs_percentage, carbs_pct)
        self.assertEqual(plan.fat_percentage, fat_pct)

    def test_personalized_recipe_caps_oil_and_adjusts_fat(self):
        recipe = Recipe.objects.create(
            name="Ensalada con aceite",
            calories=0,
            protein=0,
            carbs=0,
            fat=0,
        )
        oil = Food.objects.create(
            name="Aceite de oliva test",
            calories=884,
            protein=0,
            carbs=0,
            fat=100,
            serving_size=100,
            serving_unit="g",
            category="aceite",
        )
        rice = Food.objects.create(
            name="Arroz test limitador",
            calories=130,
            protein=2.7,
            carbs=28,
            fat=0.3,
            serving_size=100,
            serving_unit="g",
        )
        RecipeIngredient.objects.create(recipe=recipe, food=oil, quantity=20, unit="g")
        RecipeIngredient.objects.create(recipe=recipe, food=rice, quantity=100, unit="g")
        recipe.refresh_from_db()

        personalized = PersonalizedNutritionService(self.user).calculate_personalized_recipe_quantities(
            recipe,
            "breakfast",
        )

        oil_row = next(item for item in personalized["ingredients"] if item["name"] == "Aceite de oliva test")
        self.assertEqual(oil_row["amount"], 15)
        self.assertLessEqual(personalized["macros"]["fat"], 16)

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

    def test_admin_calories_override_scales_active_plan_meals_and_recipe_options(self):
        plan = NutritionPlan.objects.create(
            user=self.user,
            name="Plan activo",
            daily_calories=1800,
            protein_grams=120,
            carbs_grams=180,
            fat_grams=60,
            is_active=True,
        )
        meal = PlanMeal.objects.create(
            plan=plan,
            name="Desayuno",
            meal_type="breakfast",
            calories=450,
            protein=Decimal("30.0"),
            carbs=Decimal("50.0"),
            fat=Decimal("15.0"),
        )
        recipe = Recipe.objects.create(
            name="Tostada test",
            calories=300,
            protein=Decimal("20.0"),
            carbs=Decimal("30.0"),
            fat=Decimal("10.0"),
        )
        meal_recipe = PlanMealRecipe.objects.create(
            meal=meal,
            recipe=recipe,
            servings=Decimal("1.0"),
            custom_calories=300,
            custom_protein=Decimal("20.0"),
            custom_carbs=Decimal("30.0"),
            custom_fat=Decimal("10.0"),
        )

        self.user.admin_calories_override = 2400
        self.user.save(update_fields=["admin_calories_override"])

        plan.refresh_from_db()
        meal.refresh_from_db()
        meal_recipe.refresh_from_db()

        self.assertEqual(plan.daily_calories, 2400)
        self.assertEqual(meal_recipe.custom_calories, 400)
        self.assertGreater(float(meal_recipe.servings), 1.0)
        self.assertEqual(meal.calories, meal_recipe.get_display_calories())

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
