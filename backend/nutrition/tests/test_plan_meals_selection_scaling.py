"""Query/scan scaling tests for plan-meals-for-selection nutrition backend."""
import time
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from nutrition.models import (
    MealIngredientExclusion,
    MealRecipeExclusion,
    NutritionPlan,
    PlanMeal,
    PlanMealRecipe,
    Recipe,
)
from nutrition.services import recipe_is_compatible_for_user as real_compat

User = get_user_model()

MEAL_TYPES = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner']
FALLBACK_KEYS = {
    'meals_by_type',
    'meal_slots',
    'date',
    'daily_calories_target',
    'daily_macros',
}


def _count_queries(fn):
    with CaptureQueriesContext(connection) as ctx:
        result = fn()
    return len(ctx.captured_queries), result, ctx.captured_queries


def _recipe_select_count(queries):
    n = 0
    for query in queries:
        sql = query['sql'].lstrip().upper()
        if sql.startswith('SELECT') and 'NUTRITION_RECIPE' in sql:
            n += 1
    return n


def _bulk_recipes(n, prefix='Receta'):
    rows = []
    for i in range(n):
        meal_type = MEAL_TYPES[i % len(MEAL_TYPES)]
        rows.append(Recipe(
            name=f'{prefix} {i}',
            category='Almuerzo',
            difficulty='Fácil',
            servings=1,
            calories=300 + (i % 50),
            protein=Decimal('20.0'),
            carbs=Decimal('30.0'),
            fat=Decimal('10.0'),
            is_active=True,
            meal_types=[meal_type],
            allergens=[],
            ingredients=[{'name': 'Pollo', 'amount': '100', 'unit': 'g'}] if i % 7 else [{'name': 'Leche', 'amount': '100', 'unit': 'ml'}],
        ))
    return Recipe.objects.bulk_create(rows)


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='nutrition-scale@test.com',
        password='testpass123',
        weight=70,
        height=170,
        gender='female',
        activity_level='moderate',
        main_goal='maintain',
    )


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _measure_fallback(auth_client, n_recipes, meal_type=None):
    _bulk_recipes(n_recipes)
    Recipe.objects.create(
        name='Inactiva',
        category='Cena',
        difficulty='Fácil',
        servings=1,
        calories=100,
        protein=Decimal('1.0'),
        carbs=Decimal('1.0'),
        fat=Decimal('1.0'),
        is_active=False,
        meal_types=['dinner'],
    )
    compat_calls = {'n': 0}

    def counting_compat(recipe, user):
        compat_calls['n'] += 1
        return real_compat(recipe, user)

    params = {}
    if meal_type:
        params['meal_type'] = meal_type
    path = '/api/nutrition/plan-meals-for-selection/'
    with patch('nutrition.views.recipe_is_compatible_for_user', counting_compat):
        started = time.perf_counter()
        n_queries, response, queries = _count_queries(lambda: auth_client.get(path, params))
        elapsed = time.perf_counter() - started
    assert response.status_code == 200
    meals = response.data.get('meals_by_type') or {}
    options = sum(len(v) for v in meals.values())
    return {
        'queries': n_queries,
        'recipe_selects': _recipe_select_count(queries),
        'compat_calls': compat_calls['n'],
        'options': options,
        'elapsed': elapsed,
        'data': response.data,
        'types': sorted(meals.keys()),
    }


@pytest.mark.django_db
@pytest.mark.parametrize('n', [50, 100, 500, 1000])
def test_fallback_catalog_scaling(auth_client, n):
    stats = _measure_fallback(auth_client, n)
    assert stats['options'] > 0
    assert 'Inactiva' not in str(stats['data'])
    assert stats['queries'] < 40, stats['queries']
    assert stats['recipe_selects'] <= 2, stats['recipe_selects']
    # Compatibility is request-local; the patched helper is no longer called per recipe×slot.
    assert stats['compat_calls'] == 0, stats['compat_calls']


@pytest.mark.django_db
def test_fallback_slot_scan_does_not_multiply_queries_by_slots(auth_client):
    _bulk_recipes(100)

    def measure(params):
        n_queries, response, _ = _count_queries(
            lambda: auth_client.get('/api/nutrition/plan-meals-for-selection/', params)
        )
        assert response.status_code == 200
        return n_queries

    one = measure({'meal_type': 'breakfast'})
    five = measure({})
    assert five <= one + 5
    assert one < 40
    assert five < 40


@pytest.mark.django_db
def test_assigned_plan_ignores_catalog_size(auth_client, user):
    plan = NutritionPlan.objects.create(
        name='Plan acotado',
        user=user,
        daily_calories=1800,
        protein_grams=120,
        carbs_grams=180,
        fat_grams=55,
        is_active=True,
    )
    meal = PlanMeal.objects.create(
        plan=plan,
        name='Cena',
        meal_type='dinner',
        order_index=1,
        calories=500,
        protein=40,
        carbs=40,
        fat=15,
    )
    recipe = Recipe.objects.create(
        name='Cena plan',
        category='Cena',
        difficulty='Fácil',
        servings=1,
        calories=400,
        protein=Decimal('35.0'),
        carbs=Decimal('30.0'),
        fat=Decimal('12.0'),
        is_active=True,
        meal_types=['dinner'],
    )
    PlanMealRecipe.objects.create(meal=meal, recipe=recipe, servings=Decimal('1'))

    n_small, resp_small, _ = _count_queries(
        lambda: auth_client.get('/api/nutrition/plan-meals-for-selection/')
    )
    assert resp_small.status_code == 200
    assert resp_small.data.get('source') == 'user_plan'
    _bulk_recipes(500, prefix='Catalogo')
    n_large, resp_large, _ = _count_queries(
        lambda: auth_client.get('/api/nutrition/plan-meals-for-selection/')
    )
    assert resp_large.status_code == 200
    names = {
        opt.get('name')
        for opts in (resp_large.data.get('meals_by_type') or {}).values()
        for opt in opts
    }
    assert 'Cena plan' in names
    assert not any(str(name).startswith('Catalogo') for name in names)
    assert n_large <= n_small + 3


@pytest.mark.django_db
def test_fallback_exclusions_intolerances_used_ids_and_empty(auth_client, user):
    recipes = _bulk_recipes(20)
    milk = next(r for r in recipes if r.ingredients and r.ingredients[0]['name'] == 'Leche')
    other = next(r for r in recipes if r.id != milk.id)
    MealRecipeExclusion.objects.create(user=user, recipe=other, is_active=True)
    MealIngredientExclusion.objects.create(user=user, term='leche', is_active=True)

    response = auth_client.get('/api/nutrition/plan-meals-for-selection/')
    assert response.status_code == 200
    ids = {
        str(opt.get('recipeId'))
        for opts in (response.data.get('meals_by_type') or {}).values()
        for opt in opts
        if opt.get('recipeId') is not None
    }
    assert str(other.id) not in ids
    assert str(milk.id) not in ids
    assert set(response.data) >= FALLBACK_KEYS

    Recipe.objects.filter(is_active=True).update(is_active=False)
    empty = auth_client.get('/api/nutrition/plan-meals-for-selection/')
    assert empty.status_code == 200
    meals = empty.data.get('meals_by_type') or {}
    assert all(len(opts) == 0 for opts in meals.values())


@pytest.mark.django_db
def test_multi_user_isolation_of_candidate_pools(auth_client, user, db):
    other = User.objects.create_user(
        email='nutrition-scale-b@test.com',
        password='testpass123',
        weight=80,
        height=180,
        gender='male',
        activity_level='moderate',
        main_goal='maintain',
    )
    recipes = _bulk_recipes(12)
    milk = next(r for r in recipes if r.ingredients and r.ingredients[0]['name'] == 'Leche')
    MealIngredientExclusion.objects.create(user=user, term='leche', is_active=True)

    mine = auth_client.get('/api/nutrition/plan-meals-for-selection/')
    other_client = APIClient()
    other_client.force_authenticate(user=other)
    theirs = other_client.get('/api/nutrition/plan-meals-for-selection/')
    assert mine.status_code == theirs.status_code == 200

    def ids(resp):
        return {
            str(opt.get('recipeId'))
            for opts in (resp.data.get('meals_by_type') or {}).values()
            for opt in opts
            if opt.get('recipeId') is not None
        }

    assert str(milk.id) not in ids(mine)
    assert str(milk.id) in ids(theirs)


@pytest.mark.django_db
def test_query_count_bounded_from_50_to_1000(auth_client):
    stats_50 = _measure_fallback(auth_client, 50)
    Recipe.objects.all().delete()
    stats_1000 = _measure_fallback(auth_client, 1000)
    assert stats_1000['queries'] <= stats_50['queries'] + 5


@pytest.mark.django_db
def test_assigned_plan_ten_slots_query_count(auth_client, user):
    plan = NutritionPlan.objects.create(
        name='Plan 10',
        user=user,
        daily_calories=2000,
        protein_grams=140,
        carbs_grams=200,
        fat_grams=60,
        is_active=True,
    )
    for i in range(10):
        meal = PlanMeal.objects.create(
            plan=plan,
            name=f'Comida {i}',
            meal_type=MEAL_TYPES[i % len(MEAL_TYPES)],
            order_index=i + 1,
            calories=200,
            protein=15,
            carbs=20,
            fat=8,
        )
        recipe = Recipe.objects.create(
            name=f'Opcion {i}',
            category='Almuerzo',
            difficulty='Fácil',
            servings=1,
            calories=250,
            protein=Decimal('20.0'),
            carbs=Decimal('25.0'),
            fat=Decimal('8.0'),
            is_active=True,
            meal_types=[MEAL_TYPES[i % len(MEAL_TYPES)]],
        )
        PlanMealRecipe.objects.create(meal=meal, recipe=recipe, servings=Decimal('1'))

    n_queries, response, _ = _count_queries(
        lambda: auth_client.get('/api/nutrition/plan-meals-for-selection/')
    )
    assert response.status_code == 200
    assert response.data.get('source') == 'user_plan'
    assert len(response.data.get('meal_slots') or []) == 10
    assert n_queries < 40


@pytest.mark.django_db
def test_weekly_batch_repeats_per_day(auth_client):
    _bulk_recipes(40)
    n_queries, response, _ = _count_queries(
        lambda: auth_client.get('/api/nutrition/plan-meals-for-selection-batch/?start_date=2026-06-01')
    )
    assert response.status_code == 200
    assert len(response.data.get('results') or {}) == 7
    # 7 child calls; leftover pending, not rewritten in this PR.
    assert n_queries < 80


@pytest.mark.django_db
def test_fallback_contract_and_macros_fields(auth_client):
    _bulk_recipes(15)
    response = auth_client.get('/api/nutrition/plan-meals-for-selection/')
    assert response.status_code == 200
    assert set(response.data) >= FALLBACK_KEYS
    for meal_type, options in (response.data['meals_by_type'] or {}).items():
        for option in options:
            assert 'calories' in option
            assert 'protein' in option
            assert 'carbs' in option
            assert 'fat' in option
            assert 'recipeId' in option
            assert option['calories'] is not None
