from datetime import time

from django.core.management.base import BaseCommand
from django.db import transaction

from dashboard.models import DefaultPlanConfiguration
from nutrition.models import NutritionPlan, PlanMeal, PlanMealRecipe, Recipe, RecipeIngredient
from workouts.models import (
    Exercise,
    ExerciseSubstitution,
    WorkoutDay,
    WorkoutDayExercise,
    WorkoutProgram,
)


class Command(BaseCommand):
    help = (
        "Limpia secciones de producción (ejercicios, planes de entrenamiento, recetas, "
        "planes de menú y configuraciones por defecto) y deja un set mínimo de prueba "
        "Endatad_DE_PRUEBA."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Aplica cambios reales. Sin este flag se ejecuta en modo simulación.",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]

        before_counts = self._collect_counts()
        self.stdout.write(self.style.WARNING("Conteo actual en secciones objetivo:"))
        self._print_counts(before_counts)

        if not apply_changes:
            self.stdout.write(
                self.style.WARNING(
                    "Modo simulación activo. No se realizaron cambios. Usa --apply para ejecutar."
                )
            )
            return

        with transaction.atomic():
            self._delete_target_sections()
            created_summary = self._seed_test_data()

        after_counts = self._collect_counts()

        self.stdout.write(self.style.SUCCESS("Limpieza y carga de datos de prueba completada."))
        self.stdout.write(self.style.SUCCESS("Resumen de datos creados:"))
        for label, value in created_summary.items():
            self.stdout.write(f"- {label}: {value}")

        self.stdout.write(self.style.SUCCESS("Conteo final en secciones objetivo:"))
        self._print_counts(after_counts)

    def _collect_counts(self):
        return {
            "Exercise": Exercise.objects.count(),
            "WorkoutProgram": WorkoutProgram.objects.count(),
            "WorkoutDay": WorkoutDay.objects.count(),
            "WorkoutDayExercise": WorkoutDayExercise.objects.count(),
            "Recipe": Recipe.objects.count(),
            "NutritionPlan": NutritionPlan.objects.count(),
            "PlanMeal": PlanMeal.objects.count(),
            "PlanMealRecipe": PlanMealRecipe.objects.count(),
            "DefaultPlanConfiguration": DefaultPlanConfiguration.objects.count(),
        }

    def _print_counts(self, counts):
        for key, value in counts.items():
            self.stdout.write(f"- {key}: {value}")

    def _delete_target_sections(self):
        DefaultPlanConfiguration.objects.all().delete()

        PlanMealRecipe.objects.all().delete()
        PlanMeal.objects.all().delete()
        NutritionPlan.objects.all().delete()

        RecipeIngredient.objects.all().delete()
        Recipe.objects.all().delete()

        WorkoutDayExercise.objects.all().delete()
        WorkoutDay.objects.all().delete()
        WorkoutProgram.objects.all().delete()

        ExerciseSubstitution.objects.all().delete()
        Exercise.objects.all().delete()

    def _seed_test_data(self):
        exercise = Exercise.objects.create(
            name="Endatad_DE_PRUEBA - entrada_de_prueba_ejercicios",
            description="Sentadilla con peso corporal para movilidad y fuerza básica.",
            instructions=(
                "Pies al ancho de hombros, espalda neutra, baja controlado hasta paralelo "
                "y sube empujando con los talones."
            ),
            category="strength",
            muscle_groups=["quadriceps", "glutes", "core"],
            equipment=["bodyweight"],
            difficulty="beginner",
            video_url="https://www.youtube.com/watch?v=aclHkVaku9U",
            image_url="https://images.unsplash.com/photo-1599058917765-a780eda07a3e",
            is_system=True,
            is_active=True,
            tags=["base", "movilidad", "full_body"],
        )

        workout_program = WorkoutProgram.objects.create(
            name="Endatad_DE_PRUEBA - entrada_de_prueba_planes_entrenamiento",
            description="Programa base de 1 día para validar flujos de entrenamiento.",
            difficulty="beginner",
            goal="general_fitness",
            location="any",
            duration_weeks=4,
            days_per_week=1,
            estimated_duration_minutes=35,
            equipment_needed=["bodyweight"],
            is_template=True,
            is_system=True,
            is_active=True,
            tags=["prueba", "base"],
        )

        workout_day = WorkoutDay.objects.create(
            program=workout_program,
            name="entrada_de_prueba_1",
            day_number=1,
            day_of_week="monday",
            is_rest_day=False,
            duration_minutes=35,
            focus="Movilidad y fuerza general",
            notes="Sesión única para entorno de pruebas.",
            order_index=1,
        )

        WorkoutDayExercise.objects.create(
            workout_day=workout_day,
            exercise=exercise,
            sets=3,
            reps="12",
            weight="bodyweight",
            duration_seconds=None,
            rest_seconds=60,
            notes="Mantener técnica y rango de movimiento completo.",
            order_index=1,
        )

        recipe = Recipe.objects.create(
            name="Endatad_DE_PRUEBA - entrada_de_prueba_recetas",
            description="Bowl equilibrado de pollo, arroz y vegetales.",
            category="Almuerzo",
            difficulty="Fácil",
            prep_time_minutes=15,
            cook_time_minutes=15,
            servings=1,
            calories=520,
            protein=38,
            carbs=52,
            fat=16,
            fiber=8,
            sugar=6,
            sodium=520,
            ingredients=[
                {"name": "Pechuga de pollo", "amount": "150", "unit": "g"},
                {"name": "Arroz integral cocido", "amount": "160", "unit": "g"},
                {"name": "Brócoli", "amount": "100", "unit": "g"},
                {"name": "Aceite de oliva", "amount": "10", "unit": "g"},
            ],
            instructions=(
                "Cocina el pollo a la plancha, sirve con arroz integral y brócoli al vapor. "
                "Finaliza con aceite de oliva y condimentos al gusto."
            ),
            diet_types=["high_protein"],
            goal_category="maintain",
            meal_types=["lunch", "dinner"],
            allergens=[],
            tags=["equilibrado", "alta_proteina"],
            image_url="https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
            video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            is_system=True,
            is_active=True,
            is_featured=False,
        )

        nutrition_plan = NutritionPlan.objects.create(
            name="Endatad_DE_PRUEBA - entrada_de_prueba_planes_menu",
            description="Plan de menú mínimo para validar planificación semanal.",
            daily_calories=2000,
            protein_grams=150,
            carbs_grams=210,
            fat_grams=65,
            fiber_grams=30,
            goal="maintain",
            diet_type="mediterranean",
            meals_per_day=3,
            duration_weeks=4,
            portion_multiplier=1.0,
            is_template=True,
            is_system=True,
            is_active=True,
            tags=["prueba", "menu"],
        )

        meal_1 = PlanMeal.objects.create(
            day_of_week=1,
            name="entrada_de_prueba_1",
            plan=nutrition_plan,
            meal_type="breakfast",
            time=time(8, 0),
            calories=500,
            protein=35,
            carbs=55,
            fat=15,
            description="Comida de prueba 1 para plan de menú.",
            order_index=1,
        )
        meal_1.suggested_recipes.add(recipe)
        PlanMealRecipe.objects.create(
            meal=meal_1,
            recipe=recipe,
            servings=0.8,
            display_order=1,
        )

        meal_2 = PlanMeal.objects.create(
            day_of_week=1,
            name="entrada_de_prueba_2",
            plan=nutrition_plan,
            meal_type="lunch",
            time=time(14, 0),
            calories=700,
            protein=55,
            carbs=70,
            fat=20,
            description="Comida de prueba 2 para plan de menú.",
            order_index=2,
        )
        meal_2.suggested_recipes.add(recipe)
        PlanMealRecipe.objects.create(
            meal=meal_2,
            recipe=recipe,
            servings=1.0,
            display_order=1,
        )

        meal_3 = PlanMeal.objects.create(
            day_of_week=1,
            name="entrada_de_prueba_3",
            plan=nutrition_plan,
            meal_type="dinner",
            time=time(21, 0),
            calories=600,
            protein=45,
            carbs=60,
            fat=18,
            description="Comida de prueba 3 para plan de menú.",
            order_index=3,
        )
        meal_3.suggested_recipes.add(recipe)
        PlanMealRecipe.objects.create(
            meal=meal_3,
            recipe=recipe,
            servings=0.9,
            display_order=1,
        )

        default_configuration = DefaultPlanConfiguration.objects.create(
            name="Endatad_DE_PRUEBA - entrada_de_prueba_configuraciones",
            description=(
                "Configuración mínima de prueba para asignación automática de plan "
                "nutricional y entrenamiento."
            ),
            priority=1,
            is_active=True,
            main_goal="maintain",
            training_location="any",
            activity_level="moderate",
            min_training_days_per_week=1,
            max_training_days_per_week=5,
            dietary_restrictions=[],
            equipment_keywords=["bodyweight"],
            default_nutrition_plan=nutrition_plan,
            default_workout_program=workout_program,
        )

        return {
            "Exercise": 1,
            "WorkoutProgram": 1,
            "WorkoutDay": 1,
            "WorkoutDayExercise": 1,
            "Recipe": 1,
            "NutritionPlan": 1,
            "PlanMeal": 3,
            "PlanMealRecipe": 3,
            "DefaultPlanConfiguration": 1,
            "Nombre configuración": default_configuration.name,
            "Nombre ejercicio": exercise.name,
            "Nombre plan entrenamiento": workout_program.name,
            "Nombre receta": recipe.name,
            "Nombre plan menú": nutrition_plan.name,
        }
