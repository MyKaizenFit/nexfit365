import pytest
from django.utils import timezone

from nutrition.models import Food, NutritionPlan, PlanMeal, PlanMealRecipe, Recipe, RecipeIngredient
from nutrition.shopping_list_service import build_shopping_list, shopping_group_key


@pytest.mark.django_db
def test_shopping_list_uses_primary_recipe_not_all_alternatives(regular_user):
    plan = NutritionPlan.objects.create(name="Plan test", is_active=True, user=regular_user)
    meal = PlanMeal.objects.create(plan=plan, name="Desayuno", meal_type="breakfast")

    recipe_a = Recipe.objects.create(name="Receta A", is_active=True)
    recipe_b = Recipe.objects.create(name="Receta B", is_active=True)

    food_a = Food.objects.create(name="Avena", equivalence_category="cereales")
    food_b = Food.objects.create(name="Arroz basmati", equivalence_category="arroz_cereales")

    RecipeIngredient.objects.create(recipe=recipe_a, food=food_a, quantity=100, unit="g")
    RecipeIngredient.objects.create(recipe=recipe_b, food=food_b, quantity=200, unit="g")

    PlanMealRecipe.objects.create(meal=meal, recipe=recipe_a, display_order=1)
    PlanMealRecipe.objects.create(meal=meal, recipe=recipe_b, display_order=2)

    result = build_shopping_list(regular_user, plan, days=1)
    names = {item["name"] for item in result["items"]}

    assert "Avena" in names
    assert "Arroz basmati" not in names
    assert result["stats"]["recipes_considered"] == 1


@pytest.mark.django_db
def test_shopping_list_merges_equivalence_category(regular_user):
    plan = NutritionPlan.objects.create(name="Plan merge", is_active=True, user=regular_user)
    meal = PlanMeal.objects.create(plan=plan, name="Comida", meal_type="lunch")

    recipe = Recipe.objects.create(name="Receta aceite", is_active=True)
    olive = Food.objects.create(name="Aceite de oliva", equivalence_category="aceites")
    evoo = Food.objects.create(name="Aceite de oliva virgen extra", equivalence_category="aceites")

    RecipeIngredient.objects.create(recipe=recipe, food=olive, quantity=75, unit="ml")
    PlanMealRecipe.objects.create(meal=meal, recipe=recipe, display_order=1)

    meal2 = PlanMeal.objects.create(plan=plan, name="Cena", meal_type="dinner")
    recipe2 = Recipe.objects.create(name="Receta ensalada", is_active=True)
    RecipeIngredient.objects.create(recipe=recipe2, food=evoo, quantity=45, unit="ml")
    PlanMealRecipe.objects.create(meal=meal2, recipe=recipe2, display_order=1)

    result = build_shopping_list(regular_user, plan, days=1)
    oil_items = [item for item in result["items"] if item["category"] == "Aceites y condimentos"]

    assert len(oil_items) == 1
    assert oil_items[0]["quantity"] == 120
    assert len(oil_items[0]["variants"]) == 2


def test_shopping_group_key_prefers_equivalence():
    food = Food(name="Arroz blanco", equivalence_categories=["arroz_cereales"])
    assert shopping_group_key(food, food.name) == ("equiv", "arroz_cereales")
