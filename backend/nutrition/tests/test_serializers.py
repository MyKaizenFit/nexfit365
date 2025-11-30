from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date, time
from nutrition.models import Food, NutritionPlan, Meal, MealFood, DefaultNutritionPlan, DefaultMeal, DailyMealSelection
from nutrition.serializers import (
    FoodSerializer, MealFoodSerializer, MealSerializer,
    DefaultNutritionPlanSerializer, DefaultMealSerializer,
    DailyMealSelectionSerializer, NutritionPlanListSerializer
)

User = get_user_model()


class FoodSerializerTest(TestCase):
    """Tests para FoodSerializer"""
    
    def test_serialize_food(self):
        """Test serializar un alimento"""
        food = Food.objects.create(
            name="Pollo",
            unit="g",
            calories=165,
            protein=30,
            carbs=0,
            fat=5
        )
        
        serializer = FoodSerializer(food)
        data = serializer.data
        
        self.assertEqual(data['name'], "Pollo")
        self.assertEqual(data['calories'], 165)
        self.assertEqual(data['protein'], "30.00")
        self.assertIn('id', data)
    
    def test_deserialize_food(self):
        """Test deserializar datos para crear un alimento"""
        data = {
            'name': 'Arroz',
            'unit': 'g',
            'calories': 130,
            'protein': 2.7,
            'carbs': 28.0,
            'fat': 0.3
        }
        
        serializer = FoodSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        
        food = serializer.save()
        self.assertEqual(food.name, "Arroz")
        self.assertEqual(food.calories, 130)


class MealSerializerTest(TestCase):
    """Tests para MealSerializer"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
        self.plan = NutritionPlan.objects.create(
            user=self.user,
            name="Test Plan",
            daily_calories=2000,
            start_date=date.today()
        )
    
    def test_serialize_meal(self):
        """Test serializar una comida"""
        meal = Meal.objects.create(
            plan=self.plan,
            name="Desayuno",
            calories=500,
            protein=30,
            carbs=60,
            fat=15,
            order_index=1
        )
        
        serializer = MealSerializer(meal)
        data = serializer.data
        
        self.assertEqual(data['name'], "Desayuno")
        self.assertEqual(data['calories'], 500)
        self.assertIn('id', data)
        self.assertIn('meal_foods', data)
    
    def test_deserialize_meal(self):
        """Test deserializar datos para crear una comida"""
        data = {
            'name': 'Almuerzo',
            'calories': 600,
            'protein': 40,
            'carbs': 70,
            'fat': 20,
            'order_index': 2
        }
        
        serializer = MealSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        
        meal = serializer.save(plan=self.plan)
        self.assertEqual(meal.name, "Almuerzo")
        self.assertEqual(meal.plan, self.plan)


class DefaultNutritionPlanSerializerTest(TestCase):
    """Tests para DefaultNutritionPlanSerializer"""
    
    def setUp(self):
        self.plan = DefaultNutritionPlan.objects.create(
            name="Plan 1800",
            daily_calories=1800,
            protein_percentage=30,
            carbs_percentage=40,
            fat_percentage=30
        )
        self.meal = DefaultMeal.objects.create(
            plan=self.plan,
            name="Desayuno",
            time=time(9, 0),
            calories=500,
            protein=30,
            carbs=60,
            fat=15
        )
    
    def test_serialize_plan_with_meals(self):
        """Test serializar un plan con sus comidas"""
        serializer = DefaultNutritionPlanSerializer(self.plan)
        data = serializer.data
        
        self.assertEqual(data['name'], "Plan 1800")
        self.assertEqual(data['daily_calories'], 1800)
        self.assertIn('meals', data)
        self.assertEqual(len(data['meals']), 1)
        self.assertEqual(data['meals'][0]['name'], "Desayuno")


class DefaultMealSerializerTest(TestCase):
    """Tests para DefaultMealSerializer"""
    
    def setUp(self):
        self.plan = DefaultNutritionPlan.objects.create(
            name="Test Plan",
            daily_calories=2000
        )
    
    def test_serialize_default_meal(self):
        """Test serializar una comida por defecto"""
        meal = DefaultMeal.objects.create(
            plan=self.plan,
            name="Cena",
            time=time(20, 0),
            calories=400,
            protein=30,
            carbs=40,
            fat=15
        )
        
        serializer = DefaultMealSerializer(meal)
        data = serializer.data
        
        self.assertEqual(data['name'], "Cena")
        self.assertEqual(data['calories'], 400)
        self.assertEqual(data['time'], "20:00:00")


class DailyMealSelectionSerializerTest(TestCase):
    """Tests para DailyMealSelectionSerializer"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
        self.plan = DefaultNutritionPlan.objects.create(
            name="Test Plan",
            daily_calories=2000
        )
        self.meal = DefaultMeal.objects.create(
            plan=self.plan,
            name="Desayuno",
            time=time(9, 0),
            calories=500,
            protein=30,
            carbs=60,
            fat=15
        )
    
    def test_serialize_selection(self):
        """Test serializar una selección diaria"""
        selection = DailyMealSelection.objects.create(
            user=self.user,
            date=date.today(),
            meal_type="Desayuno",
            selected_meal=self.meal
        )
        
        serializer = DailyMealSelectionSerializer(selection)
        data = serializer.data
        
        self.assertEqual(data['meal_type'], "Desayuno")
        self.assertEqual(data['date'], str(date.today()))
        self.assertIn('selected_meal', data)
        self.assertEqual(data['selected_meal']['name'], "Desayuno")
        self.assertFalse(data['is_completed'])


class NutritionPlanListSerializerTest(TestCase):
    """Tests para NutritionPlanListSerializer"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
    
    def test_serialize_plan_list(self):
        """Test serializar plan para lista"""
        plan = NutritionPlan.objects.create(
            user=self.user,
            name="Plan Test",
            daily_calories=1800,
            start_date=date.today()
        )
        
        serializer = NutritionPlanListSerializer(plan)
        data = serializer.data
        
        self.assertEqual(data['name'], "Plan Test")
        self.assertEqual(data['daily_calories'], 1800)
        self.assertIn('id', data)
        self.assertFalse(data['is_active'])

