"""
Recalcula comidas y objetivos diarios en planes nutricionales existentes.

Corrige planes legacy donde:
- meals_per_day no coincide con comidas reales
- las comidas no suman el objetivo diario (p. ej. diseñadas para 4 comidas con 3 activas)
- hay desajuste tras añadir/quitar comidas antes del fix de rebalanceo

Uso:
  python manage.py rebalance_all_nutrition_plans --dry-run
  python manage.py rebalance_all_nutrition_plans
  python manage.py rebalance_all_nutrition_plans --only-mismatch
  python manage.py rebalance_all_nutrition_plans --plan-ids <uuid> ...
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count, Prefetch

from nutrition.models import NutritionPlan, PlanMeal
from nutrition.plan_meal_utils import (
    compute_average_day_macros,
    compute_meals_per_day,
    finalize_plan_after_meal_changes,
    group_meals_by_day_key,
    resolve_meals_for_calendar_day,
)


def _reference_day_totals(plan: NutritionPlan) -> tuple[int, int, int]:
    """Devuelve (meals_per_day, suma_kcal_día_referencia, meals_per_day_guardado)."""
    meals = list(plan.meals.all())
    stored_mpd = int(plan.meals_per_day or 0)
    actual_mpd = compute_meals_per_day(plan)

    groups = group_meals_by_day_key(meals)
    specific_keys = [(w, d) for (w, d) in groups if d is not None]
    keys = specific_keys or [(w, d) for (w, d) in groups if d is None]

    day_calories = 0
    if keys:
        week, day = keys[0]
        if day is not None:
            day_meals = resolve_meals_for_calendar_day(meals, day, week)
        else:
            day_meals = groups.get((week, None), [])
        day_calories = sum(int(m.calories or 0) for m in day_meals)

    return actual_mpd, day_calories, stored_mpd


def plan_needs_rebalance(plan: NutritionPlan) -> bool:
    if not plan.meals.exists():
        return False

    actual_mpd, day_calories, stored_mpd = _reference_day_totals(plan)
    target_cal = int(plan.daily_calories or 0)

    if stored_mpd != actual_mpd and actual_mpd > 0:
        return True

    if target_cal > 0 and day_calories > 0 and abs(day_calories - target_cal) > max(25, target_cal * 0.02):
        return True

    avg = compute_average_day_macros(plan)
    if target_cal > 0 and avg and abs(int(round(avg['calories'])) - target_cal) > max(25, target_cal * 0.02):
        return True

    return False


class Command(BaseCommand):
    help = "Rebalancea comidas y actualiza meals_per_day en planes nutricionales existentes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Solo muestra qué planes se corregirían.",
        )
        parser.add_argument(
            "--only-mismatch",
            action="store_true",
            help="Procesa solo planes con desajuste detectado.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Máximo de planes a procesar (0 = sin límite).",
        )
        parser.add_argument(
            "--plan-ids",
            nargs="*",
            default=None,
            help="UUIDs concretos de planes a procesar.",
        )
        parser.add_argument(
            "--include-inactive",
            action="store_true",
            help="Incluir planes inactivos.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        only_mismatch = options["only_mismatch"]
        limit = int(options["limit"] or 0)
        plan_ids = options["plan_ids"]
        include_inactive = options["include_inactive"]

        qs = (
            NutritionPlan.objects.annotate(meal_count=Count("meals"))
            .filter(meal_count__gt=0)
            .prefetch_related(
                Prefetch("meals", queryset=PlanMeal.objects.order_by("week_number", "day_of_week", "order_index"))
            )
            .order_by("name")
        )
        if not include_inactive:
            qs = qs.filter(is_active=True)
        if plan_ids:
            qs = qs.filter(id__in=plan_ids)

        plans = list(qs)
        if limit > 0:
            plans = plans[:limit]

        fixed = 0
        skipped = 0
        examined = 0

        self.stdout.write(self.style.SUCCESS(f"== Rebalanceo de planes nutricionales ({len(plans)} candidatos) =="))

        for plan in plans:
            examined += 1
            if only_mismatch and not plan_needs_rebalance(plan):
                skipped += 1
                continue

            before_mpd, before_day_cal, stored_mpd = _reference_day_totals(plan)
            before_target = int(plan.daily_calories or 0)

            preserve_cal = before_target if before_target > 0 else None
            preserve_protein = int(plan.protein_grams) if plan.protein_grams is not None else None
            preserve_carbs = int(plan.carbs_grams) if plan.carbs_grams is not None else None
            preserve_fat = int(plan.fat_grams) if plan.fat_grams is not None else None

            self.stdout.write(
                f"{'[DRY-RUN] ' if dry_run else ''}{plan.name} ({plan.id}): "
                f"mpd {stored_mpd}->{before_mpd}, "
                f"día≈{before_day_cal} kcal, objetivo={before_target or '—'}"
            )

            if dry_run:
                fixed += 1
                continue

            try:
                with transaction.atomic():
                    finalize_plan_after_meal_changes(
                        plan,
                        preserve_daily_calories=preserve_cal,
                        preserve_protein=preserve_protein,
                        preserve_carbs=preserve_carbs,
                        preserve_fat=preserve_fat,
                    )
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"  ✗ Error: {exc}"))
                continue

            plan.refresh_from_db()
            after_mpd, after_day_cal, _ = _reference_day_totals(plan)
            self.stdout.write(
                self.style.SUCCESS(
                    f"  → mpd={after_mpd}, suma día={after_day_cal}, objetivo={plan.daily_calories}"
                )
            )
            fixed += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Listo: {examined} examinados, {fixed} {'simulados' if dry_run else 'corregidos'}, {skipped} omitidos."
            )
        )
