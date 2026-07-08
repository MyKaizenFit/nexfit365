"""
Sincroniza semanas de planes nutricionales multi-semana.

Copia la semana origen (por defecto 1) al resto del ciclo cuando hay
estructuras distintas entre semanas (p. ej. semana 1 con 3 comidas y
semana 3 con 4).

Uso:
  python manage.py sync_nutrition_plan_weeks --dry-run
  python manage.py sync_nutrition_plan_weeks --only-inconsistent
  python manage.py sync_nutrition_plan_weeks --plan-ids <uuid> ...
  python manage.py sync_nutrition_plan_weeks --source-week 1
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count

from nutrition.models import NutritionPlan
from nutrition.plan_meal_utils import finalize_plan_after_meal_changes
from nutrition.plan_week_sync import plan_has_inconsistent_week_structure, sync_plan_meals_from_week


class Command(BaseCommand):
    help = "Copia la semana origen a las demás semanas de planes nutricionales."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Solo muestra qué planes se sincronizarían.")
        parser.add_argument(
            "--only-inconsistent",
            action="store_true",
            help="Procesa solo planes con estructura distinta entre semanas.",
        )
        parser.add_argument("--source-week", type=int, default=1, help="Semana origen (default: 1).")
        parser.add_argument("--plan-ids", nargs="*", default=None, help="UUIDs concretos de planes.")
        parser.add_argument("--include-inactive", action="store_true", help="Incluir planes inactivos.")
        parser.add_argument("--limit", type=int, default=0, help="Máximo de planes (0 = sin límite).")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        only_inconsistent = options["only_inconsistent"]
        source_week = max(1, int(options["source_week"] or 1))
        plan_ids = options["plan_ids"]
        include_inactive = options["include_inactive"]
        limit = int(options["limit"] or 0)

        qs = (
            NutritionPlan.objects.annotate(meal_count=Count("meals"))
            .filter(meal_count__gt=0)
            .prefetch_related("meals")
            .order_by("name")
        )
        if not include_inactive:
            qs = qs.filter(is_active=True)
        if plan_ids:
            qs = qs.filter(id__in=plan_ids)

        plans = list(qs)
        if limit > 0:
            plans = plans[:limit]

        synced = 0
        skipped = 0

        self.stdout.write(self.style.SUCCESS(f"== Sync semanas nutrición ({len(plans)} candidatos) =="))

        for plan in plans:
            if only_inconsistent and not plan_has_inconsistent_week_structure(plan):
                skipped += 1
                continue

            prefix = "[DRY-RUN] " if dry_run else ""
            self.stdout.write(f"{prefix}{plan.name} ({plan.id})")

            if dry_run:
                synced += 1
                continue

            try:
                with transaction.atomic():
                    result = sync_plan_meals_from_week(plan, source_week=source_week)
                    if result.get("skipped"):
                        self.stdout.write(self.style.WARNING(f"  omitido: {result.get('reason')}"))
                        skipped += 1
                        continue

                    finalize_plan_after_meal_changes(
                        plan,
                        preserve_daily_calories=int(plan.daily_calories or 0) or None,
                        preserve_protein=int(plan.protein_grams) if plan.protein_grams is not None else None,
                        preserve_carbs=int(plan.carbs_grams) if plan.carbs_grams is not None else None,
                        preserve_fat=int(plan.fat_grams) if plan.fat_grams is not None else None,
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  → semanas {result['target_weeks']}: "
                            f"-{result['deleted_meals']} +{result['created_meals']} comidas"
                        )
                    )
                    synced += 1
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"  ✗ Error: {exc}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Listo: {synced} {'simulados' if dry_run else 'sincronizados'}, {skipped} omitidos."
            )
        )
