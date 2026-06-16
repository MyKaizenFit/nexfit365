"""
Reasigna plantillas inválidas en configuraciones por defecto legacy.

Las configuraciones antiguas pueden apuntar a planes del sistema, planes de usuarios
o plantillas inactivas. Este comando las reasigna a plantillas [AUTO-DEFECTO] válidas.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.default_plan_templates import AUTO_DEFAULT_PREFIX
from accounts.services import is_assignable_nutrition_template, is_assignable_workout_template
from dashboard.models import DefaultPlanConfiguration
from nutrition.models import NutritionPlan
from workouts.models import WorkoutProgram


def _pick_auto_default_nutrition():
    return (
        NutritionPlan.objects.filter(
            name__startswith=AUTO_DEFAULT_PREFIX,
            is_template=True,
            is_active=True,
            is_system=False,
            user__isnull=True,
        )
        .order_by("name")
        .first()
    )


def _pick_auto_default_workout():
    return (
        WorkoutProgram.objects.filter(
            name__startswith=AUTO_DEFAULT_PREFIX,
            is_template=True,
            is_active=True,
            is_system=False,
            user__isnull=True,
        )
        .order_by("name")
        .first()
    )


class Command(BaseCommand):
    help = (
        "Reasigna plantillas inválidas en DefaultPlanConfiguration "
        "a copias [AUTO-DEFECTO] válidas."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Solo muestra qué cambiaría, sin guardar.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        fallback_nutrition = _pick_auto_default_nutrition()
        fallback_workout = _pick_auto_default_workout()

        if not fallback_nutrition or not fallback_workout:
            self.stdout.write(
                self.style.ERROR(
                    "No hay plantillas [AUTO-DEFECTO] disponibles. "
                    "Ejecuta seed_default_plan_configurations o asigna planes a un usuario "
                    "para que se generen automáticamente."
                )
            )
            return

        configs = DefaultPlanConfiguration.objects.select_related(
            "default_nutrition_plan",
            "default_workout_program",
        ).all()

        fixed = 0
        skipped = 0

        for config in configs:
            needs_nutrition = (
                config.default_nutrition_plan_id
                and not is_assignable_nutrition_template(config.default_nutrition_plan)
            )
            needs_workout = (
                config.default_workout_program_id
                and not is_assignable_workout_template(config.default_workout_program)
            )

            if not needs_nutrition and not needs_workout:
                skipped += 1
                continue

            new_nutrition = fallback_nutrition if needs_nutrition else config.default_nutrition_plan
            new_workout = fallback_workout if needs_workout else config.default_workout_program

            self.stdout.write(
                f"{'[DRY-RUN] ' if dry_run else ''}Fix {config.name} (id={config.id}): "
                f"nutri={'→ ' + new_nutrition.name if needs_nutrition else 'OK'}, "
                f"workout={'→ ' + new_workout.name if needs_workout else 'OK'}"
            )

            if not dry_run:
                if needs_nutrition:
                    config.default_nutrition_plan = new_nutrition
                if needs_workout:
                    config.default_workout_program = new_workout
                config.save(update_fields=[
                    "default_nutrition_plan",
                    "default_workout_program",
                    "updated_at",
                ])
            fixed += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Listo: {fixed} configuraciones {'simuladas' if dry_run else 'corregidas'}, "
                f"{skipped} ya válidas."
            )
        )
