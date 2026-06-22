"""Reinicia planes activos que hayan completado su ciclo y sincroniza duration_weeks."""

from django.core.management.base import BaseCommand
from django.utils import timezone

from workouts.models import WorkoutProgram
from workouts.program_lifecycle import is_program_completed, program_duration_weeks_from_plan
from workouts.services import rollover_program_cycle_if_completed, reset_weekly_workout_plan_if_needed


class Command(BaseCommand):
    help = "Sincroniza duración de planes activos y reinicia ciclos completados"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Solo muestra qué planes se reiniciarían",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        today = timezone.now().date()

        programs = (
            WorkoutProgram.objects.filter(is_active=True, user_id__isnull=False)
            .select_related("user")
            .prefetch_related("days")
        )

        synced = 0
        rolled = 0
        completed = 0

        for program in programs:
            duration = program_duration_weeks_from_plan(program)
            would_complete = is_program_completed(program, today)
            if would_complete:
                completed += 1

            if dry_run:
                if would_complete:
                    self.stdout.write(
                        f"ROLLOVER {program.user.email}: {program.name[:50]} "
                        f"(dur={duration}, start={program.start_date}, end={program.end_date})"
                    )
                elif (program.duration_weeks or 0) != duration:
                    self.stdout.write(
                        f"SYNC {program.user.email}: duration {program.duration_weeks} -> {duration}"
                    )
                continue

            before_duration = program.duration_weeks
            program = reset_weekly_workout_plan_if_needed(program)
            if (program.duration_weeks or 0) != (before_duration or 0):
                synced += 1

            before_start = program.start_date
            program = rollover_program_cycle_if_completed(program)
            if program.start_date != before_start:
                rolled += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Reiniciado: {program.user.email} — {program.name[:50]} "
                        f"(nuevo start={program.start_date})"
                    )
                )

        if dry_run:
            self.stdout.write(f"Completados detectados: {completed} / {programs.count()}")
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Listo. Duración sincronizada: {synced}. Planes reiniciados: {rolled}. "
                f"Completados al inicio: {completed}."
            )
        )
