"""
Generación inteligente de lista de compra:
- Una receta por comida (selección del usuario o principal del plan, no todas las equivalencias)
- Agrupación de alimentos similares por categoría de equivalencia / food_id
- Normalización básica de unidades cuando es posible
"""
from __future__ import annotations

import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, Optional

from django.db.models import Q
from django.utils import timezone

from .models import Food, MealLog, NutritionPlan, PlanMeal, Recipe, RecipeIngredient

CATEGORY_LABELS: dict[str, str] = {
    "verduras": "Verdura y hortalizas",
    "hortalizas": "Verdura y hortalizas",
    "fruta": "Fruta",
    "carnes": "Carnes y pescados",
    "pescados": "Carnes y pescados",
    "pescado": "Carnes y pescados",
    "huevos": "Huevos y lácteos",
    "lacteos": "Huevos y lácteos",
    "arroz_cereales": "Cereales y legumbres",
    "cereales": "Cereales y legumbres",
    "legumbres": "Cereales y legumbres",
    "panes": "Pan y cereales",
    "aceites": "Aceites y condimentos",
    "grasas": "Aceites y condimentos",
    "frutos_secos": "Frutos secos y semillas",
    "bebidas": "Bebidas",
    "otros": "Otros",
}

NAME_MODIFIER_SUFFIXES = (
    " virgen extra",
    " extra virgen",
    " al natural",
    " enlatado",
    " en conserva",
)


def parse_qty(value, default: float = 0.0) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if value is None:
        return float(default)
    text = str(value).strip()
    if not text:
        return float(default)
    match = re.search(r"[-+]?\d*\.?\d+", text)
    if not match:
        return float(default)
    try:
        return float(match.group(0))
    except ValueError:
        return float(default)


def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def normalize_name_hint(name: str) -> str:
    text = _strip_accents((name or "").lower().strip())
    for suffix in NAME_MODIFIER_SUFFIXES:
        if text.endswith(suffix):
            text = text[: -len(suffix)].strip()
    return re.sub(r"\s+", " ", text)


def shopping_category_label(food: Optional[Food]) -> str:
    if not food:
        return "Otros"
    equiv = food.get_equivalence_categories()
    if equiv:
        return CATEGORY_LABELS.get(equiv[0], equiv[0].replace("_", " ").title())
    if food.category:
        return food.category.strip().title()
    return "Otros"


def shopping_group_key(food: Optional[Food], name: str) -> tuple[str, str]:
    if food:
        equiv = food.get_equivalence_categories()
        if equiv:
            return ("equiv", equiv[0])
        return ("food", str(food.id))
    return ("name", normalize_name_hint(name))


def normalize_unit(quantity: float, unit: str, food: Optional[Food]) -> tuple[float, str]:
    normalized = (unit or "g").strip().lower() or "g"
    if normalized in {"g", "gr", "gramo", "gramos"}:
        return quantity, "g"
    if normalized in {"ml", "mililitro", "mililitros"}:
        return quantity, "ml"
    if normalized in {"ud", "uds", "unidad", "unidades", "lata", "latas", "u"}:
        if food and str(food.serving_unit or "").lower() in {"g", "gr", "gramos"} and food.serving_size:
            try:
                return float(quantity) * float(food.serving_size), "g"
            except (TypeError, ValueError):
                pass
        return quantity, "ud"
    return quantity, normalized


def pick_display_name(names: set[str]) -> str:
    cleaned = sorted({n.strip() for n in names if n and n.strip()}, key=len)
    if not cleaned:
        return "Producto"
    if len(cleaned) == 1:
        return cleaned[0]
    shortest = cleaned[0]
    # Nombre genérico: el más corto que sigue siendo descriptivo
    for candidate in cleaned:
        if len(candidate) <= len(shortest) + 8:
            shortest = candidate
            break
    return shortest


def resolve_recipe_for_meal(user, meal: PlanMeal, date) -> Optional[Recipe]:
    log = (
        MealLog.objects.filter(user=user, date=date, plan_meal=meal)
        .select_related("recipe")
        .first()
    )
    if not log:
        log = (
            MealLog.objects.filter(user=user, date=date, meal_type=meal.meal_type, plan_meal__isnull=True)
            .select_related("recipe")
            .first()
        )
    if log and log.recipe_id:
        return log.recipe

    meal_recipe = meal.meal_recipes.order_by("display_order", "created_at").first()
    if meal_recipe and meal_recipe.recipe_id:
        return meal_recipe.recipe

    return meal.suggested_recipes.order_by("id").first()


@dataclass
class AggregatedItem:
    name: str = ""
    unit: str = "g"
    quantity: float = 0.0
    variants: set[str] = field(default_factory=set)
    recipes: set[str] = field(default_factory=set)
    category: str = "Otros"
    group_key: tuple[str, str] = ("name", "")


def build_shopping_list(user, plan: NutritionPlan, days: int) -> dict[str, Any]:
    days = max(1, min(int(days), 31))
    today = timezone.localdate()

    plan = (
        NutritionPlan.objects.filter(pk=plan.pk)
        .prefetch_related(
            "meals",
            "meals__meal_recipes__recipe__recipe_ingredients__food",
            "meals__suggested_recipes__recipe_ingredients__food",
        )
        .first()
    )
    if not plan:
        return {
            "plan_name": None,
            "days": days,
            "items": [],
            "total_items": 0,
            "stats": {"recipes_considered": 0, "raw_lines": 0, "merged_from": 0},
        }

    meals_by_id = {meal.id: meal for meal in plan.meals.all()}
    raw_lines = 0
    recipes_seen: set[str] = set()
    grouped: dict[tuple, AggregatedItem] = {}

    def add_ingredient(
        *,
        food: Optional[Food],
        name: str,
        unit: str,
        quantity: float,
        recipe_name: str,
    ) -> None:
        nonlocal raw_lines
        if quantity <= 0 or not (name or "").strip():
            return
        raw_lines += 1
        qty, normalized_unit = normalize_unit(quantity, unit, food)
        group_key = shopping_group_key(food, name)
        bucket_key = (*group_key, normalized_unit)
        entry = grouped.get(bucket_key)
        if not entry:
            entry = AggregatedItem(
                group_key=group_key,
                unit=normalized_unit,
                category=shopping_category_label(food),
            )
            grouped[bucket_key] = entry

        display_name = (food.name if food else name).strip()
        entry.variants.add(display_name)
        entry.name = pick_display_name(entry.variants)
        entry.category = shopping_category_label(food)
        entry.quantity += qty

        if recipe_name:
            entry.recipes.add(recipe_name)

    def add_recipe_ingredients(recipe: Recipe, recipe_name: str) -> None:
        recipes_seen.add(recipe_name or recipe.name)
        ingredients_qs = recipe.recipe_ingredients.select_related("food").all()
        if ingredients_qs.exists():
            for ingredient in ingredients_qs:
                add_ingredient(
                    food=ingredient.food,
                    name=ingredient.food.name if ingredient.food else "",
                    unit=ingredient.unit or "g",
                    quantity=parse_qty(ingredient.quantity, 0),
                    recipe_name=recipe_name,
                )
            return

        if isinstance(recipe.ingredients, list):
            for raw_item in recipe.ingredients:
                if not isinstance(raw_item, dict):
                    continue
                item_name = str(raw_item.get("name") or "").strip()
                item_unit = str(raw_item.get("unit") or "g").strip() or "g"
                item_qty = parse_qty(raw_item.get("amount") or raw_item.get("quantity"), 0)
                add_ingredient(
                    food=None,
                    name=item_name,
                    unit=item_unit,
                    quantity=item_qty,
                    recipe_name=recipe_name,
                )

    from nutrition.plan_week_utils import resolve_plan_week_number

    for offset in range(days):
        date = today + timedelta(days=offset)
        weekday = date.isoweekday()
        plan_week = resolve_plan_week_number(plan, date)
        week_meals = [meal for meal in meals_by_id.values() if (meal.week_number or 1) == plan_week]
        if not week_meals:
            week_meals = [meal for meal in meals_by_id.values() if (meal.week_number or 1) == 1]
        day_meals = [
            meal
            for meal in week_meals
            if meal.day_of_week is None or meal.day_of_week == weekday
        ]
        for meal in day_meals:
            recipe = resolve_recipe_for_meal(user, meal, date)
            if recipe:
                add_recipe_ingredients(recipe, recipe.name)

    items = []
    for entry in grouped.values():
        variant_note = None
        if len(entry.variants) > 1:
            others = sorted(v for v in entry.variants if v != entry.name)
            if others:
                variant_note = f"También aparece como: {', '.join(others[:3])}"
        items.append(
            {
                "name": entry.name,
                "quantity": round(entry.quantity, 1 if entry.unit in {"ud", "ml"} else 0),
                "unit": entry.unit,
                "recipes": sorted(entry.recipes),
                "category": entry.category,
                "variants": sorted(entry.variants),
                "variant_note": variant_note,
            }
        )

    category_order = {label: idx for idx, label in enumerate(CATEGORY_LABELS.values())}
    items.sort(
        key=lambda item: (
            category_order.get(item["category"], 99),
            item["name"].lower(),
        )
    )

    merged_from = max(0, raw_lines - len(items))
    return {
        "plan_name": plan.name,
        "days": days,
        "items": items,
        "total_items": len(items),
        "stats": {
            "recipes_considered": len(recipes_seen),
            "raw_lines": raw_lines,
            "merged_from": merged_from,
        },
        "generated_at": timezone.now().isoformat(),
    }
