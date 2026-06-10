from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from django.utils import timezone

from nutrition.models import NutritionPlan, NutritionPlanAssignment
from workouts.models import WorkoutProgram
from workouts.services import DefaultWorkoutAssignmentService


class Command(BaseCommand):
    help = "Audita planes activos de entrenamiento/nutricion y repara casos no ambiguos con --fix."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fix",
            action="store_true",
            help="Aplica reparaciones seguras: duplicados activos y frecuencia semanal en planes cortos.",
        )
        parser.add_argument(
            "--fix-duplicates",
            action="store_true",
            help="Solo repara duplicados activos, sin cambiar frecuencias semanales.",
        )
        parser.add_argument(
            "--fix-short-workouts",
            action="store_true",
            help="Repara frecuencias semanales desalineadas en entrenamientos cortos.",
        )

    def handle(self, *args, **options):
        fix_duplicates = options["fix"] or options["fix_duplicates"]
        fix_short_workouts = options["fix"] or options["fix_short_workouts"]
        self.stdout.write(self.style.MIGRATE_HEADING("Auditando planes de produccion"))

        self._audit_workouts(fix_duplicates=fix_duplicates, fix_short_workouts=fix_short_workouts)
        self._audit_nutrition(fix_duplicates=fix_duplicates)

    def _audit_workouts(self, *, fix_duplicates: bool, fix_short_workouts: bool):
        duplicate_users = list(
            WorkoutProgram.objects.filter(user__isnull=False, is_active=True)
            .values("user_id", "user__email")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
        )
        self.stdout.write(f"Usuarios con multiples entrenamientos activos: {len(duplicate_users)}")

        for row in duplicate_users:
            programs = list(
                WorkoutProgram.objects.filter(user_id=row["user_id"], is_active=True)
                .order_by("-updated_at", "-created_at")
            )
            keep = programs[0]
            self.stdout.write(f"  - {row['user__email']}: mantener {keep.id}, desactivar {len(programs) - 1}")
            if fix_duplicates:
                WorkoutProgram.objects.filter(
                    user_id=row["user_id"],
                    is_active=True,
                ).exclude(pk=keep.pk).update(is_active=False, end_date=timezone.now().date())

        short_mismatches = []
        long_mismatches = []
        active_programs = WorkoutProgram.objects.filter(
            user__isnull=False,
            is_active=True,
        ).select_related("user").prefetch_related("days")

        for program in active_programs:
            training_sessions = program.days.filter(is_rest_day=False).count()
            inferred_weekly = DefaultWorkoutAssignmentService.infer_weekly_training_days(program)
            if not training_sessions:
                continue
            if training_sessions > 7:
                long_mismatches.append((program, training_sessions, inferred_weekly))
            elif program.days_per_week != inferred_weekly:
                short_mismatches.append((program, training_sessions, inferred_weekly))

        self.stdout.write(f"Entrenamientos cortos con frecuencia desalineada: {len(short_mismatches)}")
        for program, training_sessions, inferred_weekly in short_mismatches:
            self.stdout.write(
                f"  - {program.user.email}: {program.name} {program.days_per_week} -> {inferred_weekly} "
                f"({training_sessions} sesiones)"
            )
            if fix_short_workouts:
                program.days_per_week = inferred_weekly
                program.save(update_fields=["days_per_week", "updated_at"])
                if program.user.training_days_per_week != inferred_weekly:
                    program.user.training_days_per_week = inferred_weekly
                    program.user.save(update_fields=["training_days_per_week", "updated_at"])

        self.stdout.write(f"Entrenamientos largos que requieren revision manual: {len(long_mismatches)}")
        for program, training_sessions, inferred_weekly in long_mismatches[:50]:
            self.stdout.write(
                f"  - {program.user.email}: {program.name} muestra {program.days_per_week}, "
                f"tiene {training_sessions} sesiones; sugerido semanal {inferred_weekly}"
            )

    def _audit_nutrition(self, *, fix_duplicates: bool):
        duplicate_assignments = list(
            NutritionPlanAssignment.objects.filter(is_active=True)
            .values("user_id", "user__email")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
        )
        self.stdout.write(f"Usuarios con multiples asignaciones nutricionales activas: {len(duplicate_assignments)}")

        for row in duplicate_assignments:
            assignments = list(
                NutritionPlanAssignment.objects.filter(user_id=row["user_id"], is_active=True)
                .select_related("plan")
                .order_by("-assigned_at", "-created_at")
            )
            keep = assignments[0]
            self.stdout.write(
                f"  - {row['user__email']}: mantener {keep.plan.name} ({keep.plan_id}), "
                f"desactivar {len(assignments) - 1}"
            )
            if fix_duplicates:
                NutritionPlanAssignment.objects.filter(
                    user_id=row["user_id"],
                    is_active=True,
                ).exclude(pk=keep.pk).update(is_active=False)

        shared_active_plans = (
            NutritionPlan.objects.filter(is_active=True, assignments__is_active=True)
            .annotate(active_assignments=Count("assignments", filter=Q(assignments__is_active=True)))
            .filter(active_assignments__gt=1)
            .distinct()
        )
        self.stdout.write(f"Planes nutricionales compartidos activos: {shared_active_plans.count()}")
        for plan in shared_active_plans[:50]:
            self.stdout.write(
                f"  - {plan.name} ({plan.id}) tiene {plan.active_assignments} asignaciones activas; "
                "editar desde ficha de usuario creara copia individual."
            )
