"""Tests unitarios e integración para recomendaciones por macros restantes (opción 3)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework import status
from rest_framework.test import APIClient

from nutrition.meal_recommendation import (
    LEVEL_COST_THRESHOLDS,
    MealLogSnapshot,
    NutrientVector,
    OVERAGE_THRESHOLD,
    SlotInfo,
    SCORE_WEIGHTS,
    compute_remaining,
    compute_slot_budget,
    compute_slot_weights,
    level_from_cost,
    rank_alternatives,
    rank_slot_option_lists,
    score_alternative,
    sum_completed_intake,
)
from nutrition.models import (
    MealIngredientExclusion,
    MealLog,
    MealRecipeExclusion,
    NutritionPlan,
    PlanMeal,
    PlanMealRecipe,
    Recipe,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Unit tests — servicio puro
# ---------------------------------------------------------------------------


class TestSumCompletedIntake:
    def test_none_completed(self):
        logs = [
            MealLogSnapshot('a', 'breakfast', completed=False, is_skipped=False, calories=300),
            MealLogSnapshot('b', 'lunch', completed=False, is_skipped=False, calories=500),
        ]
        assert sum_completed_intake(logs).calories == 0

    def test_sums_only_completed_not_skipped(self):
        logs = [
            MealLogSnapshot('a', 'breakfast', True, False, calories=300, protein=20),
            MealLogSnapshot('b', 'lunch', True, True, calories=500, protein=40),
            MealLogSnapshot('c', 'dinner', False, False, calories=400, protein=30),
        ]
        total = sum_completed_intake(logs)
        assert total.calories == 300
        assert total.protein == 20

    def test_excludes_replaced_completed_meal(self):
        logs = [
            MealLogSnapshot('breakfast', 'breakfast', True, False, calories=400),
            MealLogSnapshot('dinner', 'dinner', True, False, calories=500),
        ]
        total = sum_completed_intake(logs, exclude_plan_meal_id='dinner')
        assert total.calories == 400


class TestSlotBudgetReservation:
    def test_reserves_for_other_pending_meals(self):
        slots = [
            SlotInfo('b', 'breakfast', 1, calories=400),
            SlotInfo('l', 'lunch', 2, calories=600),
            SlotInfo('d', 'dinner', 3, calories=500),
        ]
        weights = compute_slot_weights(slots)
        remaining = NutrientVector(calories=600, protein=60, carbs=60, fat=20)
        # breakfast + lunch completed → only dinner pending as "other" when changing lunch? 
        # Changing dinner: pending others = 0 if breakfast+lunch completed
        logs = {
            'b': MealLogSnapshot('b', 'breakfast', True, False, calories=400),
            'l': MealLogSnapshot('l', 'lunch', True, False, calories=500),
        }
        budget, pending = compute_slot_budget(
            remaining,
            current_slot_id='d',
            slots=slots,
            logs_by_slot=logs,
            weights=weights,
        )
        assert pending == 0
        assert abs(budget.calories - 600) < 0.01

    def test_does_not_assign_all_remaining_when_others_pending(self):
        slots = [
            SlotInfo('b', 'breakfast', 1, calories=400),
            SlotInfo('l', 'lunch', 2, calories=600),
            SlotInfo('d', 'dinner', 3, calories=500),
        ]
        weights = compute_slot_weights(slots)
        # 1500 goal, 900 consumed → 600 remaining; changing dinner with lunch still pending
        remaining = NutrientVector(calories=600, protein=60, carbs=80, fat=20)
        logs = {
            'b': MealLogSnapshot('b', 'breakfast', True, False, calories=900),
        }
        budget, pending = compute_slot_budget(
            remaining,
            current_slot_id='d',
            slots=slots,
            logs_by_slot=logs,
            weights=weights,
        )
        assert pending == 1  # lunch
        # dinner share ≈ 500/(500+600) of 600 ≈ 272.7 — not the full 600
        assert budget.calories < 600
        assert budget.calories > 200
        dinner_share = weights['d'] / (weights['d'] + weights['l'])
        assert abs(budget.calories - 600 * dinner_share) < 0.5


class TestScoring:
    def test_weights_sum_to_one(self):
        assert abs(sum(SCORE_WEIGHTS.values()) - 1.0) < 1e-9

    def test_level_thresholds_boundaries(self):
        assert level_from_cost(LEVEL_COST_THRESHOLDS['ideal']) == 'ideal'
        assert level_from_cost(LEVEL_COST_THRESHOLDS['ideal'] + 0.0001) == 'good'
        assert level_from_cost(LEVEL_COST_THRESHOLDS['good']) == 'good'
        assert level_from_cost(LEVEL_COST_THRESHOLDS['good'] + 0.0001) == 'acceptable'
        assert level_from_cost(LEVEL_COST_THRESHOLDS['acceptable']) == 'acceptable'
        assert level_from_cost(LEVEL_COST_THRESHOLDS['acceptable'] + 0.0001) == 'outside_target'

    def test_overage_threshold_115_applies_penalty(self):
        budget = NutrientVector(calories=400, protein=30, carbs=40, fat=12)
        just_under = NutrientVector(
            calories=400 * OVERAGE_THRESHOLD - 0.01,
            protein=30,
            carbs=40,
            fat=12,
        )
        just_over = NutrientVector(
            calories=400 * OVERAGE_THRESHOLD + 0.01,
            protein=30,
            carbs=40,
            fat=12,
        )
        score_under, cost_under = score_alternative(just_under, budget)
        score_over, cost_over = score_alternative(just_over, budget)
        assert score_under > score_over
        assert cost_over > cost_under

    def test_null_or_zero_goals_do_not_divide_by_zero(self):
        score, cost = score_alternative(
            NutrientVector(calories=200, protein=10, carbs=10, fat=5),
            NutrientVector(calories=0, protein=0, carbs=0, fat=0),
        )
        assert score > 0
        assert cost >= 0
        assert score == 1.0 / (1.0 + cost)

    def test_negative_remaining_preserved_in_context(self):
        result = rank_alternatives(
            date='2026-08-04',
            current_slot=SlotInfo('d', 'dinner', 1, calories=300),
            day_slots=[SlotInfo('d', 'dinner', 1, calories=300)],
            logs=[MealLogSnapshot('b', 'breakfast', True, False, calories=1800)],
            daily_goals=NutrientVector(1500, 120, 150, 50),
            alternatives=[
                {'id': 'a', 'name': 'A', 'calories': 200, 'protein': 20, 'carbs': 20, 'fat': 8, 'recipeId': '1'},
            ],
        )
        assert result.context.remaining.calories == -300
        assert result.context.goals_exceeded['calories'] is True
        remaining = compute_remaining(
            NutrientVector(1500, 120, 150, 50),
            NutrientVector(1800, 0, 0, 0),
        )
        assert remaining.calories == -300

    def test_current_selection_never_dropped(self):
        slot = SlotInfo('d', 'dinner', 1, calories=400)
        result = rank_alternatives(
            date='2026-08-04',
            current_slot=slot,
            day_slots=[slot],
            logs=[],
            daily_goals=NutrientVector(1500, 120, 150, 50),
            alternatives=[
                {'id': 'best', 'name': 'Best', 'calories': 400, 'protein': 35, 'carbs': 40, 'fat': 12, 'recipeId': '1'},
                {'id': 'current', 'name': 'Current', 'calories': 900, 'protein': 10, 'carbs': 10, 'fat': 40, 'recipeId': '9'},
            ],
            current_recipe_id='9',
        )
        ids = [a.option['recipeId'] for a in result.alternatives]
        assert '9' in ids
        assert any(a.is_current_selection for a in result.alternatives)

    def test_calories_dominate_but_macros_matter(self):
        budget = NutrientVector(calories=500, protein=40, carbs=50, fat=15)
        close_cals_bad_macros = NutrientVector(calories=500, protein=5, carbs=5, fat=5)
        slightly_off_cals_good_macros = NutrientVector(calories=520, protein=40, carbs=50, fat=15)
        score_bad, _ = score_alternative(close_cals_bad_macros, budget)
        score_good, _ = score_alternative(slightly_off_cals_good_macros, budget)
        assert score_good > score_bad

    def test_overage_penalized(self):
        budget = NutrientVector(calories=400, protein=30, carbs=40, fat=12)
        ok = NutrientVector(calories=390, protein=28, carbs=38, fat=11)
        over = NutrientVector(calories=700, protein=28, carbs=38, fat=11)
        score_ok, _ = score_alternative(ok, budget)
        score_over, _ = score_alternative(over, budget)
        assert score_ok > score_over

    def test_same_calories_different_macros_order(self):
        budget = NutrientVector(calories=500, protein=40, carbs=50, fat=15)
        alts = [
            {'id': 'a', 'name': 'A', 'calories': 500, 'protein': 10, 'carbs': 10, 'fat': 5, 'recipeId': '1'},
            {'id': 'b', 'name': 'B', 'calories': 500, 'protein': 40, 'carbs': 50, 'fat': 15, 'recipeId': '2'},
            {'id': 'c', 'name': 'C', 'calories': 500, 'protein': 20, 'carbs': 30, 'fat': 10, 'recipeId': '3'},
        ]
        result = rank_alternatives(
            date='2026-08-04',
            current_slot=SlotInfo('d', 'dinner', 3, calories=500),
            day_slots=[SlotInfo('d', 'dinner', 3, calories=500)],
            logs=[],
            daily_goals=NutrientVector(1500, 120, 150, 50),
            alternatives=alts,
        )
        assert result.alternatives[0].option['name'] == 'B'
        assert result.alternatives[0].is_recommended is True

    def test_deterministic_order(self):
        budget_slot = SlotInfo('d', 'dinner', 3, calories=400)
        alts = [
            {'id': 'x', 'name': 'Zebra', 'calories': 400, 'protein': 30, 'carbs': 40, 'fat': 12, 'recipeId': 'z'},
            {'id': 'y', 'name': 'Alpha', 'calories': 400, 'protein': 30, 'carbs': 40, 'fat': 12, 'recipeId': 'a'},
        ]
        r1 = rank_alternatives(
            date='2026-08-04',
            current_slot=budget_slot,
            day_slots=[budget_slot],
            logs=[],
            daily_goals=NutrientVector(1500, 120, 150, 50),
            alternatives=alts,
        )
        r2 = rank_alternatives(
            date='2026-08-04',
            current_slot=budget_slot,
            day_slots=[budget_slot],
            logs=[],
            daily_goals=NutrientVector(1500, 120, 150, 50),
            alternatives=list(reversed(alts)),
        )
        names1 = [a.option['name'] for a in r1.alternatives]
        names2 = [a.option['name'] for a in r2.alternatives]
        assert names1 == names2 == ['Alpha', 'Zebra']

    def test_outside_target_still_returned(self):
        slot = SlotInfo('d', 'dinner', 1, calories=300)
        alts = [
            {'id': 'big', 'name': 'Huge', 'calories': 1200, 'protein': 80, 'carbs': 100, 'fat': 40, 'recipeId': '1'},
            {'id': 'mid', 'name': 'Mid', 'calories': 900, 'protein': 60, 'carbs': 80, 'fat': 30, 'recipeId': '2'},
        ]
        result = rank_alternatives(
            date='2026-08-04',
            current_slot=slot,
            day_slots=[slot],
            logs=[MealLogSnapshot('b', 'breakfast', True, False, calories=1600)],
            daily_goals=NutrientVector(1500, 120, 150, 50),
            alternatives=alts,
        )
        assert len(result.alternatives) == 2
        assert result.alternatives[0].is_recommended is True
        assert result.alternatives[0].recommendation_level == 'outside_target'
        assert result.context.goals_exceeded['calories'] is True
        assert result.alternatives[0].option['name'] == 'Mid'

    def test_acceptance_dinner_budget_with_pending_meals(self):
        """Caso de aceptación: 1500 kcal, 900 consumidas, varias pendientes, abrir cena."""
        slots = [
            SlotInfo('b', 'breakfast', 1, calories=400),
            SlotInfo('l', 'lunch', 2, calories=500),
            SlotInfo('s', 'afternoon_snack', 3, calories=200),
            SlotInfo('d', 'dinner', 4, calories=400),
        ]
        logs = [
            MealLogSnapshot('b', 'breakfast', True, False, calories=450, protein=30, carbs=40, fat=15),
            MealLogSnapshot('l', 'lunch', True, False, calories=450, protein=35, carbs=45, fat=15),
        ]
        alts = [
            {'id': 'light', 'name': 'Cena ligera', 'calories': 280, 'protein': 30, 'carbs': 20, 'fat': 8, 'recipeId': '1'},
            {'id': 'heavy', 'name': 'Cena pesada', 'calories': 700, 'protein': 50, 'carbs': 60, 'fat': 25, 'recipeId': '2'},
            {'id': 'fit', 'name': 'Cena encaje', 'calories': 320, 'protein': 35, 'carbs': 25, 'fat': 10, 'recipeId': '3'},
        ]
        result = rank_alternatives(
            date='2026-08-04',
            current_slot=slots[3],
            day_slots=slots,
            logs=logs,
            daily_goals=NutrientVector(1500, 120, 150, 50),
            alternatives=alts,
        )
        # Restante 600; snack pendiente → presupuesto cena < 600
        assert result.context.consumed.calories == 900
        assert result.context.remaining.calories == 600
        assert result.context.pending_meals_count == 1
        assert result.context.slot_budget.calories < 600
        assert result.alternatives[0].option['name'] in ('Cena encaje', 'Cena ligera')
        assert result.alternatives[0].option['name'] != 'Cena pesada'
        assert result.alternatives[-1].option['name'] == 'Cena pesada'
        # Proyección diaria, no solo "600 restantes"
        assert 'projected_daily_calories' in result.alternatives[0].to_option_dict()
        assert result.alternatives[0].projected_daily_calories == 900 + result.alternatives[0].option['calories']


class TestRankSlotOptionLists:
    def test_puts_recommended_first_and_defers_skipped(self):
        slots = [
            SlotInfo('b', 'breakfast', 1, calories=567),
            SlotInfo('l', 'lunch', 2, calories=567),
            SlotInfo('d', 'dinner', 3, calories=567),
        ]
        options = {
            'd': [
                {'id': 'h', 'name': 'Pesada', 'calories': 700, 'protein': 50, 'carbs': 60, 'fat': 25, 'recipeId': 'heavy'},
                {'id': 'l', 'name': 'Ligera', 'calories': 320, 'protein': 35, 'carbs': 25, 'fat': 10, 'recipeId': 'light'},
                {'id': 'x', 'name': 'Excluida', 'calories': 300, 'protein': 20, 'carbs': 20, 'fat': 10, 'recipeId': 'skip-me'},
            ]
        }
        ranked = rank_slot_option_lists(
            date='2026-08-14',
            slots=slots,
            logs=[],
            daily_goals=NutrientVector(1700, 120, 170, 55),
            options_by_slot_id=options,
            skip_recipe_ids={'skip-me'},
        )
        names = [opt['name'] for opt in ranked['d']]
        assert names[0] != 'Pesada'
        assert ranked['d'][0]['is_recommended'] is True
        assert names[-1] == 'Excluida'
        assert 'Excluida' in names
        assert ranked['d'][-1].get('is_recommended') is False
        assert ranked['d'][0].get('recipeId') != 'skip-me'

    def test_excluded_never_recommended_when_valid_alternative_exists(self):
        slot = SlotInfo('d', 'dinner', 1, calories=567)
        ranked = rank_slot_option_lists(
            date='2026-08-14',
            slots=[slot],
            logs=[],
            daily_goals=NutrientVector(1700, 120, 170, 55),
            options_by_slot_id={
                'd': [
                    {'id': 'x', 'name': 'Excluida ligera', 'calories': 280, 'protein': 30, 'carbs': 20, 'fat': 8, 'recipeId': 'skip-me'},
                    {'id': 'h', 'name': 'Pesada', 'calories': 700, 'protein': 50, 'carbs': 60, 'fat': 25, 'recipeId': 'heavy'},
                ]
            },
            skip_recipe_ids={'skip-me'},
        )
        assert ranked['d'][0]['recipeId'] != 'skip-me'
        assert ranked['d'][0]['is_recommended'] is True
        excluded = [opt for opt in ranked['d'] if opt['recipeId'] == 'skip-me']
        assert excluded and excluded[0].get('is_recommended') is False

    def test_all_excluded_keeps_coach_options_without_inventing(self):
        slot = SlotInfo('d', 'dinner', 1, calories=567)
        original = [
            {'id': 'a', 'name': 'A', 'calories': 400, 'protein': 20, 'carbs': 40, 'fat': 10, 'recipeId': 'a'},
            {'id': 'b', 'name': 'B', 'calories': 500, 'protein': 25, 'carbs': 50, 'fat': 12, 'recipeId': 'b'},
        ]
        ranked = rank_slot_option_lists(
            date='2026-08-14',
            slots=[slot],
            logs=[],
            daily_goals=NutrientVector(1700, 120, 170, 55),
            options_by_slot_id={'d': original},
            skip_recipe_ids={'a', 'b'},
        )
        assert [opt['recipeId'] for opt in ranked['d']] == ['a', 'b']
        assert all(opt.get('is_recommended') is not True for opt in ranked['d'])

    def test_does_not_invent_options_when_empty(self):
        slot = SlotInfo('b', 'breakfast', 1, calories=400)
        ranked = rank_slot_option_lists(
            date='2026-08-14',
            slots=[slot],
            logs=[],
            daily_goals=NutrientVector(1700, 120, 170, 55),
            options_by_slot_id={'b': []},
        )
        assert ranked['b'] == []


# ---------------------------------------------------------------------------
# Integration — endpoint
# ---------------------------------------------------------------------------


@pytest.fixture
def user(db):
    return User.objects.create_user(email='reco@test.com', password='testpass123')


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _make_recipe(name, calories, protein, carbs, fat, allergens=None, meal_types=None):
    return Recipe.objects.create(
        name=name,
        category='Cena',
        difficulty='Fácil',
        servings=1,
        calories=calories,
        protein=Decimal(str(protein)),
        carbs=Decimal(str(carbs)),
        fat=Decimal(str(fat)),
        is_active=True,
        meal_types=meal_types or ['dinner'],
        allergens=allergens or [],
    )


@pytest.fixture
def dinner_plan(db, user):
    plan = NutritionPlan.objects.create(
        name='Plan 1500',
        user=user,
        daily_calories=1500,
        protein_grams=120,
        carbs_grams=150,
        fat_grams=50,
        is_active=True,
        is_template=False,
        start_date=date(2026, 1, 1),
    )
    # day_of_week=None → genérico todos los días
    breakfast = PlanMeal.objects.create(
        plan=plan, name='Desayuno', meal_type='breakfast', order_index=1,
        calories=400, protein=30, carbs=40, fat=12, day_of_week=None,
    )
    lunch = PlanMeal.objects.create(
        plan=plan, name='Almuerzo', meal_type='lunch', order_index=2,
        calories=500, protein=40, carbs=50, fat=15, day_of_week=None,
    )
    snack = PlanMeal.objects.create(
        plan=plan, name='Snack', meal_type='afternoon_snack', order_index=3,
        calories=200, protein=15, carbs=20, fat=8, day_of_week=None,
    )
    dinner = PlanMeal.objects.create(
        plan=plan, name='Cena', meal_type='dinner', order_index=4,
        calories=400, protein=35, carbs=40, fat=15, day_of_week=None,
    )

    light = _make_recipe('Cena ligera', 280, 30, 20, 8)
    heavy = _make_recipe('Cena pesada', 700, 50, 60, 25)
    fit = _make_recipe('Cena encaje', 320, 35, 25, 10)
    allergen_recipe = _make_recipe('Cena con frutos', 300, 20, 20, 15, allergens=['nuts'])

    for idx, recipe in enumerate([light, heavy, fit, allergen_recipe]):
        PlanMealRecipe.objects.create(
            meal=dinner, recipe=recipe, display_order=idx, servings=Decimal('1'),
        )

    return {
        'plan': plan,
        'breakfast': breakfast,
        'lunch': lunch,
        'snack': snack,
        'dinner': dinner,
        'recipes': {
            'light': light,
            'heavy': heavy,
            'fit': fit,
            'allergen': allergen_recipe,
        },
    }


@pytest.mark.django_db
class TestMealAlternativesRecommendationEndpoint:
    def test_requires_auth(self):
        client = APIClient()
        response = client.get('/api/nutrition/meal-alternatives-recommendation/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_requires_plan_meal_id(self, auth_client):
        response = auth_client.get('/api/nutrition/meal-alternatives-recommendation/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_acceptance_case_orders_and_projects(self, auth_client, user, dinner_plan):
        MealLog.objects.create(
            user=user, date='2026-08-04', plan_meal=dinner_plan['breakfast'],
            meal_type='breakfast', completed=True, calories=450, protein=30, carbs=40, fat=15,
        )
        MealLog.objects.create(
            user=user, date='2026-08-04', plan_meal=dinner_plan['lunch'],
            meal_type='lunch', completed=True, calories=450, protein=35, carbs=45, fat=15,
        )

        response = auth_client.get(
            '/api/nutrition/meal-alternatives-recommendation/',
            {'date': '2026-08-04', 'plan_meal_id': str(dinner_plan['dinner'].id)},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data['context']['consumed']['calories'] == 900
        assert data['context']['remaining']['calories'] == 600
        assert data['context']['pending_meals_count'] >= 1
        assert data['context']['slot_budget']['calories'] < 600

        names = [alt['name'] for alt in data['alternatives']]
        assert names[0] != 'Cena pesada'
        assert data['alternatives'][0]['is_recommended'] is True
        assert 'projected_daily_calories' in data['alternatives'][0]
        assert 'recommendation_level' in data['alternatives'][0]
        assert 'recommendation_reason' in data['alternatives'][0]

    def test_order_changes_when_completed_meals_change(self, auth_client, user, dinner_plan):
        dinner_id = str(dinner_plan['dinner'].id)
        # Sin nada completado
        empty = auth_client.get(
            '/api/nutrition/meal-alternatives-recommendation/',
            {'date': '2026-08-04', 'plan_meal_id': dinner_id},
        )
        # Casi todo el día consumido
        MealLog.objects.create(
            user=user, date='2026-08-04', plan_meal=dinner_plan['breakfast'],
            meal_type='breakfast', completed=True, calories=700, protein=50, carbs=70, fat=25,
        )
        MealLog.objects.create(
            user=user, date='2026-08-04', plan_meal=dinner_plan['lunch'],
            meal_type='lunch', completed=True, calories=700, protein=50, carbs=70, fat=25,
        )
        full = auth_client.get(
            '/api/nutrition/meal-alternatives-recommendation/',
            {'date': '2026-08-04', 'plan_meal_id': dinner_id},
        )
        assert empty.status_code == 200 and full.status_code == 200
        # Con mucho consumido, la pesada debe caer; la ligera subir
        empty_names = [a['name'] for a in empty.data['alternatives']]
        full_names = [a['name'] for a in full.data['alternatives']]
        assert full_names[0] == 'Cena ligera' or full_names.index('Cena ligera') < full_names.index('Cena pesada')
        assert empty.data['context']['slot_budget']['calories'] != full.data['context']['slot_budget']['calories']
        assert empty_names != full_names or empty.data['alternatives'][0]['recommendation_score'] != full.data['alternatives'][0]['recommendation_score']

    def test_filters_allergens_and_exclusions(self, auth_client, user, dinner_plan):
        user.allergies = ['nuts']
        user.save(update_fields=['allergies'])
        MealRecipeExclusion.objects.create(
            user=user, recipe=dinner_plan['recipes']['heavy'], is_active=True,
        )
        response = auth_client.get(
            '/api/nutrition/meal-alternatives-recommendation/',
            {'date': '2026-08-04', 'plan_meal_id': str(dinner_plan['dinner'].id)},
        )
        assert response.status_code == 200
        names = [a['name'] for a in response.data['alternatives']]
        assert 'Cena con frutos' not in names
        assert 'Cena pesada' not in names
        assert 'Cena ligera' in names

    def test_replacing_completed_excludes_old_contribution(self, auth_client, user, dinner_plan):
        MealLog.objects.create(
            user=user, date='2026-08-04', plan_meal=dinner_plan['dinner'],
            meal_type='dinner', recipe=dinner_plan['recipes']['heavy'],
            completed=True, calories=700, protein=50, carbs=60, fat=25,
        )
        response = auth_client.get(
            '/api/nutrition/meal-alternatives-recommendation/',
            {'date': '2026-08-04', 'plan_meal_id': str(dinner_plan['dinner'].id)},
        )
        assert response.status_code == 200
        # Consumido no debe incluir los 700 de la cena que se reemplaza
        assert response.data['context']['consumed']['calories'] == 0
        current = [a for a in response.data['alternatives'] if a.get('is_current_selection')]
        assert len(current) == 1
        assert current[0]['name'] == 'Cena pesada'

    def test_skipped_not_counted(self, auth_client, user, dinner_plan):
        MealLog.objects.create(
            user=user, date='2026-08-04', plan_meal=dinner_plan['breakfast'],
            meal_type='breakfast', completed=False, is_skipped=True, calories=0,
        )
        response = auth_client.get(
            '/api/nutrition/meal-alternatives-recommendation/',
            {'date': '2026-08-04', 'plan_meal_id': str(dinner_plan['dinner'].id)},
        )
        assert response.data['context']['consumed']['calories'] == 0

    def test_user_isolation(self, auth_client, user, dinner_plan):
        other = User.objects.create_user(email='other-reco@test.com', password='x')
        MealLog.objects.create(
            user=other, date='2026-08-04', plan_meal=dinner_plan['breakfast'],
            meal_type='breakfast', completed=True, calories=900, protein=60, carbs=90, fat=30,
        )
        response = auth_client.get(
            '/api/nutrition/meal-alternatives-recommendation/',
            {'date': '2026-08-04', 'plan_meal_id': str(dinner_plan['dinner'].id)},
        )
        assert response.data['context']['consumed']['calories'] == 0

    def test_date_isolation(self, auth_client, user, dinner_plan):
        MealLog.objects.create(
            user=user, date='2026-08-03', plan_meal=dinner_plan['breakfast'],
            meal_type='breakfast', completed=True, calories=900, protein=60, carbs=90, fat=30,
        )
        response = auth_client.get(
            '/api/nutrition/meal-alternatives-recommendation/',
            {'date': '2026-08-04', 'plan_meal_id': str(dinner_plan['dinner'].id)},
        )
        assert response.data['context']['consumed']['calories'] == 0

    def test_two_slots_same_meal_type(self, auth_client, user):
        plan = NutritionPlan.objects.create(
            name='Double breakfast', user=user, daily_calories=1500,
            protein_grams=100, carbs_grams=150, fat_grams=50, is_active=True,
        )
        b1 = PlanMeal.objects.create(
            plan=plan, name='Desayuno', meal_type='breakfast', order_index=1,
            calories=400, day_of_week=None,
        )
        b2 = PlanMeal.objects.create(
            plan=plan, name='Bebida', meal_type='breakfast', order_index=2,
            calories=100, day_of_week=None,
        )
        r1 = _make_recipe('Toast', 350, 15, 40, 10, meal_types=['breakfast'])
        r2 = _make_recipe('Shake', 80, 20, 5, 1, meal_types=['breakfast'])
        PlanMealRecipe.objects.create(meal=b1, recipe=r1, display_order=0)
        PlanMealRecipe.objects.create(meal=b2, recipe=r2, display_order=0)

        MealLog.objects.create(
            user=user, date='2026-08-04', plan_meal=b1, meal_type='breakfast',
            completed=True, calories=350, protein=15, carbs=40, fat=10,
        )
        response = auth_client.get(
            '/api/nutrition/meal-alternatives-recommendation/',
            {'date': '2026-08-04', 'plan_meal_id': str(b2.id)},
        )
        assert response.status_code == 200
        assert response.data['context']['consumed']['calories'] == 350
        assert response.data['plan_meal_id'] == str(b2.id)

    def test_no_n_plus_one_on_alternatives(self, auth_client, user, dinner_plan):
        for i in range(5):
            recipe = _make_recipe(f'Extra {i}', 300 + i * 10, 25, 25, 10)
            PlanMealRecipe.objects.create(
                meal=dinner_plan['dinner'], recipe=recipe, display_order=10 + i,
            )
        with CaptureQueriesContext(connection) as ctx:
            response = auth_client.get(
                '/api/nutrition/meal-alternatives-recommendation/',
                {'date': '2026-08-04', 'plan_meal_id': str(dinner_plan['dinner'].id)},
            )
        assert response.status_code == 200
        # Debe ser acotado; no una query por alternativa.
        assert len(ctx.captured_queries) < 40


@pytest.fixture
def three_meal_new_account_plan(db, user):
    plan = NutritionPlan.objects.create(
        name='Plan 1700 nuevo',
        user=user,
        daily_calories=1700,
        protein_grams=120,
        carbs_grams=170,
        fat_grams=55,
        is_active=True,
        start_date=date(2026, 1, 1),
    )
    slots = []
    for index, (name, meal_type) in enumerate(
        [('Desayuno', 'breakfast'), ('Comida', 'lunch'), ('Cena', 'dinner')],
        start=1,
    ):
        meal = PlanMeal.objects.create(
            plan=plan,
            name=name,
            meal_type=meal_type,
            order_index=index,
            calories=567,
            protein=40,
            carbs=55,
            fat=18,
            day_of_week=None,
        )
        heavy = _make_recipe(
            f'{name} pesada', 700, 40, 70, 25, meal_types=[meal_type],
        )
        light = _make_recipe(
            f'{name} ligera', 350, 30, 30, 10, meal_types=[meal_type],
        )
        PlanMealRecipe.objects.create(
            meal=meal, recipe=heavy, display_order=0, servings=Decimal('1'),
        )
        PlanMealRecipe.objects.create(
            meal=meal, recipe=light, display_order=1, servings=Decimal('1'),
        )
        slots.append({'meal': meal, 'heavy': heavy, 'light': light})
    return {'plan': plan, 'slots': slots}


@pytest.mark.django_db
class TestPlanMealsInitialRecommendation:
    def test_options_by_meal_id_keys_match_slot_ids(
        self, auth_client, three_meal_new_account_plan,
    ):
        response = auth_client.get(
            '/api/nutrition/plan-meals-for-selection/',
            {'date': '2026-08-14'},
        )
        assert response.status_code == 200
        slot_ids = {str(slot['id']) for slot in response.data['meal_slots']}
        option_keys = set(response.data['options_by_meal_id'].keys())
        expected = {str(item['meal'].id) for item in three_meal_new_account_plan['slots']}
        assert slot_ids == option_keys == expected
        for slot in three_meal_new_account_plan['slots']:
            options = response.data['options_by_meal_id'][str(slot['meal'].id)]
            recipe_ids = {str(opt['recipeId']) for opt in options}
            assert str(slot['heavy'].id) in recipe_ids
            assert str(slot['light'].id) in recipe_ids
            assert all(isinstance(opt['recipeId'], str) for opt in options)

    def test_new_account_initial_matches_cambiar_recommendation(
        self, auth_client, three_meal_new_account_plan,
    ):
        date_str = '2026-08-14'
        plan_response = auth_client.get(
            '/api/nutrition/plan-meals-for-selection/',
            {'date': date_str},
        )
        assert plan_response.status_code == 200
        assert MealLog.objects.count() == 0

        initial_ids = []
        recommended_ids = []
        initial_calories = []
        for item in three_meal_new_account_plan['slots']:
            slot_id = str(item['meal'].id)
            initial = plan_response.data['options_by_meal_id'][slot_id][0]
            reco = auth_client.get(
                '/api/nutrition/meal-alternatives-recommendation/',
                {'date': date_str, 'plan_meal_id': slot_id},
            )
            assert reco.status_code == 200
            top = reco.data['alternatives'][0]
            assert initial['recipeId'] == str(top['recipeId'])
            assert initial['calories'] == top['calories']
            assert initial.get('is_recommended') is True
            assert top.get('is_recommended') is True
            initial_ids.append(str(initial['recipeId']))
            recommended_ids.append(str(top['recipeId']))
            initial_calories.append(int(initial['calories']))

        assert initial_ids == recommended_ids
        assert len(set(initial_ids)) == 3
        display_order_sum = 700 * 3
        initial_sum = sum(initial_calories)
        assert initial_sum < display_order_sum
        assert MealLog.objects.filter(completed=True).count() == 0

    def test_initial_preview_accounts_for_completed_intake(
        self, auth_client, user, three_meal_new_account_plan,
    ):
        date_str = '2026-08-14'
        breakfast = three_meal_new_account_plan['slots'][0]
        lunch = three_meal_new_account_plan['slots'][1]
        lunch_id = str(lunch['meal'].id)

        empty = auth_client.get(
            '/api/nutrition/plan-meals-for-selection/',
            {'date': date_str},
        )
        empty_lunch = empty.data['options_by_meal_id'][lunch_id][0]

        MealLog.objects.create(
            user=user,
            date=date_str,
            plan_meal=breakfast['meal'],
            meal_type='breakfast',
            recipe=breakfast['light'],
            completed=True,
            calories=350,
            protein=Decimal('30'),
            carbs=Decimal('30'),
            fat=Decimal('10'),
        )

        after = auth_client.get(
            '/api/nutrition/plan-meals-for-selection/',
            {'date': date_str},
        )
        reco = auth_client.get(
            '/api/nutrition/meal-alternatives-recommendation/',
            {'date': date_str, 'plan_meal_id': lunch_id},
        )
        initial = after.data['options_by_meal_id'][lunch_id][0]
        top = reco.data['alternatives'][0]
        assert str(initial['recipeId']) == str(top['recipeId'])
        assert initial['calories'] == top['calories']
        assert initial['protein'] == top['protein']
        assert initial['carbs'] == top['carbs']
        assert initial['fat'] == top['fat']
        assert initial.get('is_recommended') is True
        assert top.get('is_recommended') is True
        assert reco.data['context']['consumed']['calories'] == 350
        assert str(initial['recipeId']) != str(empty_lunch['recipeId'])

    def test_ranking_uses_requested_date_not_today(
        self, auth_client, user, three_meal_new_account_plan,
    ):
        breakfast = three_meal_new_account_plan['slots'][0]
        lunch = three_meal_new_account_plan['slots'][1]
        lunch_id = str(lunch['meal'].id)
        MealLog.objects.create(
            user=user,
            date='2026-08-14',
            plan_meal=breakfast['meal'],
            meal_type='breakfast',
            recipe=breakfast['light'],
            completed=True,
            calories=350,
            protein=Decimal('30'),
            carbs=Decimal('30'),
            fat=Decimal('10'),
        )
        today_resp = auth_client.get(
            '/api/nutrition/plan-meals-for-selection/',
            {'date': '2026-08-14'},
        )
        tomorrow_resp = auth_client.get(
            '/api/nutrition/plan-meals-for-selection/',
            {'date': '2026-08-15'},
        )
        today_lunch = today_resp.data['options_by_meal_id'][lunch_id][0]
        tomorrow_lunch = tomorrow_resp.data['options_by_meal_id'][lunch_id][0]
        tomorrow_reco = auth_client.get(
            '/api/nutrition/meal-alternatives-recommendation/',
            {'date': '2026-08-15', 'plan_meal_id': lunch_id},
        )
        assert str(tomorrow_lunch['recipeId']) == str(tomorrow_reco.data['alternatives'][0]['recipeId'])
        assert str(today_lunch['recipeId']) != str(tomorrow_lunch['recipeId'])

    def test_excluded_recipe_is_not_initial_preview(
        self, auth_client, user, three_meal_new_account_plan,
    ):
        dinner = three_meal_new_account_plan['slots'][2]
        MealRecipeExclusion.objects.create(
            user=user, recipe=dinner['light'], is_active=True,
        )
        date_str = '2026-08-14'
        plan_response = auth_client.get(
            '/api/nutrition/plan-meals-for-selection/',
            {'date': date_str},
        )
        reco = auth_client.get(
            '/api/nutrition/meal-alternatives-recommendation/',
            {'date': date_str, 'plan_meal_id': str(dinner['meal'].id)},
        )
        options = plan_response.data['options_by_meal_id'][str(dinner['meal'].id)]
        initial = options[0]
        assert str(initial['recipeId']) != str(dinner['light'].id)
        assert initial.get('is_recommended') is True
        assert str(initial['recipeId']) == str(reco.data['alternatives'][0]['recipeId'])
        excluded = [opt for opt in options if str(opt['recipeId']) == str(dinner['light'].id)]
        assert excluded
        assert excluded[0].get('is_recommended') is not True

    def test_parity_with_cambiar_on_recipe_macros_and_flag(
        self, auth_client, user, three_meal_new_account_plan,
    ):
        date_str = '2026-08-14'
        breakfast = three_meal_new_account_plan['slots'][0]
        MealLog.objects.create(
            user=user,
            date=date_str,
            plan_meal=breakfast['meal'],
            meal_type='breakfast',
            recipe=breakfast['heavy'],
            completed=True,
            calories=700,
            protein=Decimal('40'),
            carbs=Decimal('70'),
            fat=Decimal('25'),
        )
        MealRecipeExclusion.objects.create(
            user=user,
            recipe=three_meal_new_account_plan['slots'][1]['heavy'],
            is_active=True,
        )
        plan_response = auth_client.get(
            '/api/nutrition/plan-meals-for-selection/',
            {'date': date_str},
        )
        for item in three_meal_new_account_plan['slots'][1:]:
            slot_id = str(item['meal'].id)
            initial = plan_response.data['options_by_meal_id'][slot_id][0]
            reco = auth_client.get(
                '/api/nutrition/meal-alternatives-recommendation/',
                {'date': date_str, 'plan_meal_id': slot_id},
            )
            top = reco.data['alternatives'][0]
            assert str(initial['recipeId']) == str(top['recipeId'])
            assert initial['calories'] == top['calories']
            assert initial['protein'] == top['protein']
            assert initial['carbs'] == top['carbs']
            assert initial['fat'] == top['fat']
            assert initial.get('is_recommended') is True
            assert top.get('is_recommended') is True

    def test_initial_sum_matches_recommended_not_display_order(
        self, auth_client, three_meal_new_account_plan,
    ):
        date_str = '2026-08-14'
        plan_response = auth_client.get(
            '/api/nutrition/plan-meals-for-selection/',
            {'date': date_str},
        )
        recommended_sum = 0
        preview_sum = 0
        display_order_sum = 0
        for item in three_meal_new_account_plan['slots']:
            slot_id = str(item['meal'].id)
            options = plan_response.data['options_by_meal_id'][slot_id]
            preview_sum += int(options[0]['calories'])
            display_order_sum += 700
            reco = auth_client.get(
                '/api/nutrition/meal-alternatives-recommendation/',
                {'date': date_str, 'plan_meal_id': slot_id},
            )
            recommended_sum += int(reco.data['alternatives'][0]['calories'])
        assert preview_sum == recommended_sum
        assert preview_sum != display_order_sum

    def test_plan_meals_ranking_query_count_does_not_grow_per_recipe(
        self, auth_client, user, three_meal_new_account_plan,
    ):
        date_str = '2026-08-14'
        MealIngredientExclusion.objects.create(user=user, term='cebolla', is_active=True)
        with CaptureQueriesContext(connection) as baseline:
            first = auth_client.get(
                '/api/nutrition/plan-meals-for-selection/',
                {'date': date_str},
            )
        assert first.status_code == 200
        baseline_count = len(baseline.captured_queries)

        dinner = three_meal_new_account_plan['slots'][2]['meal']
        for index in range(8):
            extra = _make_recipe(
                f'Extra {index}', 300 + index * 15, 20, 25, 8, meal_types=['dinner'],
            )
            PlanMealRecipe.objects.create(
                meal=dinner, recipe=extra, display_order=20 + index, servings=Decimal('1'),
            )
        with CaptureQueriesContext(connection) as extra_ctx:
            second = auth_client.get(
                '/api/nutrition/plan-meals-for-selection/',
                {'date': date_str},
            )
        assert second.status_code == 200
        extra_count = len(extra_ctx.captured_queries)
        # Medido: 9 queries con 6 recetas y 9 con +8 recetas. Ranking in-memory.
        assert extra_count < 40, f'queries baseline={baseline_count} extra={extra_count}'
        assert extra_count <= baseline_count + 3, f'queries baseline={baseline_count} extra={extra_count}'
        assert MealLog.objects.count() == 0

    def test_same_recipe_calories_match_between_endpoints(
        self, auth_client, three_meal_new_account_plan,
    ):
        date_str = '2026-08-14'
        slot = three_meal_new_account_plan['slots'][0]
        slot_id = str(slot['meal'].id)
        plan_response = auth_client.get(
            '/api/nutrition/plan-meals-for-selection/',
            {'date': date_str},
        )
        reco = auth_client.get(
            '/api/nutrition/meal-alternatives-recommendation/',
            {'date': date_str, 'plan_meal_id': slot_id},
        )
        by_recipe_plan = {
            str(opt['recipeId']): opt for opt in plan_response.data['options_by_meal_id'][slot_id]
        }
        by_recipe_reco = {
            str(opt['recipeId']): opt for opt in reco.data['alternatives']
        }
        for recipe_id, option in by_recipe_plan.items():
            other = by_recipe_reco[recipe_id]
            assert option['calories'] == other['calories']
            assert option['protein'] == other['protein']
            assert option['carbs'] == other['carbs']
            assert option['fat'] == other['fat']

    def test_slots_do_not_reuse_the_same_option(self, auth_client, three_meal_new_account_plan):
        response = auth_client.get(
            '/api/nutrition/plan-meals-for-selection/',
            {'date': '2026-08-14'},
        )
        first_options = [
            response.data['options_by_meal_id'][str(item['meal'].id)][0]
            for item in three_meal_new_account_plan['slots']
        ]
        recipe_ids = [str(opt['recipeId']) for opt in first_options]
        option_ids = [str(opt['id']) for opt in first_options]
        assert len(set(recipe_ids)) == 3
        assert len(set(option_ids)) == 3

    def test_persisted_selection_does_not_create_completion(
        self, auth_client, three_meal_new_account_plan,
    ):
        auth_client.get(
            '/api/nutrition/plan-meals-for-selection/',
            {'date': '2026-08-14'},
        )
        assert MealLog.objects.count() == 0

