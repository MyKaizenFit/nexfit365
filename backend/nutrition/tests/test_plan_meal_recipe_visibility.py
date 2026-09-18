"""Visibility of recipes on the client meal-selection surfaces.

Two different lists exist:

1. Slot list — GET /api/nutrition/plan-meals-for-selection/
   With an assigned plan this returns source=user_plan and only recipes
   linked to that day's PlanMeal (PlanMealRecipe, else suggested_recipes).

2. Catalog — GET /api/nutrition/recipes/
   Active recipes only. Used by "Receta equivalencia" / listRecipes().
"""
from datetime import date
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from nutrition.models import PlanMeal, PlanMealRecipe, Recipe

pytestmark = pytest.mark.django_db


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _make_recipe(name, *, is_active=True, meal_types=None, diet_types=None, allergens=None):
    return Recipe.objects.create(
        name=name,
        category='Almuerzo',
        difficulty='Fácil',
        servings=1,
        calories=400,
        protein=Decimal('25.0'),
        carbs=Decimal('40.0'),
        fat=Decimal('10.0'),
        is_active=is_active,
        meal_types=meal_types or ['lunch'],
        diet_types=diet_types or [],
        allergens=allergens or [],
        ingredients=[],
    )


def _slot_recipe_ids(payload):
    ids = set()
    for options in (payload.get('meals_by_type') or {}).values():
        for option in options:
            rid = option.get('recipeId')
            if rid is not None:
                ids.add(str(rid))
    for options in (payload.get('options_by_meal_id') or {}).values():
        for option in options:
            rid = option.get('recipeId')
            if rid is not None:
                ids.add(str(rid))
    return ids


def _ordered_slot_names(payload, meal_id):
    options = (payload.get('options_by_meal_id') or {}).get(str(meal_id), [])
    return [opt.get('name') for opt in options]


class TestAssignedPlanSlotVisibility:
    def test_a_assigned_recipe_appears_in_slot(self, auth_client, user, nutrition_plan):
        assigned = _make_recipe('Asignada al slot')
        meal = PlanMeal.objects.create(
            plan=nutrition_plan, name='Comida', meal_type='lunch', order_index=1,
        )
        PlanMealRecipe.objects.create(meal=meal, recipe=assigned, servings=Decimal('1.0'))

        response = auth_client.get('/api/nutrition/plan-meals-for-selection/')
        assert response.status_code == 200
        assert response.data.get('source') == 'user_plan'
        assert str(assigned.id) in _slot_recipe_ids(response.data)

    def test_b_active_unassigned_recipe_does_not_appear_in_slot(self, auth_client, user, nutrition_plan):
        assigned = _make_recipe('En el plan')
        extra = _make_recipe('Activa fuera del plan')
        meal = PlanMeal.objects.create(
            plan=nutrition_plan, name='Comida', meal_type='lunch', order_index=1,
        )
        PlanMealRecipe.objects.create(meal=meal, recipe=assigned, servings=Decimal('1.0'))

        response = auth_client.get('/api/nutrition/plan-meals-for-selection/')
        assert response.status_code == 200
        assert response.data.get('source') == 'user_plan'
        ids = _slot_recipe_ids(response.data)
        assert str(assigned.id) in ids
        assert str(extra.id) not in ids

    def test_c_assigned_inactive_recipe_still_listed_on_slot_endpoint(
        self, auth_client, user, nutrition_plan,
    ):
        # Diseño actual del slot: no filtra is_active en PlanMealRecipe.
        inactive = _make_recipe('Inactiva asignada', is_active=False)
        meal = PlanMeal.objects.create(
            plan=nutrition_plan, name='Comida', meal_type='lunch', order_index=1,
        )
        PlanMealRecipe.objects.create(meal=meal, recipe=inactive, servings=Decimal('1.0'))

        response = auth_client.get('/api/nutrition/plan-meals-for-selection/')
        assert response.status_code == 200
        assert str(inactive.id) in _slot_recipe_ids(response.data)

    def test_d_compatible_assigned_recipe_appears(self, auth_client, user, nutrition_plan):
        user.dietary_restrictions = ['Vegano']
        user.allergies = []
        user.save(update_fields=['dietary_restrictions', 'allergies'])
        vegan = _make_recipe('Bowl vegetal', diet_types=['vegano'])
        meal = PlanMeal.objects.create(
            plan=nutrition_plan, name='Comida', meal_type='lunch', order_index=1,
        )
        PlanMealRecipe.objects.create(meal=meal, recipe=vegan, servings=Decimal('1.0'))

        response = auth_client.get('/api/nutrition/plan-meals-for-selection/')
        assert response.status_code == 200
        assert str(vegan.id) in _slot_recipe_ids(response.data)

    def test_e_incompatible_assigned_recipe_stays_visible_but_not_recommended(
        self, auth_client, user, nutrition_plan,
    ):
        user.dietary_restrictions = ['Vegano']
        user.allergies = []
        user.save(update_fields=['dietary_restrictions', 'allergies'])
        vegan = _make_recipe('Tofu', diet_types=['vegano'])
        meat = _make_recipe('Pollo', diet_types=['omnivoro'])
        meal = PlanMeal.objects.create(
            plan=nutrition_plan, name='Comida', meal_type='lunch', order_index=1,
        )
        PlanMealRecipe.objects.create(meal=meal, recipe=vegan, servings=Decimal('1.0'))
        PlanMealRecipe.objects.create(meal=meal, recipe=meat, servings=Decimal('1.0'))

        response = auth_client.get('/api/nutrition/plan-meals-for-selection/')
        assert response.status_code == 200
        ids = _slot_recipe_ids(response.data)
        assert str(vegan.id) in ids
        assert str(meat.id) in ids

        options = (response.data.get('options_by_meal_id') or {}).get(str(meal.id), [])
        meat_opt = next(opt for opt in options if str(opt.get('recipeId')) == str(meat.id))
        vegan_opt = next(opt for opt in options if str(opt.get('recipeId')) == str(vegan.id))
        assert meat_opt.get('is_recommended') is not True
        names = _ordered_slot_names(response.data, meal.id)
        assert names.index(vegan_opt['name']) < names.index(meat_opt['name'])

    def test_suggested_recipes_used_when_no_plan_meal_recipe(
        self, auth_client, user, nutrition_plan,
    ):
        suggested = _make_recipe('Solo M2M')
        meal = PlanMeal.objects.create(
            plan=nutrition_plan, name='Comida', meal_type='lunch', order_index=1,
        )
        meal.suggested_recipes.add(suggested)

        response = auth_client.get('/api/nutrition/plan-meals-for-selection/')
        assert response.status_code == 200
        assert str(suggested.id) in _slot_recipe_ids(response.data)

    def test_wrong_week_hides_recipe_from_that_date(self, auth_client, user, nutrition_plan):
        nutrition_plan.start_date = date(2026, 9, 14)  # Monday, week 1
        nutrition_plan.duration_weeks = 2
        nutrition_plan.save(update_fields=['start_date', 'duration_weeks'])
        week1 = _make_recipe('Semana 1')
        week2 = _make_recipe('Semana 2')
        meal1 = PlanMeal.objects.create(
            plan=nutrition_plan, name='Comida S1', meal_type='lunch',
            order_index=1, week_number=1, day_of_week=1,
        )
        meal2 = PlanMeal.objects.create(
            plan=nutrition_plan, name='Comida S2', meal_type='lunch',
            order_index=1, week_number=2, day_of_week=1,
        )
        PlanMealRecipe.objects.create(meal=meal1, recipe=week1, servings=Decimal('1.0'))
        PlanMealRecipe.objects.create(meal=meal2, recipe=week2, servings=Decimal('1.0'))

        week1_resp = auth_client.get('/api/nutrition/plan-meals-for-selection/?date=2026-09-14')
        week2_resp = auth_client.get('/api/nutrition/plan-meals-for-selection/?date=2026-09-21')
        assert str(week1.id) in _slot_recipe_ids(week1_resp.data)
        assert str(week2.id) not in _slot_recipe_ids(week1_resp.data)
        assert str(week2.id) in _slot_recipe_ids(week2_resp.data)
        assert str(week1.id) not in _slot_recipe_ids(week2_resp.data)

    def test_wrong_day_hides_recipe_when_specific_days_exist(
        self, auth_client, user, nutrition_plan,
    ):
        monday = _make_recipe('Lunes')
        friday = _make_recipe('Viernes')
        meal_mon = PlanMeal.objects.create(
            plan=nutrition_plan, name='Comida L', meal_type='lunch',
            order_index=1, week_number=1, day_of_week=1,
        )
        meal_fri = PlanMeal.objects.create(
            plan=nutrition_plan, name='Comida V', meal_type='lunch',
            order_index=1, week_number=1, day_of_week=5,
        )
        PlanMealRecipe.objects.create(meal=meal_mon, recipe=monday, servings=Decimal('1.0'))
        PlanMealRecipe.objects.create(meal=meal_fri, recipe=friday, servings=Decimal('1.0'))

        monday_resp = auth_client.get('/api/nutrition/plan-meals-for-selection/?date=2026-09-14')
        friday_resp = auth_client.get('/api/nutrition/plan-meals-for-selection/?date=2026-09-18')
        assert str(monday.id) in _slot_recipe_ids(monday_resp.data)
        assert str(friday.id) not in _slot_recipe_ids(monday_resp.data)
        assert str(friday.id) in _slot_recipe_ids(friday_resp.data)
        assert str(monday.id) not in _slot_recipe_ids(friday_resp.data)


class TestAlternativesEndpointFilters:
    def test_alternatives_drop_inactive_assigned_recipe(self, auth_client, user, nutrition_plan):
        inactive = _make_recipe('Inactiva en alternativas', is_active=False)
        active = _make_recipe('Activa en alternativas')
        meal = PlanMeal.objects.create(
            plan=nutrition_plan, name='Comida', meal_type='lunch', order_index=1,
        )
        PlanMealRecipe.objects.create(meal=meal, recipe=inactive, servings=Decimal('1.0'))
        PlanMealRecipe.objects.create(meal=meal, recipe=active, servings=Decimal('1.0'))

        slot = auth_client.get('/api/nutrition/plan-meals-for-selection/?date=2026-09-16')
        assert str(inactive.id) in _slot_recipe_ids(slot.data)
        assert str(active.id) in _slot_recipe_ids(slot.data)

        reco = auth_client.get(
            '/api/nutrition/meal-alternatives-recommendation/',
            {'date': '2026-09-16', 'plan_meal_id': str(meal.id)},
        )
        assert reco.status_code == 200
        ids = {str(opt.get('recipeId')) for opt in reco.data.get('alternatives') or []}
        assert str(active.id) in ids
        assert str(inactive.id) not in ids

    def test_alternatives_drop_incompatible_assigned_recipe(
        self, auth_client, user, nutrition_plan,
    ):
        user.dietary_restrictions = ['Vegano']
        user.allergies = []
        user.save(update_fields=['dietary_restrictions', 'allergies'])
        vegan = _make_recipe('Tofu alternativas', diet_types=['vegano'])
        meat = _make_recipe('Pollo alternativas', diet_types=['omnivoro'])
        meal = PlanMeal.objects.create(
            plan=nutrition_plan, name='Comida', meal_type='lunch', order_index=1,
        )
        PlanMealRecipe.objects.create(meal=meal, recipe=vegan, servings=Decimal('1.0'))
        PlanMealRecipe.objects.create(meal=meal, recipe=meat, servings=Decimal('1.0'))

        slot = auth_client.get('/api/nutrition/plan-meals-for-selection/?date=2026-09-16')
        assert str(meat.id) in _slot_recipe_ids(slot.data)

        reco = auth_client.get(
            '/api/nutrition/meal-alternatives-recommendation/',
            {'date': '2026-09-16', 'plan_meal_id': str(meal.id)},
        )
        assert reco.status_code == 200
        ids = {str(opt.get('recipeId')) for opt in reco.data.get('alternatives') or []}
        assert str(vegan.id) in ids
        assert str(meat.id) not in ids


class TestCatalogVisibility:
    def _jwt_client(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        return client

    def test_catalog_includes_unassigned_active_recipe(self, user, nutrition_plan):
        assigned = _make_recipe('En el plan catalog')
        extra = _make_recipe('Catalogo libre')
        meal = PlanMeal.objects.create(
            plan=nutrition_plan, name='Comida', meal_type='lunch', order_index=1,
        )
        PlanMealRecipe.objects.create(meal=meal, recipe=assigned, servings=Decimal('1.0'))

        response = self._jwt_client(user).get('/api/nutrition/recipes/?page_size=200')
        assert response.status_code == 200
        names = {item['name'] for item in response.json().get('results', [])}
        assert extra.name in names
        assert assigned.name in names

    def test_catalog_excludes_inactive_recipe(self, user):
        inactive = _make_recipe('Apagada catalogo', is_active=False)
        response = self._jwt_client(user).get('/api/nutrition/recipes/?page_size=200')
        assert response.status_code == 200
        ids = {str(item['id']) for item in response.json().get('results', [])}
        assert str(inactive.id) not in ids
