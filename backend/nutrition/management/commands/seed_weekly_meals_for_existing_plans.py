"""
Seed weekly meals for existing NutritionPlan records that don't have meals yet.

Goal:
- Adapt old/empty plans to the new weekly-meal structure (day_of_week + options per meal)
- Use existing Recipe records as test data (2-3 recipe options per meal)
- Be safe/idempotent by default: only plans with 0 meals are modified

Usage examples:
  python manage.py seed_weekly_meals_for_existing_plans
  python manage.py seed_weekly_meals_for_existing_plans --limit 5
  python manage.py seed_weekly_meals_for_existing_plans --include-user-plans
  python manage.py seed_weekly_meals_for_existing_plans --force --plan-ids <uuid> <uuid>
  python manage.py seed_weekly_meals_for_existing_plans --dry-run
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from decimal import Decimal
from typing import Iterable

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count, Q

from nutrition.models import NutritionPlan, PlanMeal, PlanMealRecipe, Recipe


DAY_KEYS = [1, 2, 3, 4, 5, 6, 7]


@dataclass(frozen=True)
class MealTemplate:
    meal_type: str
    name: str
    time: str
    order_index: int


DEFAULT_MEAL_TEMPLATES: list[MealTemplate] = [
    MealTemplate(meal_type="breakfast", name="Desayuno", time="08:00", order_index=1),
    MealTemplate(meal_type="morning_snack", name="Snack Mañana", time="10:30", order_index=2),
    MealTemplate(meal_type="lunch", name="Almuerzo", time="13:00", order_index=3),
    MealTemplate(meal_type="afternoon_snack", name="Snack Tarde", time="16:30", order_index=4),
    MealTemplate(meal_type="dinner", name="Cena", time="20:30", order_index=5),
]


MEALTYPE_TO_RECIPE_CATEGORIES: dict[str, list[str]] = {
    "breakfast": ["breakfast"],
    "morning_snack": ["snack", "breakfast"],
    "lunch": ["lunch"],
    "afternoon_snack": ["snack"],
    "dinner": ["dinner"],
    "evening_snack": ["snack"],
    "pre_workout": ["snack", "drink"],
    "post_workout": ["snack", "drink"],
}


def _to_float(x) -> float:
    try:
        if x is None:
            return 0.0
        if isinstance(x, Decimal):
            return float(x)
        return float(x)
    except Exception:
        return 0.0


def _avg_macros(recipes: Iterable[Recipe]) -> dict[str, float]:
    rs = list(recipes)
    if not rs:
        return {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
    return {
        "calories": sum((_to_float(r.calories) for r in rs)) / len(rs),
        "protein": sum((_to_float(r.protein) for r in rs)) / len(rs),
        "carbs": sum((_to_float(r.carbs) for r in rs)) / len(rs),
        "fat": sum((_to_float(r.fat) for r in rs)) / len(rs),
    }


class Command(BaseCommand):
    help = "Seed weekly meals (day_of_week) and recipe options for existing nutrition plans that are missing meals."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Do not write to DB; only print what would change.")
        parser.add_argument("--force", action="store_true", help="Overwrite meals even if the plan already has some.")
        parser.add_argument(
            "--ensure-full-day",
            action="store_true",
            help="Ensure each day has a full set of meals (default 5). Adds missing meals without deleting existing ones.",
        )
        parser.add_argument(
            "--target-meals-per-day",
            type=int,
            default=5,
            help="When using --ensure-full-day, how many meals per day to guarantee (max 5 with current templates). Default: 5.",
        )
        parser.add_argument("--limit", type=int, default=10, help="Max number of plans to seed (default: 10).")
        parser.add_argument(
            "--include-user-plans",
            action="store_true",
            help="Also seed plans assigned to users (default seeds only templates/system: user is null).",
        )
        parser.add_argument(
            "--plan-ids",
            nargs="*",
            default=[],
            help="Optional list of NutritionPlan UUIDs to seed explicitly.",
        )
        parser.add_argument(
            "--options-per-meal",
            type=int,
            default=3,
            help="How many recipe options to assign per meal (default: 3).",
        )
        parser.add_argument(
            "--update-plan-macros",
            action="store_true",
            help="Update plan daily_calories/protein_grams/carbs_grams/fat_grams from seeded meals (average across days).",
        )

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]
        force: bool = options["force"]
        ensure_full_day: bool = options["ensure_full_day"]
        target_meals_per_day: int = max(1, min(int(options["target_meals_per_day"] or 5), len(DEFAULT_MEAL_TEMPLATES)))
        limit: int = options["limit"]
        include_user_plans: bool = options["include_user_plans"]
        plan_ids: list[str] = options["plan_ids"] or []
        options_per_meal: int = max(1, int(options["options_per_meal"] or 3))
        update_plan_macros: bool = options["update_plan_macros"]

        recipes_qs = Recipe.objects.filter(is_active=True)
        recipes_count = recipes_qs.count()
        if recipes_count == 0:
            self.stdout.write(self.style.ERROR("❌ No hay recetas activas para usar como datos de prueba."))
            return

        self.stdout.write(self.style.SUCCESS("🍽️  Seed de semana para planes de menús"))
        self.stdout.write(f"📚 Recetas activas disponibles: {recipes_count}")

        plans_qs = NutritionPlan.objects.all().annotate(meals_count=Count("meals"))
        if plan_ids:
            plans_qs = plans_qs.filter(id__in=plan_ids)
        else:
            if not include_user_plans:
                plans_qs = plans_qs.filter(user__isnull=True)
            # Por seguridad, sólo los que no tienen comidas, salvo --force
            if not force and not ensure_full_day:
                plans_qs = plans_qs.filter(meals_count=0)

        plans = list(plans_qs.order_by("-created_at")[:limit])
        self.stdout.write(f"📦 Planes objetivo: {len(plans)} (limit={limit}, force={force}, include_user_plans={include_user_plans})")

        if not plans:
            self.stdout.write(self.style.WARNING("⚠️  No hay planes que cumplan el filtro (quizá ya tienen comidas)."))
            return

        # Seed deterministic enough
        rnd = random.Random()

        seeded = 0
        for plan in plans:
            try:
                self._seed_plan(
                    plan=plan,
                    recipes_qs=recipes_qs,
                    rnd=rnd,
                    options_per_meal=options_per_meal,
                    dry_run=dry_run,
                    force=force,
                    ensure_full_day=ensure_full_day,
                    target_meals_per_day=target_meals_per_day,
                    update_plan_macros=update_plan_macros,
                )
                seeded += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Error seed plan {plan.id} ({plan.name}): {e}"))

        self.stdout.write(self.style.SUCCESS(f"✅ Completado. Planes procesados: {seeded}"))
        if dry_run:
            self.stdout.write(self.style.WARNING("🧪 DRY-RUN: no se escribieron cambios en la base de datos."))

    @transaction.atomic
    def _seed_plan(
        self,
        *,
        plan: NutritionPlan,
        recipes_qs,
        rnd: random.Random,
        options_per_meal: int,
        dry_run: bool,
        force: bool,
        ensure_full_day: bool,
        target_meals_per_day: int,
        update_plan_macros: bool,
    ):
        existing_meals = plan.meals.count()
        if existing_meals > 0 and not force and not ensure_full_day:
            self.stdout.write(self.style.WARNING(f"⏭️  {plan.name}: ya tiene {existing_meals} comidas; omitido (usa --force)."))
            return

        self.stdout.write(f"\n🧩 Seeding: {plan.name}  (id={plan.id})")

        if dry_run:
            self.stdout.write("   DRY-RUN: se omite escritura (pero se simula selección).")
            return

        if force and existing_meals > 0:
            plan.meals.all().delete()

        # Pick templates based on meals_per_day (cap to defaults)
        if ensure_full_day:
            templates = DEFAULT_MEAL_TEMPLATES[:target_meals_per_day]
        else:
            templates = DEFAULT_MEAL_TEMPLATES[: max(1, min(int(plan.meals_per_day or 5), len(DEFAULT_MEAL_TEMPLATES)))]

        day_totals = []
        for day in DAY_KEYS:
            meals_for_day = []
            for t in templates:
                if ensure_full_day and not force:
                    meal = PlanMeal.objects.filter(plan=plan, day_of_week=day, meal_type=t.meal_type).first()
                else:
                    meal = None

                if meal is None:
                    meal = PlanMeal.objects.create(
                        plan=plan,
                        day_of_week=day,
                        name=f"{t.name} ({day})",
                        meal_type=t.meal_type,
                        time=t.time,
                        calories=0,
                        protein=0,
                        carbs=0,
                        fat=0,
                        description="",
                        order_index=t.order_index,
                    )
                else:
                    # Ensure order/time are sane
                    changed = False
                    if meal.order_index != t.order_index:
                        meal.order_index = t.order_index
                        changed = True
                    if meal.time and str(meal.time) != t.time:
                        # keep existing manual time; do not override unless empty
                        pass
                    if not meal.time:
                        meal.time = t.time
                        changed = True
                    if changed:
                        meal.save(update_fields=["order_index", "time"])

                cats = MEALTYPE_TO_RECIPE_CATEGORIES.get(t.meal_type, ["lunch"])
                suitable = recipes_qs.filter(Q(category__in=cats) | Q(meal_types__overlap=cats))
                if suitable.count() < options_per_meal:
                    suitable = recipes_qs.filter(category__in=cats)
                if suitable.count() < options_per_meal:
                    suitable = recipes_qs

                candidates = list(suitable[:500])
                if not candidates:
                    candidates = list(recipes_qs[:500])
                picked = rnd.sample(candidates, k=min(options_per_meal, len(candidates)))

                # If ensure_full_day: only seed options when missing (idempotent)
                has_options = PlanMealRecipe.objects.filter(meal=meal).exists() or meal.suggested_recipes.exists()
                if force or (not ensure_full_day) or (ensure_full_day and not has_options):
                    meal.suggested_recipes.set(picked)
                    PlanMealRecipe.objects.filter(meal=meal).delete()
                    for idx, r in enumerate(picked):
                        PlanMealRecipe.objects.create(
                            meal=meal,
                            recipe=r,
                            servings=1.0,
                            display_order=idx,
                        )

                # Always recompute meal macros based on assigned options
                recipes_for_avg = list(meal.suggested_recipes.all())
                avg = _avg_macros(recipes_for_avg)
                meal.calories = int(round(avg["calories"]))
                meal.protein = round(Decimal(str(avg["protein"])), 2)
                meal.carbs = round(Decimal(str(avg["carbs"])), 2)
                meal.fat = round(Decimal(str(avg["fat"])), 2)
                meal.save(update_fields=["calories", "protein", "carbs", "fat"])

                meals_for_day.append(meal)

            # total day = sum of meal averages
            day_totals.append(
                {
                    "calories": sum(m.calories for m in meals_for_day),
                    "protein": sum(float(m.protein) for m in meals_for_day),
                    "carbs": sum(float(m.carbs) for m in meals_for_day),
                    "fat": sum(float(m.fat) for m in meals_for_day),
                }
            )

        if update_plan_macros and day_totals:
            avg_day = {
                "calories": sum(d["calories"] for d in day_totals) / len(day_totals),
                "protein": sum(d["protein"] for d in day_totals) / len(day_totals),
                "carbs": sum(d["carbs"] for d in day_totals) / len(day_totals),
                "fat": sum(d["fat"] for d in day_totals) / len(day_totals),
            }
            plan.daily_calories = int(round(avg_day["calories"]))
            plan.protein_grams = int(round(avg_day["protein"]))
            plan.carbs_grams = int(round(avg_day["carbs"]))
            plan.fat_grams = int(round(avg_day["fat"]))
            plan.save(update_fields=["daily_calories", "protein_grams", "carbs_grams", "fat_grams"])

        self.stdout.write(self.style.SUCCESS(f"   ✅ Semana creada: {plan.meals.count()} comidas (7 días)"))
