"""
Crea plantillas [AUTO-DEFECTO] (copias separadas) y configuraciones por defecto
para la asignación automática de planes a usuarios nuevos.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.default_plan_templates import (
    AUTO_DEFAULT_PREFIX,
    get_or_copy_nutrition_template,
    get_or_copy_workout_template,
)
from dashboard.models import DefaultPlanConfiguration


@dataclass(frozen=True)
class TemplateSource:
    nutrition_source_name: str
    nutrition_label: str
    workout_source_name: str
    workout_label: str


@dataclass(frozen=True)
class ConfigurationSpec:
    name: str
    priority: int
    template: TemplateSource
    main_goal: Optional[str] = None
    training_location: Optional[str] = None
    activity_level: Optional[str] = None
    gender: Optional[str] = None
    min_training_days_per_week: Optional[int] = None
    max_training_days_per_week: Optional[int] = None
    dietary_restrictions: Optional[list] = None
    description: str = ""


TEMPLATE_SOURCES = {
    "general": TemplateSource(
        nutrition_source_name="Dieta Flexible Personalizada",
        nutrition_label="Nutrición general",
        workout_source_name="¡AUMENTA TU POMPOSO I!",
        workout_label="Entreno 3 días gimnasio",
    ),
    "home": TemplateSource(
        nutrition_source_name="Dieta Flexible Personalizada",
        nutrition_label="Nutrición general",
        workout_source_name="BAJA DE PESO DESDE CASA!!!",
        workout_label="Entreno 3 días casa",
    ),
    "workout_4d": TemplateSource(
        nutrition_source_name="Dieta Flexible Personalizada",
        nutrition_label="Nutrición general",
        workout_source_name="¡AUMENTA TU POMPOSO II!",
        workout_label="Entreno 4 días gimnasio",
    ),
    "workout_5d": TemplateSource(
        nutrition_source_name="Dieta Flexible Personalizada",
        nutrition_label="Nutrición general",
        workout_source_name="¡AUMENTA TU POMPOSO IV!",
        workout_label="Entreno 5 días gimnasio",
    ),
    "recomposition": TemplateSource(
        nutrition_source_name="Dieta Flexible Personalizada",
        nutrition_label="Nutrición general",
        workout_source_name="MUJER3DÍASGYMRECOMPOSICION",
        workout_label="Entreno recomposición 3 días",
    ),
    "lactose_free": TemplateSource(
        nutrition_source_name="MENÚ SIN LACTOSA I",
        nutrition_label="Nutrición sin lactosa",
        workout_source_name="¡AUMENTA TU POMPOSO I!",
        workout_label="Entreno 3 días gimnasio",
    ),
    "celiac": TemplateSource(
        nutrition_source_name="MENÚ APTO PARA CELÍACOS",
        nutrition_label="Nutrición sin gluten",
        workout_source_name="¡AUMENTA TU POMPOSO I!",
        workout_label="Entreno 3 días gimnasio",
    ),
}


CONFIGURATION_SPECS = [
    ConfigurationSpec(
        name=f"{AUTO_DEFAULT_PREFIX} Sin lactosa",
        priority=5,
        template=TEMPLATE_SOURCES["lactose_free"],
        main_goal="lose_weight",
        dietary_restrictions=["lactosa", "lácteos", "leche"],
        description="Usuarios con restricción de lactosa o alergia a lácteos.",
    ),
    ConfigurationSpec(
        name=f"{AUTO_DEFAULT_PREFIX} Sin gluten",
        priority=6,
        template=TEMPLATE_SOURCES["celiac"],
        dietary_restrictions=["gluten", "celiaco", "celíacos"],
        description="Usuarios con restricción de gluten o celiaquía.",
    ),
    ConfigurationSpec(
        name=f"{AUTO_DEFAULT_PREFIX} Perder peso - Casa 2-4 días",
        priority=10,
        template=TEMPLATE_SOURCES["home"],
        main_goal="lose_weight",
        training_location="home",
        min_training_days_per_week=2,
        max_training_days_per_week=4,
    ),
    ConfigurationSpec(
        name=f"{AUTO_DEFAULT_PREFIX} Perder peso - Gimnasio 5 días",
        priority=11,
        template=TEMPLATE_SOURCES["workout_5d"],
        main_goal="lose_weight",
        training_location="gym",
        min_training_days_per_week=5,
        max_training_days_per_week=7,
    ),
    ConfigurationSpec(
        name=f"{AUTO_DEFAULT_PREFIX} Perder peso - Gimnasio 4 días",
        priority=12,
        template=TEMPLATE_SOURCES["workout_4d"],
        main_goal="lose_weight",
        training_location="gym",
        min_training_days_per_week=4,
        max_training_days_per_week=4,
    ),
    ConfigurationSpec(
        name=f"{AUTO_DEFAULT_PREFIX} Perder peso - Gimnasio 2-3 días",
        priority=13,
        template=TEMPLATE_SOURCES["general"],
        main_goal="lose_weight",
        training_location="gym",
        min_training_days_per_week=2,
        max_training_days_per_week=3,
    ),
    ConfigurationSpec(
        name=f"{AUTO_DEFAULT_PREFIX} Recomposición - Gimnasio 3-5 días",
        priority=20,
        template=TEMPLATE_SOURCES["recomposition"],
        main_goal="body_recomposition",
        training_location="gym",
        min_training_days_per_week=3,
        max_training_days_per_week=5,
    ),
    ConfigurationSpec(
        name=f"{AUTO_DEFAULT_PREFIX} Ganar músculo - Gimnasio 3-5 días",
        priority=21,
        template=TEMPLATE_SOURCES["workout_4d"],
        main_goal="gain_muscle",
        training_location="gym",
        min_training_days_per_week=3,
        max_training_days_per_week=5,
    ),
    ConfigurationSpec(
        name=f"{AUTO_DEFAULT_PREFIX} Perder peso - General",
        priority=50,
        template=TEMPLATE_SOURCES["general"],
        main_goal="lose_weight",
        description="Fallback para perder peso sin coincidencia más específica.",
    ),
    ConfigurationSpec(
        name=f"{AUTO_DEFAULT_PREFIX} Fallback general",
        priority=900,
        template=TEMPLATE_SOURCES["general"],
        description="Último recurso para cualquier perfil no premium.",
    ),
]


class Command(BaseCommand):
    help = (
        "Bootstrap opcional de configuraciones [AUTO-DEFECTO]. "
        "El sistema ya crea configuraciones automáticamente al asignar planes; "
        "usa este comando solo para una carga inicial masiva."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--deactivate-legacy",
            action="store_true",
            help="Desactiva configuraciones activas que no usen plantillas [AUTO-DEFECTO].",
        )
        parser.add_argument(
            "--reassign-missing",
            action="store_true",
            help="Asigna planes a usuarios basic/pro sin planes activos tras crear configuraciones.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("== Seed configuraciones por defecto =="))

        template_cache: dict[str, tuple] = {}
        for key, source in TEMPLATE_SOURCES.items():
            nutrition_plan, nutrition_created = get_or_copy_nutrition_template(
                source.nutrition_source_name,
                source.nutrition_label,
            )
            workout_program, workout_created = get_or_copy_workout_template(
                source.workout_source_name,
                source.workout_label,
            )
            if not nutrition_plan:
                self.stdout.write(
                    self.style.ERROR(
                        f"No se encontró plantilla nutricional origen: {source.nutrition_source_name}"
                    )
                )
                return
            if not workout_program:
                self.stdout.write(
                    self.style.ERROR(
                        f"No se encontró plantilla de entrenamiento origen: {source.workout_source_name}"
                    )
                )
                return
            template_cache[key] = (nutrition_plan, workout_program)
            self.stdout.write(
                f"Plantillas {key}: nutri={'creada' if nutrition_created else 'reutilizada'} "
                f"({nutrition_plan.name}), workout={'creada' if workout_created else 'reutilizada'} "
                f"({workout_program.name})"
            )

        configs_created = 0
        configs_updated = 0
        for spec in CONFIGURATION_SPECS:
            template_key = None
            for key, value in TEMPLATE_SOURCES.items():
                if value == spec.template:
                    template_key = key
                    break
            if not template_key:
                self.stdout.write(self.style.ERROR(f"No se resolvió plantilla para {spec.name}"))
                continue

            nutrition_plan, workout_program = template_cache[template_key]

            config, created = DefaultPlanConfiguration.objects.update_or_create(
                name=spec.name,
                defaults={
                    "description": spec.description,
                    "priority": spec.priority,
                    "is_active": True,
                    "main_goal": spec.main_goal,
                    "training_location": spec.training_location,
                    "activity_level": spec.activity_level,
                    "gender": spec.gender,
                    "min_training_days_per_week": spec.min_training_days_per_week,
                    "max_training_days_per_week": spec.max_training_days_per_week,
                    "dietary_restrictions": spec.dietary_restrictions or [],
                    "default_nutrition_plan": nutrition_plan,
                    "default_workout_program": workout_program,
                },
            )
            if created:
                configs_created += 1
            else:
                configs_updated += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f"{'Creada' if created else 'Actualizada'} configuración: {config.name} (prioridad {config.priority})"
                )
            )

        if options["deactivate_legacy"]:
            deactivated = (
                DefaultPlanConfiguration.objects.filter(is_active=True)
                .exclude(name__startswith=AUTO_DEFAULT_PREFIX)
                .update(is_active=False)
            )
            self.stdout.write(self.style.WARNING(f"Configuraciones legacy desactivadas: {deactivated}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Resumen: {configs_created} configuraciones creadas, {configs_updated} actualizadas."
            )
        )

        if options["reassign_missing"]:
            from accounts.models import CustomUser
            from accounts.services import DefaultPlanAssignmentService
            from nutrition.models import NutritionPlan
            from workouts.models import WorkoutProgram

            users = CustomUser.objects.filter(role__in=["basic", "pro"], is_active=True)
            reassigned = 0
            for user in users:
                has_nutrition = NutritionPlan.objects.filter(user=user, is_active=True).exists()
                has_workout = WorkoutProgram.objects.filter(user=user, is_active=True).exists()
                if has_nutrition and has_workout:
                    continue
                result = DefaultPlanAssignmentService(user).assign()
                if result.nutrition_plan or result.workout_program:
                    reassigned += 1
                    self.stdout.write(f"  Reasignado: {user.email}")
            self.stdout.write(self.style.SUCCESS(f"Usuarios reasignados: {reassigned}"))
