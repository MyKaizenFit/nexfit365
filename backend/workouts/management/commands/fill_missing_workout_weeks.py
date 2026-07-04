"""Rellena semanas futuras vacías en planes multi-semana activos."""

from __future__ import annotations

from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import CustomUser
from dashboard.plan_sync import sync_user_from_active_plans
from workouts.models import WorkoutProgram
from workouts.workout_week_utils import (
    fill_missing_program_weeks,
    get_scheduled_week_numbers,
    is_multi_week_program,
)


def _monday_of(value: date) -> date:
    return value - timedelta(days=value.weekday())


def _calendar_program_week(program: WorkoutProgram, today: date) -> int:
    if not program.start_date:
        return 1
    start_monday = _monday_of(program.start_date)
    ref_monday = _monday_of(today)
    weeks_elapsed = (ref_monday - start_monday).days // 7
    return max(1, weeks_elapsed + 1)


def _is_real_user(user: CustomUser) -> bool:
    email = (user.email or "").lower()
    if not user.is_active:
        return False
    if email.endswith("@example.com") or email.endswith("@test.local"):
        return False
    if email.startswith("pick.test."):
        return False
    return True


def _missing_weeks_for_program(program: WorkoutProgram, today: date) -> list[int]:
    scheduled = get_scheduled_week_numbers(program)
    if not scheduled:
        return []

    duration = max(int(program.duration_weeks or 1), scheduled[-1])
    calendar_week = _calendar_program_week(program, today)
    target_through = min(duration, max(calendar_week, scheduled[-1]))
    last_scheduled = scheduled[-1]
    return [week for week in range(last_scheduled + 1, target_through + 1)]


class Command(BaseCommand):
    help = (
        "Copia la última semana configurada a las semanas faltantes de planes "
        "multi-semana activos (evita días de descanso falsos en semanas vacías)."
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
            help="Procesar solo un usuario por email.",
        )
        parser.add_argument(
            "--source-week",
            type=int,
            help="Semana origen para la copia (por defecto: última semana configurada).",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        email = options.get("email")
        source_week = options.get("source_week")
        today = timezone.now().date()

        programs = (
            WorkoutProgram.objects.filter(is_active=True, user__isnull=False)
            .select_related("user")
            .prefetch_related("days")
            .order_by("user__email")
        )
        if email:
            programs = programs.filter(user__email__iexact=email)

        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"Relleno de semanas faltantes ({'APLICAR' if apply else 'DRY-RUN'})"
            )
        )

        changed = 0
        for program in programs:
            user = program.user
            if not user or not _is_real_user(user):
                continue
            if not is_multi_week_program(program):
                continue

            missing = _missing_weeks_for_program(program, today)
            if not missing:
                continue

            scheduled = get_scheduled_week_numbers(program)
            source = source_week or scheduled[-1]
            calendar_week = _calendar_program_week(program, today)

            self.stdout.write(
                f"\n{user.email}\n"
                f"  Programa: {program.name[:70]}\n"
                f"  Semanas configuradas: {scheduled}\n"
                f"  Semana calendario: {calendar_week} / duración {program.duration_weeks}\n"
                f"  Rellenar semanas: {missing} (origen: S{source})"
            )

            if apply:
                with transaction.atomic():
                    result = fill_missing_program_weeks(
                        program,
                        source_week=source,
                    )
                    sync_user_from_active_plans(user)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  OK: {result['copied_days']} días copiados -> S{result['target_weeks']}"
                    )
                )

            changed += 1

        self.stdout.write("")
        if apply:
            self.stdout.write(self.style.SUCCESS(f"Programas actualizados: {changed}"))
        else:
            self.stdout.write(self.style.WARNING(f"Programas que se modificarían: {changed}"))
            self.stdout.write("Ejecuta con --apply para persistir los cambios.")
