"""Corrige day_of_week inconsistente a partir de day_number y recalcula days_per_week."""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from workouts.models import WorkoutProgram
from workouts.services import DefaultWorkoutAssignmentService
from workouts.workout_week_utils import day_of_week_for_day_number


class Command(BaseCommand):
    help = (
        "Repara day_of_week de WorkoutDay según day_number "
        "(p. ej. semanas 2+ guardadas todas como monday) y recalcula days_per_week."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Aplica los cambios (por defecto solo informa).",
        )
        parser.add_argument(
            "--email",
            type=str,
            help="Limitar a programas del usuario con este email.",
        )
        parser.add_argument(
            "--program-id",
            type=str,
            help="Limitar a un programa concreto.",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        email = options.get("email")
        program_id = options.get("program_id")

        programs = WorkoutProgram.objects.all().order_by("-updated_at")
        if program_id:
            programs = programs.filter(id=program_id)
        elif email:
            programs = programs.filter(user__email__iexact=email)

        fixed_days = 0
        fixed_programs = 0

        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"Reparación day_of_week ({'APLICAR' if apply else 'DRY-RUN'})"
            )
        )

        for program in programs.iterator():
            days = list(program.days.all())
            day_changes = 0
            with transaction.atomic():
                for day in days:
                    expected = day_of_week_for_day_number(day.day_number or 1)
                    if (day.day_of_week or "").lower() != expected:
                        day_changes += 1
                        if apply:
                            day.day_of_week = expected
                            day.save(update_fields=["day_of_week"])

                inferred = DefaultWorkoutAssignmentService.infer_weekly_training_days(program)
                dpw_changed = inferred and program.days_per_week != inferred
                if dpw_changed and apply:
                    program.days_per_week = inferred
                    program.save(update_fields=["days_per_week", "updated_at"])

                if day_changes or dpw_changed:
                    fixed_programs += 1
                    fixed_days += day_changes
                    owner = getattr(program.user, "email", None) or "template"
                    self.stdout.write(
                        f"{owner} | {program.name[:50]} | "
                        f"days_fixed={day_changes} days_per_week="
                        f"{program.days_per_week}->{inferred if dpw_changed else program.days_per_week}"
                    )

                if not apply:
                    transaction.set_rollback(True)

        self.stdout.write("")
        if apply:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Programas tocados: {fixed_programs}, días corregidos: {fixed_days}"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"Programas a tocar: {fixed_programs}, días a corregir: {fixed_days}"
                )
            )
            self.stdout.write("Ejecuta con --apply para persistir.")
