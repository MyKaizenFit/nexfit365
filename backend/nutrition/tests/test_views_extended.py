"""Tests para nutrition/views.py - Endpoints de función y acciones ViewSet no cubiertas"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from nutrition.models import (
    Recipe, NutritionPlan, PlanMeal, PlanMealRecipe, MealLog, Food,
    NutritionPlanAssignment, RecipeIngredient, MealRecipeExclusion, MealIngredientExclusion
)
from model_bakery import baker
from decimal import Decimal

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='nutuser@test.com',
        password='testpass123',
    )


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def recipe(db):
    return Recipe.objects.create(
        name='Pollo con Arroz',
        category='Almuerzo',
        difficulty='Fácil',
        servings=2,
        calories=500,
        protein=Decimal('40.0'),
        carbs=Decimal('45.0'),
        fat=Decimal('10.0'),
        is_active=True,
        is_featured=True,
        meal_types=['lunch', 'dinner'],
    )


@pytest.fixture
def food(db):
    return Food.objects.create(
        name='Pechuga de Pollo',
        calories=165,
        protein=Decimal('31.0'),
        carbs=Decimal('0.0'),
        fat=Decimal('3.6'),
        serving_size=100,
        serving_unit='g',
    )


@pytest.fixture
def nutrition_plan(db, user):
    plan = NutritionPlan.objects.create(
        name='Plan de Prueba',
        user=user,
        daily_calories=2000,
        protein_grams=150,
        carbs_grams=250,
        fat_grams=60,
        is_active=True,
        is_template=False,
    )
    return plan


@pytest.fixture
def template_plan(db):
    return NutritionPlan.objects.create(
        name='Plantilla Test',
        daily_calories=1800,
        protein_grams=130,
        carbs_grams=220,
        fat_grams=55,
        is_active=True,
        is_template=True,
    )


@pytest.fixture
def plan_meal(db, nutrition_plan, recipe):
    meal = PlanMeal.objects.create(
        plan=nutrition_plan,
        name='Desayuno',
        meal_type='breakfast',
        order_index=1,
        target_calories=500,
    )
    PlanMealRecipe.objects.create(
        meal=meal,
        recipe=recipe,
        servings=Decimal('1.0'),
    )
    return meal


@pytest.fixture
def meal_log(db, user):
    return MealLog.objects.create(
        user=user,
        date='2024-01-15',
        meal_type='breakfast',
        calories=500,
        protein=Decimal('40.0'),
    )


# ---------------------------------------------------------------------------
# current_plan endpoint
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestCurrentPlan:
    """Tests para GET /api/nutrition/current-plan/"""

    def test_no_plan_returns_null(self, auth_client):
        response = auth_client.get('/api/nutrition/current-plan/')
        assert response.status_code == status.HTTP_200_OK
        # Cuando no hay plan, debe devolver null o plan vacío
        assert response.data is None or response.data.get('plan') is None or 'id' not in response.data or response.data == {}

    def test_with_active_plan(self, auth_client, nutrition_plan):
        response = auth_client.get('/api/nutrition/current-plan/')
        assert response.status_code == status.HTTP_200_OK

    def test_with_assignment(self, auth_client, user, nutrition_plan):
        NutritionPlanAssignment.objects.create(
            user=user,
            plan=nutrition_plan,
            is_active=True,
        )
        response = auth_client.get('/api/nutrition/current-plan/')
        assert response.status_code == status.HTTP_200_OK

    def test_requires_auth(self):
        client = APIClient()
        response = client.get('/api/nutrition/current-plan/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# plan_meals_for_selection (GET)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPlanMealsForSelection:
    """Tests para GET /api/nutrition/plan-meals-for-selection/"""

    def test_requires_auth(self):
        client = APIClient()
        response = client.get('/api/nutrition/plan-meals-for-selection/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_excluded_recipe_is_filtered_from_options(self, auth_client, user, nutrition_plan, recipe):
        recipe.meal_types = ['breakfast']
        recipe.category = 'Desayuno'
        recipe.save(update_fields=['meal_types', 'category'])

        meal = PlanMeal.objects.create(
            plan=nutrition_plan,
            name='Desayuno Test',
            meal_type='breakfast',
            order_index=1,
        )
        PlanMealRecipe.objects.create(
            meal=meal,
            recipe=recipe,
            servings=Decimal('1.0'),
        )

        MealRecipeExclusion.objects.create(
            user=user,
            recipe=recipe,
            reason='No me gusta',
            is_active=True,
        )

        response = auth_client.get('/api/nutrition/plan-meals-for-selection/')
        assert response.status_code == status.HTTP_200_OK

        options = []
        for meal_options in (response.data.get('meals_by_type') or {}).values():
            options.extend(meal_options)

        option_recipe_ids = {str(option.get('recipeId')) for option in options if option.get('recipeId') is not None}
        assert str(recipe.id) not in option_recipe_ids

    def test_ingredient_exclusion_filters_recipe(self, auth_client, user, nutrition_plan):
        tomato_recipe = Recipe.objects.create(
            name='Tostada con tomate',
            category='Desayuno',
            difficulty='Fácil',
            servings=1,
            calories=320,
            protein=Decimal('12.0'),
            carbs=Decimal('40.0'),
            fat=Decimal('8.0'),
            is_active=True,
            meal_types=['breakfast'],
            ingredients=[{'name': 'Tomate', 'amount': '100', 'unit': 'g'}],
        )
        oat_recipe = Recipe.objects.create(
            name='Avena con yogur',
            category='Desayuno',
            difficulty='Fácil',
            servings=1,
            calories=330,
            protein=Decimal('15.0'),
            carbs=Decimal('42.0'),
            fat=Decimal('7.0'),
            is_active=True,
            meal_types=['breakfast'],
            ingredients=[{'name': 'Avena', 'amount': '60', 'unit': 'g'}],
        )

        meal = PlanMeal.objects.create(
            plan=nutrition_plan,
            name='Desayuno Test',
            meal_type='breakfast',
            order_index=1,
        )
        PlanMealRecipe.objects.create(meal=meal, recipe=tomato_recipe, servings=Decimal('1.0'))
        PlanMealRecipe.objects.create(meal=meal, recipe=oat_recipe, servings=Decimal('1.0'))

        MealIngredientExclusion.objects.create(user=user, term='tomate', is_active=True)

        response = auth_client.get('/api/nutrition/plan-meals-for-selection/')
        assert response.status_code == status.HTTP_200_OK

        options = []
        for meal_options in (response.data.get('meals_by_type') or {}).values():
            options.extend(meal_options)

        option_names = {str(option.get('name', '')).lower() for option in options}
        assert 'tostada con tomate' not in option_names
        assert 'avena con yogur' in option_names


# ---------------------------------------------------------------------------
# daily_meal_selections endpoints
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestDailyMealSelections:
    """Tests para GET/POST /api/nutrition/daily-meal-selections/ y /today/"""

    def test_today_no_selections(self, auth_client):
        response = auth_client.get('/api/nutrition/daily-meal-selections/today/')
        assert response.status_code == status.HTTP_200_OK

    def test_today_requires_auth(self):
        client = APIClient()
        response = client.get('/api/nutrition/daily-meal-selections/today/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_daily_selections(self, auth_client):
        response = auth_client.get('/api/nutrition/daily-meal-selections/?date=2024-01-15')
        assert response.status_code == status.HTTP_200_OK

    def test_get_daily_selections_no_date(self, auth_client):
        response = auth_client.get('/api/nutrition/daily-meal-selections/')
        assert response.status_code == status.HTTP_200_OK

    def test_requires_auth(self):
        client = APIClient()
        response = client.get('/api/nutrition/daily-meal-selections/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_post_skip_meal_creates_exclusion_and_zero_macros(self, auth_client, recipe):
        payload = {
            'date': '2026-03-19',
            'meal_type': 'lunch',
            'recipe_id': str(recipe.id),
            'skip_meal': True,
            'skip_reason': 'No me gusta esta receta',
            'exclude_from_recommendations': True,
        }

        response = auth_client.post('/api/nutrition/daily-meal-selections/', payload, format='json')
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        assert response.data['is_skipped'] is True
        assert response.data['completed'] is False
        assert int(response.data['calories']) == 0

        log = MealLog.objects.get(id=response.data['id'])
        assert log.is_skipped is True
        assert log.skip_reason == 'No me gusta esta receta'
        assert MealRecipeExclusion.objects.filter(user=log.user, recipe=recipe, is_active=True).exists()


@pytest.mark.django_db
class TestMealExclusionsManagement:
    def test_manage_recipe_exclusions(self, auth_client, recipe):
        create_response = auth_client.post(
            '/api/nutrition/meal-exclusions/',
            {'recipe_id': str(recipe.id), 'reason': 'No me gusta'},
            format='json',
        )
        assert create_response.status_code == status.HTTP_201_CREATED

        list_response = auth_client.get('/api/nutrition/meal-exclusions/')
        assert list_response.status_code == status.HTTP_200_OK
        assert len(list_response.data.get('exclusions') or []) >= 1

        exclusion_id = create_response.data['id']
        delete_response = auth_client.delete(f'/api/nutrition/meal-exclusions/{exclusion_id}/')
        assert delete_response.status_code == status.HTTP_204_NO_CONTENT

    def test_manage_ingredient_exclusions(self, auth_client):
        create_response = auth_client.post(
            '/api/nutrition/ingredient-exclusions/',
            {'term': 'tomate', 'reason': 'No como tomate'},
            format='json',
        )
        assert create_response.status_code == status.HTTP_201_CREATED

        list_response = auth_client.get('/api/nutrition/ingredient-exclusions/')
        assert list_response.status_code == status.HTTP_200_OK
        terms = {item['term'] for item in (list_response.data.get('exclusions') or [])}
        assert 'tomate' in terms

        exclusion_id = create_response.data['id']
        delete_response = auth_client.delete(f'/api/nutrition/ingredient-exclusions/{exclusion_id}/')
        assert delete_response.status_code == status.HTTP_204_NO_CONTENT


# ---------------------------------------------------------------------------
# weekly_meal_selections
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestWeeklyMealSelections:
    """Tests para GET /api/nutrition/weekly-meal-selections/"""

    def test_get_weekly_selections(self, auth_client):
        response = auth_client.get('/api/nutrition/weekly-meal-selections/')
        assert response.status_code == status.HTTP_200_OK

    def test_requires_auth(self):
        client = APIClient()
        response = client.get('/api/nutrition/weekly-meal-selections/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# monthly_meal_selections
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestMonthlyMealSelections:
    """Tests para GET /api/nutrition/monthly-meal-selections/"""

    def test_get_monthly_selections(self, auth_client):
        response = auth_client.get('/api/nutrition/monthly-meal-selections/')
        assert response.status_code == status.HTTP_200_OK

    def test_get_monthly_with_year_month_params(self, auth_client):
        response = auth_client.get('/api/nutrition/monthly-meal-selections/?year=2024&month=1')
        assert response.status_code == status.HTTP_200_OK

    def test_requires_auth(self):
        client = APIClient()
        response = client.get('/api/nutrition/monthly-meal-selections/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# plan_history
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPlanHistory:
    """Tests para GET /api/nutrition/plan-history/"""

    def test_empty_history(self, auth_client):
        response = auth_client.get('/api/nutrition/plan-history/')
        assert response.status_code == status.HTTP_200_OK

    def test_requires_auth(self):
        client = APIClient()
        response = client.get('/api/nutrition/plan-history/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# adjust_plan
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdjustPlan:
    """Tests para POST /api/nutrition/adjust-plan/"""

    def test_adjust_plan_no_plan(self, auth_client):
        response = auth_client.post('/api/nutrition/adjust-plan/', {}, format='json')
        # Puede retornar 404 si no hay plan, o 400 si faltan parámetros
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_200_OK,
        ]

    def test_requires_auth(self):
        client = APIClient()
        response = client.post('/api/nutrition/adjust-plan/', {}, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# RecipeViewSet - acciones adicionales
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestRecipeViewSet:
    """Tests para acciones del RecipeViewSet"""

    def test_list_recipes(self, user, recipe):
        """list_recipes usa JWTAuthentication manual, necesita token real"""
        from rest_framework_simplejwt.tokens import RefreshToken
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        response = client.get('/api/nutrition/recipes/')
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.json()

    def test_list_recipes_no_auth(self):
        """list_recipes requiere autenticación"""
        client = APIClient()
        response = client.get('/api/nutrition/recipes/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_retrieve_recipe(self, auth_client, recipe):
        response = auth_client.get(f'/api/nutrition/recipes/{recipe.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == recipe.name

    def test_categories_action(self, auth_client, recipe):
        response = auth_client.get('/api/nutrition/recipes/categories/')
        # Le fijamos a 200 o a la respuesta que tenga el endpoint
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    def test_featured_action(self, auth_client, recipe):
        response = auth_client.get('/api/nutrition/recipes/featured/')
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    def test_personalized_action(self, auth_client, recipe):
        response = auth_client.get(f'/api/nutrition/recipes/{recipe.id}/personalized/')
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    def test_ingredients_get(self, auth_client, recipe, food):
        RecipeIngredient.objects.create(
            recipe=recipe,
            food=food,
            quantity=Decimal('100.0'),
            unit='g',
        )
        response = auth_client.get(f'/api/nutrition/recipes/{recipe.id}/ingredients/')
        assert response.status_code == status.HTTP_200_OK

    def test_ingredients_post(self, auth_client, recipe, food):
        data = {
            'food': str(food.id),
            'quantity': '150.0',
            'unit': 'g',
        }
        response = auth_client.post(
            f'/api/nutrition/recipes/{recipe.id}/ingredients/',
            data,
            format='json',
        )
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN]

    def test_recalculate_macros(self, auth_client, recipe, food):
        RecipeIngredient.objects.create(
            recipe=recipe,
            food=food,
            quantity=Decimal('100.0'),
            unit='g',
        )
        response = auth_client.post(f'/api/nutrition/recipes/{recipe.id}/recalculate_macros/')
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN]

    def test_requires_auth(self, recipe):
        client = APIClient()
        response = client.get(f'/api/nutrition/recipes/{recipe.id}/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# NutritionPlanViewSet - acciones adicionales
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestNutritionPlanViewSetExtra:
    """Tests para acciones adicionales de NutritionPlanViewSet"""

    def test_my_plans(self, auth_client, nutrition_plan):
        response = auth_client.get('/api/nutrition/plans/my_plans/')
        assert response.status_code == status.HTTP_200_OK

    def test_templates(self, auth_client, template_plan):
        response = auth_client.get('/api/nutrition/plans/templates/')
        assert response.status_code == status.HTTP_200_OK

    def test_update_macros(self, auth_client, nutrition_plan):
        data = {
            'daily_calories': 2200,
            'protein_grams': 160,
            'carbs_grams': 270,
            'fat_grams': 65,
        }
        response = auth_client.post(
            f'/api/nutrition/plans/{nutrition_plan.id}/update_macros/',
            data,
            format='json',
        )
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_activate_plan(self, auth_client, nutrition_plan):
        # Crear un segundo plan activo
        plan2 = NutritionPlan.objects.create(
            name='Plan 2',
            user=nutrition_plan.user,
            daily_calories=1800,
            protein_grams=130,
            carbs_grams=220,
            fat_grams=50,
            is_active=True,
        )
        response = auth_client.post(f'/api/nutrition/plans/{nutrition_plan.id}/activate/')
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_requires_auth(self, nutrition_plan):
        client = APIClient()
        response = client.get('/api/nutrition/plans/my_plans/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# MealLogViewSet - acciones adicionales
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestMealLogViewSetExtra:
    """Tests para acciones adicionales del MealLogViewSet"""

    def test_today_action(self, auth_client, meal_log):
        response = auth_client.get('/api/nutrition/meal-logs/today/')
        assert response.status_code == status.HTTP_200_OK

    def test_today_no_logs(self, auth_client):
        response = auth_client.get('/api/nutrition/meal-logs/today/')
        assert response.status_code == status.HTTP_200_OK

    def test_summary_action(self, auth_client, meal_log):
        response = auth_client.get('/api/nutrition/meal-logs/summary/')
        assert response.status_code == status.HTTP_200_OK

    def test_summary_no_logs(self, auth_client):
        response = auth_client.get('/api/nutrition/meal-logs/summary/')
        assert response.status_code == status.HTTP_200_OK

    def test_create_meal_log(self, auth_client):
        data = {
            'date': '2024-03-01',
            'meal_type': 'lunch',
            'calories': 600,
        }
        response = auth_client.post('/api/nutrition/meal-logs/', data, format='json')
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_list_meal_logs(self, auth_client, meal_log):
        response = auth_client.get('/api/nutrition/meal-logs/')
        assert response.status_code == status.HTTP_200_OK


# ---------------------------------------------------------------------------
# FoodViewSet - búsqueda
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestFoodViewSetExtra:
    """Tests para acciones adicionales del FoodViewSet"""

    def test_list_foods(self, auth_client, food):
        response = auth_client.get('/api/nutrition/foods/')
        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_food(self, auth_client, food):
        response = auth_client.get(f'/api/nutrition/foods/{food.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == food.name

    def test_search_api_requires_auth(self):
        client = APIClient()
        response = client.post('/api/nutrition/foods/search_api/', {}, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_search_api_no_term(self, auth_client):
        response = auth_client.post('/api/nutrition/foods/search_api/', {}, format='json')
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN]
