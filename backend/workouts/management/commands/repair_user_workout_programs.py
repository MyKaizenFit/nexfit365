"""Repara planes de usuario: reactiva inactivos, sincroniza fechas y conserva la semana actual."""

from __future__ import annotations

from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from accounts.models import CustomUser
from workouts.models import WorkoutLog, WorkoutProgram
from workouts.program_lifecycle import (
    get_program_lifecycle_status,
    program_duration_weeks_from_plan,
    program_week_for_date,
)
from workouts.workout_week_utils import week_number_from_day_number


def _monday_of(value: date) -> date:
    return value - timedelta(days=value.weekday())


def _is_repair_candidate(user: CustomUser) -> bool:
    email = (user.email or "").lower()
    if not user.is_active:
        return False
    if email.endswith("@example.com") or email.endswith("@test.local"):
        return False
    if email in {
        "admin@example.invalid",
        "admin@test.com",
        "copilot-admin@test.local",
        "borrow.test@example.com",
        "verify.deploy.check@example.com",
        "auto.provision.test@example.com",
    }:
        return False
    if email.startswith("pick.test."):
        return False
    return True


def _calendar_week_elapsed(program: WorkoutProgram, today: date) -> int:
    if not program.start_date:
        return 1
    start_monday = _monday_of(program.start_date)
    ref_monday = _monday_of(today)
    weeks_elapsed = (ref_monday - start_monday).days // 7
    return max(1, weeks_elapsed + 1)


def _infer_target_week(program: WorkoutProgram, today: date) -> int:
    duration = program_duration_weeks_from_plan(program)

    last_log = (
        WorkoutLog.objects.filter(
            user_id=program.user_id,
            workout_day__program_id=program.id,
        )
        .select_related("workout_day")
        .order_by("-date", "-created_at")
        .first()
    )
    if last_log and last_log.workout_day_id:
        log_week = week_number_from_day_number(last_log.workout_day.day_number or 1)
        return max(1, min(log_week, duration))

    if program.start_date:
        calendar_week = _calendar_week_elapsed(program, today)
        if 1 <= calendar_week <= duration:
            return calendar_week

    return 1


def _anchor_start_for_week(program: WorkoutProgram, target_week: int, today: date) -> None:
    duration = program_duration_weeks_from_plan(program)
    target_week = max(1, min(target_week, duration))
    start_monday = _monday_of(today) - timedelta(weeks=target_week - 1)
    program.start_date = start_monday
    program.end_date = start_monday + timedelta(weeks=duration)


def _sync_program_dates_preserve_progress(
    program: WorkoutProgram,
    today: date,
    *,
    preserve_start_date: bool,
) -> list[str]:
    changes: list[str] = []
    duration = program_duration_weeks_from_plan(program)

    if (program.duration_weeks or 0) != duration:
        changes.append(f"duration_weeks {program.duration_weeks} -> {duration}")
        program.duration_weeks = duration

    if preserve_start_date and program.start_date:
        start_monday = _monday_of(program.start_date)
        calendar_week = _calendar_week_elapsed(program, today)
        if calendar_week > duration:
            changes.append(f"duration_weeks {program.duration_weeks} -> {calendar_week} (semana calendario)")
            duration = calendar_week
            program.duration_weeks = duration
        expected_end = start_monday + timedelta(weeks=duration)
        if program.end_date is None or program.end_date < expected_end:
            if program.end_date != expected_end:
                changes.append(f"end_date {program.end_date} -> {expected_end}")
                program.end_date = expected_end
        return changes

    target_week = _infer_target_week(program, today)
    previous_start = program.start_date
    previous_end = program.end_date
    _anchor_start_for_week(program, target_week, today)
    if previous_start != program.start_date:
        changes.append(
            f"start_date {previous_start} -> {program.start_date} (semana {target_week}/{duration})"
        )
    if previous_end != program.end_date:
        changes.append(f"end_date {previous_end} -> {program.end_date}")
    return changes


def _pick_program_to_activate(user: CustomUser) -> WorkoutProgram | None:
    candidates = (
        WorkoutProgram.objects.filter(user=user)
        .annotate(day_count=Count("days", distinct=True))
        .filter(day_count__gt=0)
        .prefetch_related("days")
        .order_by("-updated_at", "-created_at")
    )

    best: WorkoutProgram | None = None
    best_score = -1
    for program in candidates:
        log_count = WorkoutLog.objects.filter(
            user=user,
            workout_day__program_id=program.id,
        ).count()
        score = log_count * 1000 + program.day_count + (program.updated_at.timestamp() if program.updated_at else 0) / 1_000_000
        if score > best_score:
            best = program
            best_score = score
    return best


def repair_user_program(
    user: CustomUser,
    today: date,
    *,
    apply: bool,
) -> list[str]:
    actions: list[str] = []

    active_programs = list(
        WorkoutProgram.objects.filter(user=user, is_active=True)
        .prefetch_related("days")
        .order_by("-updated_at", "-created_at")
    )

    if len(active_programs) > 1:
        keep = active_programs[0]
        deactivate_ids = [p.id for p in active_programs[1:]]
        actions.append(
            f"duplicados activos: mantener {keep.id}, desactivar {len(deactivate_ids)}"
        )
        if apply:
            WorkoutProgram.objects.filter(id__in=deactivate_ids).update(
                is_active=False,
                updated_at=timezone.now(),
            )
        active_programs = [keep]

    program = active_programs[0] if active_programs else None
    if program is None:
        program = _pick_program_to_activate(user)
        if program is None:
            actions.append("sin programa con contenido; requiere asignación manual o assign_missing_plans")
            return actions
        actions.append(f"reactivar plan inactivo: {program.name[:60]} ({program.id})")
        if apply:
            WorkoutProgram.objects.filter(user=user, is_active=True).update(is_active=False)
            program.is_active = True

    changes = _sync_program_dates_preserve_progress(
        program,
        today,
        preserve_start_date=bool(program.start_date),
    )
    actions.extend(changes)

    if apply:
        program.save(
            update_fields=[
                "start_date",
                "end_date",
                "duration_weeks",
                "is_active",
                "updated_at",
            ]
        )

    status = get_program_lifecycle_status(program, today)
    week = program_week_for_date(program, today)
    actions.append(f"estado final: {status}, semana {week}/{program.duration_weeks}")
    return actions


class Command(BaseCommand):
    help = (
        "Repara planes de entrenamiento de usuarios reales: reactiva inactivos, "
        "sincroniza duration_weeks/end_date y conserva la semana en curso."
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
            help="Reparar solo un usuario por email.",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        email = options.get("email")
        today = timezone.now().date()

        users = CustomUser.objects.all().order_by("email")
        if email:
            users = users.filter(email__iexact=email)
        else:
            users = [user for user in users if _is_repair_candidate(user)]

        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"Reparación de planes de entrenamiento ({'APLICAR' if apply else 'DRY-RUN'})"
            )
        )
        self.stdout.write(f"Usuarios a revisar: {len(users)}")

        changed = 0
        for user in users:
            with transaction.atomic():
                actions = repair_user_program(user, today, apply=apply)
                if not actions:
                    continue

                needs_attention = any(
                    token in " ".join(actions)
                    for token in ("reactivar", "duration_weeks", "end_date", "start_date", "duplicados", "sin programa")
                )
                if not needs_attention and actions[-1].startswith("estado final: active"):
                    continue

                changed += 1
                self.stdout.write(f"\n{user.email}")
                for action in actions:
                    self.stdout.write(f"  - {action}")

                if not apply:
                    transaction.set_rollback(True)

        self.stdout.write("")
        if apply:
            self.stdout.write(self.style.SUCCESS(f"Usuarios reparados: {changed}"))
        else:
            self.stdout.write(self.style.WARNING(f"Usuarios que se modificarían: {changed}"))
            self.stdout.write("Ejecuta con --apply para persistir los cambios.")
