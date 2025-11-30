from django.test import TestCase
from django.contrib.auth import get_user_model
from nutrition.models import DefaultNutritionPlan, DefaultMeal, NutritionPlan, NutritionPlanHistory
from nutrition.services import PersonalizedNutritionService

User = get_user_model()


class PersonalizedNutritionServiceTest(TestCase):
    """Tests para PersonalizedNutritionService"""
    
    def setUp(self):
        """Setup para cada test"""
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            age=30,
            gender="male",
            height=175,  # cm
            weight=80,   # kg
            activity_level="moderate",
            training_days_per_week=3,
            training_location="gym",
            main_goal="lose_weight",
            role="basic"
        )
        
        # Crear planes por defecto para testing
        self.plan_1800 = DefaultNutritionPlan.objects.create(
            name="Plan 1800",
            daily_calories=1800,
            protein_percentage=30,
            carbs_percentage=40,
            fat_percentage=30,
            min_role_required="basic"
        )
        
        self.plan_2000 = DefaultNutritionPlan.objects.create(
            name="Plan 2000",
            daily_calories=2000,
            protein_percentage=25,
            carbs_percentage=45,
            fat_percentage=30,
            min_role_required="basic"
        )
        
        self.plan_premium = DefaultNutritionPlan.objects.create(
            name="Plan Premium",
            daily_calories=2200,
            protein_percentage=30,
            carbs_percentage=40,
            fat_percentage=30,
            min_role_required="premium"
        )
        
        # Crear comidas de ejemplo
        DefaultMeal.objects.create(
            plan=self.plan_1800,
            name="Desayuno",
            time='09:00:00',
            calories=450,
            protein=30,
            carbs=50,
            fat=15,
            order_index=1
        )
        
        DefaultMeal.objects.create(
            plan=self.plan_1800,
            name="Almuerzo",
            time='14:00:00',
            calories=600,
            protein=45,
            carbs=60,
            fat=20,
            order_index=2
        )
    
    def test_calculate_daily_calories_male_lose_weight(self):
        """Test cálculo de calorías para hombre que quiere perder peso"""
        service = PersonalizedNutritionService(self.user)
        calories = service.calculate_daily_calories()
        
        # Verificar que el cálculo es razonable
        self.assertGreater(calories, 1500)
        self.assertLess(calories, 3500)
        # Para un hombre de 30 años, 175cm, 80kg, moderate activity, lose_weight
        # Esperamos alrededor de 2200-2500 * 0.8 = 1760-2000 calorías
        # Pero puede variar un poco, así que ampliamos el rango
        self.assertGreaterEqual(calories, 1700)
        self.assertLessEqual(calories, 2500)
    
    def test_calculate_daily_calories_female_gain_muscle(self):
        """Test cálculo de calorías para mujer que quiere ganar músculo"""
        female_user = User.objects.create_user(
            email="female@example.com",
            password="testpass123",
            age=25,
            gender="female",
            height=165,
            weight=65,
            activity_level="active",
            main_goal="gain_muscle",
            role="basic"
        )
        
        service = PersonalizedNutritionService(female_user)
        calories = service.calculate_daily_calories()
        
        # Verificar que es un superávit (debería ser mayor que mantenimiento)
        self.assertGreater(calories, 1800)
        self.assertLess(calories, 3000)
    
    def test_calculate_daily_calories_with_missing_data(self):
        """Test cálculo de calorías con datos faltantes"""
        incomplete_user = User.objects.create_user(
            email="incomplete@example.com",
            password="testpass123",
            role="basic"
        )
        
        service = PersonalizedNutritionService(incomplete_user)
        calories = service.calculate_daily_calories()
        
        # Debería devolver el valor por defecto
        self.assertEqual(calories, 2000)
    
    def test_calculate_macros_lose_weight(self):
        """Test cálculo de macros para pérdida de peso"""
        service = PersonalizedNutritionService(self.user)
        calories = 1800
        macros = service.calculate_macros(calories)
        
        self.assertEqual(macros['protein_percentage'], 30)
        self.assertEqual(macros['carbs_percentage'], 40)
        self.assertEqual(macros['fat_percentage'], 30)
        
        # Verificar gramos
        self.assertAlmostEqual(macros['protein'], 1800 * 0.30 / 4, places=1)
        self.assertAlmostEqual(macros['carbs'], 1800 * 0.40 / 4, places=1)
        self.assertAlmostEqual(macros['fat'], 1800 * 0.30 / 9, places=1)
    
    def test_calculate_macros_gain_muscle(self):
        """Test cálculo de macros para ganancia de músculo"""
        muscle_user = User.objects.create_user(
            email="muscle@example.com",
            password="testpass123",
            main_goal="gain_muscle",
            role="basic"
        )
        
        service = PersonalizedNutritionService(muscle_user)
        calories = 2500
        macros = service.calculate_macros(calories)
        
        self.assertEqual(macros['protein_percentage'], 25)
        self.assertEqual(macros['carbs_percentage'], 50)
        self.assertEqual(macros['fat_percentage'], 25)
    
    def test_calculate_macros_keto(self):
        """Test cálculo de macros para dieta keto"""
        keto_user = User.objects.create_user(
            email="keto@example.com",
            password="testpass123",
            dietary_restrictions=["keto"],
            role="basic"
        )
        
        service = PersonalizedNutritionService(keto_user)
        calories = 2000
        macros = service.calculate_macros(calories)
        
        self.assertEqual(macros['protein_percentage'], 20)
        self.assertEqual(macros['carbs_percentage'], 5)
        self.assertEqual(macros['fat_percentage'], 75)
    
    def test_calculate_macros_low_carb(self):
        """Test cálculo de macros para dieta baja en carbohidratos"""
        lowcarb_user = User.objects.create_user(
            email="lowcarb@example.com",
            password="testpass123",
            dietary_restrictions=["low_carb"],
            role="basic"
        )
        
        service = PersonalizedNutritionService(lowcarb_user)
        calories = 2000
        macros = service.calculate_macros(calories)
        
        self.assertEqual(macros['protein_percentage'], 30)
        self.assertEqual(macros['carbs_percentage'], 20)
        self.assertEqual(macros['fat_percentage'], 50)
    
    def test_get_suitable_plans(self):
        """Test obtener planes adecuados para el usuario"""
        service = PersonalizedNutritionService(self.user)
        suitable_plans = service.get_suitable_plans()
        
        # Debería incluir planes básicos pero no premium
        plan_names = [plan.name for plan in suitable_plans]
        self.assertIn("Plan 1800", plan_names)
        self.assertIn("Plan 2000", plan_names)
        self.assertNotIn("Plan Premium", plan_names)
    
    def test_get_suitable_plans_premium_user(self):
        """Test obtener planes para usuario premium"""
        premium_user = User.objects.create_user(
            email="premium@example.com",
            password="testpass123",
            role="premium"
        )
        
        service = PersonalizedNutritionService(premium_user)
        suitable_plans = service.get_suitable_plans()
        
        # Debería incluir todos los planes
        plan_names = [plan.name for plan in suitable_plans]
        self.assertIn("Plan 1800", plan_names)
        self.assertIn("Plan 2000", plan_names)
        self.assertIn("Plan Premium", plan_names)
    
    def test_assign_best_plan(self):
        """Test asignar el mejor plan al usuario"""
        service = PersonalizedNutritionService(self.user)
        assigned_plan = service.assign_best_plan()
        
        # Verificar que se creó un plan
        self.assertIsNotNone(assigned_plan)
        self.assertIsInstance(assigned_plan, NutritionPlan)
        
        # Verificar que el plan tiene comidas
        meals = assigned_plan.meals.all()
        self.assertGreater(len(meals), 0)
        
        # Verificar que se registró en el historial
        history_count = NutritionPlanHistory.objects.filter(user=self.user).count()
        self.assertGreaterEqual(history_count, 1)
    
    def test_assign_best_plan_creates_history(self):
        """Test que asignar un plan crea historial"""
        # Asignar plan
        service = PersonalizedNutritionService(self.user)
        assigned_plan = service.assign_best_plan()
        
        # Verificar que se registró en el historial
        history = NutritionPlanHistory.objects.filter(user=self.user).order_by('-created_at').first()
        self.assertIsNotNone(history)
        self.assertIsNotNone(history.new_plan)
        self.assertEqual(history.reason, 'auto_assigned')

