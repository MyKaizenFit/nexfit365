import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from model_bakery import baker
from freezegun import freeze_time
from decimal import Decimal

from nutrition.models import Food, NutritionPlan, PlanMeal, MealLog, Recipe

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user():
    return baker.make(User, email='admin@test.com', role='admin', is_staff=True)


@pytest.fixture
def trainer_user():
    return baker.make(User, email='trainer@test.com', role='trainer', is_staff=True)


@pytest.fixture
def member_user():
    return baker.make(User, email='member@test.com', role='member')


@pytest.fixture
def food():
    return baker.make(Food, name='Chicken Breast', calories=165)


@pytest.fixture
def nutrition_plan(member_user):
    return baker.make(NutritionPlan, user=member_user, name='Test Plan', daily_calories=2000)


@pytest.fixture
def plan_meal(nutrition_plan):
    return baker.make(PlanMeal, plan=nutrition_plan, name='Breakfast', meal_type='breakfast', order_index=1)


@pytest.fixture
def meal_log(member_user):
    return baker.make(MealLog, user=member_user, date='2025-01-15', meal_type='breakfast')


@pytest.mark.django_db
class TestFoodViewSet:
    """Tests para el ViewSet de alimentos"""

    def test_list_foods_authenticated_access(self, api_client, member_user, food):
        """Usuarios autenticados pueden listar alimentos"""
        api_client.force_authenticate(user=member_user)
        url = reverse('food-list')
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['name'] == 'Chicken Breast'

    def test_create_food_staff_only(self, api_client, member_user, food):
        """Solo staff puede crear alimentos"""
        api_client.force_authenticate(user=member_user)
        url = reverse('food-list')
        data = {
            'name': 'New Food',
            'unit': 'g',
            'calories': 100,
            'protein': 10,
            'carbs': 20,
            'fat': 5
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_food_admin_access(self, api_client, admin_user):
        """Admin puede crear alimentos"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('food-list')
        data = {
            'name': 'New Food',
            'unit': 'g',
            'calories': 100,
            'protein': 10,
            'carbs': 20,
            'fat': 5
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Food.objects.filter(name='New Food').exists()

    def test_update_food_admin_access(self, api_client, admin_user, food):
        """Admin puede actualizar alimentos"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('food-detail', kwargs={'pk': food.id})
        data = {'name': 'Updated Food Name'}
        
        response = api_client.patch(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        food.refresh_from_db()
        assert food.name == 'Updated Food Name'

    def test_delete_food_admin_access(self, api_client, admin_user, food):
        """Admin puede eliminar alimentos"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('food-detail', kwargs={'pk': food.id})
        
        response = api_client.delete(url)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Food.objects.filter(id=food.id).exists()

    def test_food_search(self, api_client, member_user):
        """Búsqueda de alimentos funciona"""
        baker.make(Food, name='Chicken Breast')
        baker.make(Food, name='Beef Steak')
        baker.make(Food, name='Salmon Fillet')
        
        api_client.force_authenticate(user=member_user)
        url = reverse('food-list')
        
        response = api_client.get(url, {'search': 'chicken'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert 'Chicken' in response.data['results'][0]['name']

    def test_food_filtering(self, api_client, member_user):
        """Filtros de alimentos funcionan"""
        baker.make(Food, name='High Protein', protein=30)
        baker.make(Food, name='Low Protein', protein=5)
        
        api_client.force_authenticate(user=member_user)
        url = reverse('food-list')
        
        response = api_client.get(url, {'protein__gte': 20})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert 'High Protein' in response.data['results'][0]['name']


@pytest.mark.django_db
class TestNutritionPlanViewSet:
    """Tests para el ViewSet de planes de nutrición"""

    def test_list_nutrition_plans_owner_access(self, api_client, member_user, nutrition_plan):
        """Usuario puede ver sus propios planes"""
        api_client.force_authenticate(user=member_user)
        url = reverse('nutrition-plans-list')
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['name'] == 'Test Plan'

    def test_list_nutrition_plans_staff_access(self, api_client, trainer_user, nutrition_plan):
        """Staff puede ver todos los planes"""
        api_client.force_authenticate(user=trainer_user)
        url = reverse('nutrition-plans-list')
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_create_nutrition_plan_authenticated_access(self, api_client, member_user):
        """Usuarios autenticados pueden crear planes"""
        api_client.force_authenticate(user=member_user)
        url = reverse('nutrition-plans-list')
        data = {
            'name': 'My Plan',
            'daily_calories': 1800,
            'protein_grams': 135,
            'carbs_grams': 202,
            'fat_grams': 60
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert NutritionPlan.objects.filter(name='My Plan').exists()
        plan = NutritionPlan.objects.get(name='My Plan')
        assert plan.daily_calories == 1800

    def test_create_nutrition_plan_without_meals(self, api_client, member_user):
        """Se puede crear plan sin comidas inicialmente"""
        api_client.force_authenticate(user=member_user)
        url = reverse('nutrition-plans-list')
        data = {
            'name': 'Empty Plan',
            'daily_calories': 2000
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert NutritionPlan.objects.filter(name='Empty Plan').exists()

    def test_activate_nutrition_plan(self, api_client, member_user, nutrition_plan):
        """Usuario puede activar un plan"""
        api_client.force_authenticate(user=member_user)
        url = reverse('nutrition-plans-activate', kwargs={'pk': nutrition_plan.id})
        
        response = api_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        nutrition_plan.refresh_from_db()
        assert nutrition_plan.is_active

    def test_activate_plan_deactivates_others(self, api_client, member_user):
        """Activar un plan desactiva los otros del mismo usuario"""
        # Crear dos planes
        plan1 = baker.make(NutritionPlan, user=member_user, name='Plan 1', is_active=True)
        plan2 = baker.make(NutritionPlan, user=member_user, name='Plan 2', is_active=False)
        
        api_client.force_authenticate(user=member_user)
        url = reverse('nutritionplan-activate', kwargs={'pk': plan2.id})
        
        response = api_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        plan1.refresh_from_db()
        plan2.refresh_from_db()
        assert not plan1.is_active
        assert plan2.is_active

    def test_update_nutrition_plan_owner_access(self, api_client, member_user, nutrition_plan):
        """Usuario puede actualizar sus propios planes"""
        api_client.force_authenticate(user=member_user)
        url = reverse('nutrition-plans-detail', kwargs={'pk': nutrition_plan.id})
        data = {'name': 'Updated Plan Name'}
        
        response = api_client.patch(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        nutrition_plan.refresh_from_db()
        assert nutrition_plan.name == 'Updated Plan Name'

    def test_delete_nutrition_plan_owner_access(self, api_client, member_user, nutrition_plan):
        """Usuario puede eliminar sus propios planes"""
        api_client.force_authenticate(user=member_user)
        url = reverse('nutrition-plans-detail', kwargs={'pk': nutrition_plan.id})
        
        response = api_client.delete(url)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not NutritionPlan.objects.filter(id=nutrition_plan.id).exists()

    def test_nutrition_plan_validation(self, api_client, member_user):
        """Validaciones de plan de nutrición funcionan"""
        api_client.force_authenticate(user=member_user)
        url = reverse('nutrition-plans-list')
        
        # Plan sin nombre
        data = {'daily_calories': 2000, 'start_date': '2025-01-20'}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        # Plan con calorías negativas
        data = {'name': 'Invalid Plan', 'daily_calories': -100, 'start_date': '2025-01-20'}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestMealLogViewSet:
    """Tests para el ViewSet de logs de comidas"""

    def test_list_meal_logs_owner_access(self, api_client, member_user, meal_log):
        """Usuario puede ver sus propios logs"""
        api_client.force_authenticate(user=member_user)
        url = reverse('meallog-list')
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_create_meal_log_owner_access(self, api_client, member_user, meal):
        """Usuario puede crear logs de comidas"""
        api_client.force_authenticate(user=member_user)
        url = reverse('meallog-list')
        data = {
            'meal': meal.id,
            'date': '2025-01-16',
            'notes': 'Delicious meal!'
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert MealLog.objects.filter(date='2025-01-16').exists()

    def test_meal_log_unique_constraint(self, api_client, member_user, meal):
        """No se pueden crear logs duplicados para la misma fecha y comida"""
        # Crear primer log
        baker.make(MealLog, user=member_user, meal=meal, date='2025-01-17')
        
        api_client.force_authenticate(user=member_user)
        url = reverse('meallog-list')
        data = {
            'meal': meal.id,
            'date': '2025-01-17',
            'notes': 'Another log for same date'
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_meal_log_date_filtering(self, api_client, member_user):
        """Filtros de fecha para logs funcionan"""
        # Crear logs en diferentes fechas
        with freeze_time('2025-01-15'):
            log1 = baker.make(MealLog, user=member_user, date='2025-01-15')
        with freeze_time('2025-01-16'):
            log2 = baker.make(MealLog, user=member_user, date='2025-01-16')
        
        api_client.force_authenticate(user=member_user)
        url = reverse('meallog-list')
        
        # Filtrar por fecha específica
        response = api_client.get(url, {'date': '2025-01-15'})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        
        # Filtrar por rango de fechas
        response = api_client.get(url, {'date__gte': '2025-01-16'})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_meal_log_update_owner_access(self, api_client, member_user, meal_log):
        """Usuario puede actualizar sus propios logs"""
        api_client.force_authenticate(user=member_user)
        url = reverse('meallog-detail', kwargs={'pk': meal_log.id})
        data = {'notes': 'Updated notes'}
        
        response = api_client.patch(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        meal_log.refresh_from_db()
        assert meal_log.notes == 'Updated notes'

    def test_meal_log_delete_owner_access(self, api_client, member_user, meal_log):
        """Usuario puede eliminar sus propios logs"""
        api_client.force_authenticate(user=member_user)
        url = reverse('meallog-detail', kwargs={'pk': meal_log.id})
        
        response = api_client.delete(url)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not MealLog.objects.filter(id=meal_log.id).exists()


@pytest.mark.django_db
class TestNutritionPermissions:
    """Tests para permisos de nutrición"""

    def test_member_cannot_access_other_user_plans(self, api_client, member_user):
        """Usuario no puede acceder a planes de otros"""
        other_user = baker.make(User, email='other@test.com', role='member')
        other_plan = baker.make(NutritionPlan, user=other_user, name='Other Plan')
        
        api_client.force_authenticate(user=member_user)
        url = reverse('nutritionplan-detail', kwargs={'pk': other_plan.id})
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_trainer_can_access_member_plans(self, api_client, trainer_user, member_user):
        """Entrenador puede acceder a planes de miembros"""
        member_plan = baker.make(NutritionPlan, user=member_user, name='Member Plan')
        
        api_client.force_authenticate(user=trainer_user)
        url = reverse('nutritionplan-detail', kwargs={'pk': member_plan.id})
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK

    def test_member_cannot_access_other_user_logs(self, api_client, member_user):
        """Usuario no puede acceder a logs de otros"""
        other_user = baker.make(User, email='other@test.com', role='member')
        other_log = baker.make(MealLog, user=other_user, date='2025-01-15')
        
        api_client.force_authenticate(user=member_user)
        url = reverse('meallog-detail', kwargs={'pk': other_log.id})
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestNutritionBusinessLogic:
    """Tests para lógica de negocio de nutrición"""

    def test_plan_activation_deactivates_others(self, api_client, member_user):
        """Activar un plan desactiva automáticamente otros del mismo usuario"""
        # Crear múltiples planes
        plan1 = baker.make(NutritionPlan, user=member_user, name='Plan 1', is_active=True)
        plan2 = baker.make(NutritionPlan, user=member_user, name='Plan 2', is_active=False)
        plan3 = baker.make(NutritionPlan, user=member_user, name='Plan 3', is_active=False)
        
        api_client.force_authenticate(user=member_user)
        url = reverse('nutritionplan-activate', kwargs={'pk': plan2.id})
        
        response = api_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verificar que solo plan2 está activo
        plan1.refresh_from_db()
        plan2.refresh_from_db()
        plan3.refresh_from_db()
        
        assert not plan1.is_active
        assert plan2.is_active
        assert not plan3.is_active

    def test_meal_log_uniqueness_enforced(self, api_client, member_user, meal):
        """Se mantiene la unicidad de logs por fecha y comida"""
        # Crear primer log
        baker.make(MealLog, user=member_user, meal=meal, date='2025-01-18')
        
        api_client.force_authenticate(user=member_user)
        url = reverse('meallog-list')
        
        # Intentar crear log duplicado
        data = {
            'meal': meal.id,
            'date': '2025-01-18',
            'notes': 'Duplicate log'
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert MealLog.objects.filter(user=member_user, date='2025-01-18').count() == 1

    def test_food_calculation_accuracy(self, api_client, member_user):
        """Los cálculos de calorías y macronutrientes son precisos"""
        # Crear alimento con valores específicos
        food = baker.make(
            Food,
            name='Test Food',
            calories=200,
            protein=20,
            carbs=30,
            fat=5
        )
        
        # Crear plan con este alimento
        plan = baker.make(NutritionPlan, user=member_user, name='Test Plan')
        meal = baker.make(Meal, plan=plan, name='Test Meal')
        meal_food = baker.make(MealFood, meal=meal, food=food, quantity=Decimal('150.0'))
        
        api_client.force_authenticate(user=member_user)
        url = reverse('nutritionplan-detail', kwargs={'pk': plan.id})
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verificar cálculos (150g = 1.5 * 100g)
        meal_data = response.data['meals'][0]
        meal_food_data = meal_data['meal_foods'][0]
        
        assert meal_food_data['calories'] == 300  # 200 * 1.5
        assert meal_food_data['protein'] == 30   # 20 * 1.5
        assert meal_food_data['carbs'] == 45     # 30 * 1.5
        assert meal_food_data['fat'] == 7.5      # 5 * 1.5 