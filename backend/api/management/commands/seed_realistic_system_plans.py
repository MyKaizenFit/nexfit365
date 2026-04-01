from __future__ import annotations

from dataclasses import dataclass
from datetime import time
from decimal import Decimal
from typing import Iterable

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from nutrition.models import Food, NutritionPlan, PlanMeal, PlanMealRecipe, Recipe, RecipeIngredient
from workouts.models import (
    Exercise,
    ExerciseSubstitution,
    WorkoutDay,
    WorkoutDayExercise,
    WorkoutProgram,
)


User = get_user_model()


@dataclass(frozen=True)
class IngredientSpec:
    terms: tuple[str, ...]
    grams: Decimal
    unit: str = "g"


class Command(BaseCommand):
    help = (
        "Crea datos realistas de prueba del SISTEMA: "
        "6 ejercicios, plan semanal de entrenamiento con sustitutos, "
        "6 recetas con alimentos importados y plan de menu semanal."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--assign-users",
            nargs="*",
            default=["admin@example.invalid", "user@example.invalid"],
            help="Usuarios a los que se les asignara una copia activa del plan.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("== Seed realista del SISTEMA =="))

        exercises = self._create_system_exercises()
        self._create_substitutions(exercises)

        system_workout = self._create_system_workout_program(exercises)
        recipes = self._create_system_recipes()
        system_nutrition = self._create_system_nutrition_plan(recipes)

        users = list(User.objects.filter(email__in=options["assign_users"]))
        for user in users:
            self._assign_workout_to_user(system_workout, user)
            self._assign_nutrition_to_user(system_nutrition, user)

        self.stdout.write(self.style.SUCCESS("\nSeed completado."))
        self.stdout.write(f"- Ejercicios SISTEMA: {Exercise.objects.filter(name__startswith='SISTEMA - ').count()}")
        self.stdout.write(f"- Recetas SISTEMA: {Recipe.objects.filter(name__startswith='SISTEMA - ').count()}")
        self.stdout.write(f"- Usuarios actualizados: {len(users)}")

    def _pick_food(self, terms: Iterable[str]) -> Food:
        for term in terms:
            food = (
                Food.objects.filter(name__icontains=term)
                .order_by("-is_verified", "name")
                .first()
            )
            if food:
                return food

        fallback = Food.objects.order_by("-is_verified", "name").first()
        if not fallback:
            raise ValueError("No hay alimentos en la BD. Importa alimentos antes de ejecutar este comando.")
        return fallback

    def _create_system_exercises(self) -> dict[str, Exercise]:
        data = [
            {
                "key": "squat",
                "name": "SISTEMA - Sentadilla Goblet",
                "description": "Sentadilla con mancuerna para fuerza de piernas y control del core.",
                "instructions": "Manten la mancuerna pegada al pecho, baja con control y sube empujando el suelo.",
                "category": "strength",
                "muscle_groups": ["legs", "glutes", "core"],
                "equipment": ["dumbbell"],
                "difficulty": "beginner",
                "tags": ["piernas", "fuerza", "sistema"],
            },
            {
                "key": "rdl",
                "name": "SISTEMA - Peso Muerto Rumano con Mancuernas",
                "description": "Trabajo de cadena posterior con enfasis en gluteo e isquios.",
                "instructions": "Bisagra de cadera, espalda neutra y recorrido controlado hasta sentir tension.",
                "category": "strength",
                "muscle_groups": ["glutes", "legs", "back"],
                "equipment": ["dumbbells"],
                "difficulty": "intermediate",
                "tags": ["posterior", "fuerza", "sistema"],
            },
            {
                "key": "press_chest",
                "name": "SISTEMA - Press de Pecho con Mancuernas",
                "description": "Ejercicio basico de empuje para pecho y triceps.",
                "instructions": "Baja las mancuernas hasta linea de pecho y extiende sin bloquear codos.",
                "category": "strength",
                "muscle_groups": ["chest", "triceps", "shoulders"],
                "equipment": ["dumbbells", "bench"],
                "difficulty": "beginner",
                "tags": ["empuje", "tren superior", "sistema"],
            },
            {
                "key": "row",
                "name": "SISTEMA - Remo con Mancuerna a Una Mano",
                "description": "Remo unilateral para dorsales y estabilidad escapular.",
                "instructions": "Apoya una mano y rodilla en banco, tira hacia la cadera sin rotar el tronco.",
                "category": "strength",
                "muscle_groups": ["back", "biceps", "core"],
                "equipment": ["dumbbell", "bench"],
                "difficulty": "beginner",
                "tags": ["tiron", "espalda", "sistema"],
            },
            {
                "key": "press_overhead",
                "name": "SISTEMA - Press Militar de Pie",
                "description": "Empuje vertical para hombros y estabilidad del core.",
                "instructions": "Gluteos y abdomen activos, presiona por encima de la cabeza en linea recta.",
                "category": "strength",
                "muscle_groups": ["shoulders", "triceps", "core"],
                "equipment": ["dumbbells"],
                "difficulty": "intermediate",
                "tags": ["hombro", "empuje", "sistema"],
            },
            {
                "key": "plank",
                "name": "SISTEMA - Plancha Frontal",
                "description": "Isometrico para core y control postural.",
                "instructions": "Alinea hombros-cadera-tobillos, evita arquear la zona lumbar.",
                "category": "bodyweight",
                "muscle_groups": ["core", "shoulders"],
                "equipment": ["none"],
                "difficulty": "beginner",
                "tags": ["core", "estabilidad", "sistema"],
            },
        ]

        created: dict[str, Exercise] = {}
        for item in data:
            exercise, _ = Exercise.objects.update_or_create(
                name=item["name"],
                defaults={
                    "description": item["description"],
                    "instructions": item["instructions"],
                    "category": item["category"],
                    "muscle_groups": item["muscle_groups"],
                    "equipment": item["equipment"],
                    "difficulty": item["difficulty"],
                    "is_system": True,
                    "is_active": True,
                    "tags": item["tags"],
                    "created_by": None,
                },
            )
            created[item["key"]] = exercise

        self.stdout.write("6 ejercicios SISTEMA creados/actualizados.")
        return created

    def _create_substitutions(self, exercises: dict[str, Exercise]) -> None:
        rules = [
            ("squat", "rdl", 1, "Si hay molestia de rodilla, priorizar patron de bisagra."),
            ("rdl", "squat", 1, "Si hay fatiga lumbar, usar variante de sentadilla."),
            ("press_chest", "press_overhead", 1, "Alternar empuje horizontal por vertical."),
            ("press_overhead", "press_chest", 1, "Si hay molestia por encima de la cabeza, usar press de pecho."),
            ("row", "plank", 2, "En caso de fatiga de agarre, mantener trabajo de estabilidad."),
            ("plank", "row", 2, "Sustituir por tiron cuando se requiera mas carga mecanica."),
        ]

        for source_key, target_key, priority, notes in rules:
            ExerciseSubstitution.objects.update_or_create(
                exercise=exercises[source_key],
                substitute=exercises[target_key],
                defaults={"priority": priority, "notes": notes},
            )

        self.stdout.write("Sustituciones de respaldo configuradas.")

    def _create_system_workout_program(self, exercises: dict[str, Exercise]) -> WorkoutProgram:
        program, _ = WorkoutProgram.objects.update_or_create(
            name="SISTEMA - Programa Semanal Realista",
            user=None,
            defaults={
                "description": "Programa de 7 dias con 5 sesiones activas, 1 recuperacion y 1 descanso.",
                "difficulty": "intermediate",
                "goal": "general_fitness",
                "location": "any",
                "duration_weeks": 8,
                "days_per_week": 5,
                "estimated_duration_minutes": 55,
                "equipment_needed": ["dumbbells", "bench", "mat"],
                "is_template": True,
                "is_system": True,
                "is_active": True,
                "created_by": None,
                "tags": ["sistema", "semanal", "realista"],
            },
        )

        program.days.all().delete()

        day_specs = [
            {
                "name": "Dia 1 - Empuje + Core",
                "dow": "monday",
                "is_rest": False,
                "focus": "Empuje",
                "notes": "Usar sustitutos si hay dolor articular.",
                "items": [
                    ("press_chest", 4, "8-10", "RPE 7", 90),
                    ("press_overhead", 4, "8-10", "RPE 7", 90),
                    ("plank", 3, "45s", "", 45),
                ],
            },
            {
                "name": "Dia 2 - Pierna Fuerza",
                "dow": "tuesday",
                "is_rest": False,
                "focus": "Piernas",
                "notes": "Priorizar tecnica sobre carga.",
                "items": [
                    ("squat", 4, "8-12", "RPE 7", 90),
                    ("rdl", 4, "8-12", "RPE 7", 90),
                    ("plank", 3, "40s", "", 45),
                ],
            },
            {
                "name": "Dia 3 - Tiron + Estabilidad",
                "dow": "wednesday",
                "is_rest": False,
                "focus": "Espalda",
                "notes": "Mantener control escapular y respiracion.",
                "items": [
                    ("row", 4, "10-12", "RPE 7", 75),
                    ("rdl", 3, "10", "Moderado", 90),
                    ("plank", 4, "35s", "", 40),
                ],
            },
            {
                "name": "Dia 4 - Recuperacion Activa",
                "dow": "thursday",
                "is_rest": False,
                "focus": "Movilidad",
                "notes": "Sesion ligera para mantener adherencia.",
                "items": [
                    ("squat", 3, "12-15", "Ligero", 60),
                    ("row", 3, "12", "Ligero", 60),
                    ("plank", 3, "30s", "", 30),
                ],
            },
            {
                "name": "Dia 5 - Full Body",
                "dow": "friday",
                "is_rest": False,
                "focus": "Cuerpo completo",
                "notes": "Sesion de cierre semanal.",
                "items": [
                    ("squat", 4, "10", "RPE 8", 75),
                    ("press_chest", 4, "8-10", "RPE 8", 90),
                    ("row", 4, "8-10", "RPE 8", 90),
                    ("press_overhead", 3, "10", "RPE 7", 75),
                ],
            },
            {
                "name": "Dia 6 - Descanso",
                "dow": "saturday",
                "is_rest": True,
                "focus": "Descanso",
                "notes": "Paseo suave y movilidad opcional.",
                "items": [],
            },
            {
                "name": "Dia 7 - Descanso",
                "dow": "sunday",
                "is_rest": True,
                "focus": "Descanso",
                "notes": "Preparar la semana siguiente.",
                "items": [],
            },
        ]

        for day_number, spec in enumerate(day_specs, start=1):
            day = WorkoutDay.objects.create(
                program=program,
                name=spec["name"],
                day_number=day_number,
                day_of_week=spec["dow"],
                is_rest_day=spec["is_rest"],
                duration_minutes=25 if spec["is_rest"] else 55,
                focus=spec["focus"],
                notes=spec["notes"],
                order_index=day_number,
            )

            for idx, (key, sets, reps, weight, rest) in enumerate(spec["items"], start=1):
                WorkoutDayExercise.objects.create(
                    workout_day=day,
                    exercise=exercises[key],
                    sets=sets,
                    reps=reps,
                    weight=weight,
                    rest_seconds=rest,
                    notes="Sustitutos disponibles en ficha de ejercicio.",
                    order_index=idx,
                )

        self.stdout.write("Plan de entrenamiento semanal SISTEMA actualizado.")
        return program

    def _create_system_recipes(self) -> dict[str, Recipe]:
        recipes_def = [
            {
                "key": "avena",
                "name": "SISTEMA - Avena Proteica con Platano",
                "category": "Desayuno",
                "meal_types": ["breakfast"],
                "difficulty": "Fácil",
                "prep": 10,
                "cook": 5,
                "servings": 1,
                "ingredients": [
                    IngredientSpec(("oat", "avena"), Decimal("60")),
                    IngredientSpec(("yogurt", "yogur"), Decimal("170")),
                    IngredientSpec(("banana", "platano"), Decimal("100")),
                    IngredientSpec(("almond", "almendra"), Decimal("15")),
                ],
                "instructions": "Mezclar avena con yogur, anadir platano laminado y terminar con almendra picada.",
            },
            {
                "key": "tortilla",
                "name": "SISTEMA - Tortilla de Espinacas y Queso Fresco",
                "category": "Cena",
                "meal_types": ["breakfast", "dinner"],
                "difficulty": "Fácil",
                "prep": 8,
                "cook": 7,
                "servings": 1,
                "ingredients": [
                    IngredientSpec(("egg", "huevo"), Decimal("120")),
                    IngredientSpec(("spinach", "espinaca"), Decimal("80")),
                    IngredientSpec(("fresh cheese", "queso fresco", "mozzarella"), Decimal("40")),
                    IngredientSpec(("olive oil", "aceite de oliva"), Decimal("8")),
                ],
                "instructions": "Saltear espinaca, anadir huevo batido y queso, cocinar hasta cuajar.",
            },
            {
                "key": "pollo_arroz",
                "name": "SISTEMA - Bowl de Pollo con Arroz y Brocoli",
                "category": "Almuerzo",
                "meal_types": ["lunch", "dinner"],
                "difficulty": "Medio",
                "prep": 15,
                "cook": 20,
                "servings": 1,
                "ingredients": [
                    IngredientSpec(("chicken breast", "pollo"), Decimal("180")),
                    IngredientSpec(("rice", "arroz"), Decimal("160")),
                    IngredientSpec(("broccoli", "brocoli"), Decimal("130")),
                    IngredientSpec(("olive oil", "aceite de oliva"), Decimal("10")),
                ],
                "instructions": "Cocinar arroz y brocoli. Marcar pollo a la plancha y montar el bowl.",
            },
            {
                "key": "salmon_patata",
                "name": "SISTEMA - Salmon con Patata Asada y Ensalada",
                "category": "Cena",
                "meal_types": ["dinner", "lunch"],
                "difficulty": "Medio",
                "prep": 12,
                "cook": 25,
                "servings": 1,
                "ingredients": [
                    IngredientSpec(("salmon",), Decimal("170")),
                    IngredientSpec(("potato", "patata"), Decimal("220")),
                    IngredientSpec(("tomato", "tomate"), Decimal("120")),
                    IngredientSpec(("olive oil", "aceite de oliva"), Decimal("10")),
                ],
                "instructions": "Asar patata en cubos, cocinar salmon al horno y servir con ensalada de tomate.",
            },
            {
                "key": "atun_garbanzos",
                "name": "SISTEMA - Ensalada de Atun con Garbanzos",
                "category": "Almuerzo",
                "meal_types": ["lunch"],
                "difficulty": "Fácil",
                "prep": 12,
                "cook": 0,
                "servings": 1,
                "ingredients": [
                    IngredientSpec(("tuna", "atun"), Decimal("120")),
                    IngredientSpec(("chickpea", "garbanzo"), Decimal("150")),
                    IngredientSpec(("tomato", "tomate"), Decimal("100")),
                    IngredientSpec(("onion", "cebolla"), Decimal("40")),
                    IngredientSpec(("olive oil", "aceite de oliva"), Decimal("8")),
                ],
                "instructions": "Escurrir atun y garbanzos, mezclar con verduras frescas y aceite.",
            },
            {
                "key": "yogur_fruta",
                "name": "SISTEMA - Yogur con Fruta y Nueces",
                "category": "Snack",
                "meal_types": ["snack"],
                "difficulty": "Fácil",
                "prep": 5,
                "cook": 0,
                "servings": 1,
                "ingredients": [
                    IngredientSpec(("yogurt", "yogur"), Decimal("200")),
                    IngredientSpec(("strawberry", "fresa", "berries"), Decimal("120")),
                    IngredientSpec(("walnut", "nuez"), Decimal("15")),
                ],
                "instructions": "Servir yogur frio con fruta troceada y nueces picadas.",
            },
        ]

        created: dict[str, Recipe] = {}

        for rec in recipes_def:
            recipe, _ = Recipe.objects.update_or_create(
                name=rec["name"],
                defaults={
                    "description": "Receta realista del sistema para pruebas funcionales.",
                    "category": rec["category"],
                    "difficulty": rec["difficulty"],
                    "prep_time_minutes": rec["prep"],
                    "cook_time_minutes": rec["cook"],
                    "servings": rec["servings"],
                    "meal_types": rec["meal_types"],
                    "goal_category": "maintain",
                    "diet_types": ["normal"],
                    "allergens": [],
                    "tags": ["sistema", "realista", "importado"],
                    "instructions": rec["instructions"],
                    "is_system": True,
                    "is_active": True,
                    "is_featured": True,
                    "created_by": None,
                },
            )

            RecipeIngredient.objects.filter(recipe=recipe).delete()

            ingredients_json = []
            for order, spec in enumerate(rec["ingredients"], start=1):
                food = self._pick_food(spec.terms)
                RecipeIngredient.objects.create(
                    recipe=recipe,
                    food=food,
                    quantity=spec.grams,
                    unit=spec.unit,
                    order=order,
                )
                ingredients_json.append(
                    {
                        "name": food.name,
                        "amount": float(spec.grams),
                        "unit": spec.unit,
                    }
                )

            recipe.ingredients = ingredients_json
            recipe.calculate_macros_from_ingredients(save=False)
            recipe.save(_skip_macro_recalc=True)

            created[rec["key"]] = recipe

        self.stdout.write("6 recetas SISTEMA con alimentos importados creadas/actualizadas.")
        return created

    def _create_system_nutrition_plan(self, recipes: dict[str, Recipe]) -> NutritionPlan:
        plan, _ = NutritionPlan.objects.update_or_create(
            name="SISTEMA - Menu Semanal Realista",
            user=None,
            defaults={
                "description": "Menu semanal de pruebas con recetas basadas en alimentos importados.",
                "daily_calories": 2200,
                "protein_grams": 150,
                "carbs_grams": 230,
                "fat_grams": 75,
                "fiber_grams": 30,
                "goal": "maintain",
                "diet_type": "normal",
                "meals_per_day": 4,
                "duration_weeks": 8,
                "portion_multiplier": Decimal("1.00"),
                "is_template": True,
                "is_system": True,
                "is_active": True,
                "tags": ["sistema", "menu", "realista"],
                "created_by": None,
            },
        )

        plan.meals.all().delete()

        breakfast_options = [recipes["avena"], recipes["tortilla"]]
        lunch_options = [recipes["pollo_arroz"], recipes["atun_garbanzos"]]
        snack_options = [recipes["yogur_fruta"], recipes["avena"]]
        dinner_options = [recipes["salmon_patata"], recipes["tortilla"]]

        slots = [
            ("Desayuno", "breakfast", time(8, 0), 1, breakfast_options),
            ("Almuerzo", "lunch", time(13, 30), 2, lunch_options),
            ("Merienda", "snack", time(17, 30), 3, snack_options),
            ("Cena", "dinner", time(21, 0), 4, dinner_options),
        ]

        for day in range(1, 8):
            for slot_name, meal_type, slot_time, order, options in slots:
                primary = options[0]
                meal = PlanMeal.objects.create(
                    plan=plan,
                    day_of_week=day,
                    name=f"{slot_name} - Dia {day}",
                    meal_type=meal_type,
                    time=slot_time,
                    calories=max(int(primary.calories), 200),
                    protein=primary.protein,
                    carbs=primary.carbs,
                    fat=primary.fat,
                    description="Comida del menu semanal SISTEMA.",
                    order_index=order,
                )
                meal.suggested_recipes.set(options)
                for idx, recipe in enumerate(options, start=1):
                    PlanMealRecipe.objects.create(
                        meal=meal,
                        recipe=recipe,
                        servings=Decimal("1.00"),
                        display_order=idx,
                    )

        self.stdout.write("Plan de menu semanal SISTEMA actualizado con 6 recetas reales.")
        return plan

    def _assign_workout_to_user(self, template_plan: WorkoutProgram, user):
        WorkoutProgram.objects.filter(user=user, is_active=True).update(is_active=False)

        plan, _ = WorkoutProgram.objects.update_or_create(
            user=user,
            name=f"{template_plan.name} - {user.first_name or user.email}",
            defaults={
                "description": template_plan.description,
                "difficulty": template_plan.difficulty,
                "goal": template_plan.goal,
                "location": template_plan.location,
                "duration_weeks": template_plan.duration_weeks,
                "days_per_week": template_plan.days_per_week,
                "estimated_duration_minutes": template_plan.estimated_duration_minutes,
                "equipment_needed": template_plan.equipment_needed,
                "is_template": False,
                "is_system": False,
                "is_active": True,
                "tags": template_plan.tags,
                "created_by": None,
                "start_date": None,
                "end_date": None,
            },
        )

        plan.days.all().delete()

        for day in template_plan.days.all().order_by("order_index"):
            copied_day = WorkoutDay.objects.create(
                program=plan,
                name=day.name,
                day_number=day.day_number,
                day_of_week=day.day_of_week,
                is_rest_day=day.is_rest_day,
                duration_minutes=day.duration_minutes,
                focus=day.focus,
                notes=day.notes,
                order_index=day.order_index,
            )
            for ex in day.exercises.all().order_by("order_index"):
                WorkoutDayExercise.objects.create(
                    workout_day=copied_day,
                    exercise=ex.exercise,
                    sets=ex.sets,
                    reps=ex.reps,
                    weight=ex.weight,
                    duration_seconds=ex.duration_seconds,
                    rest_seconds=ex.rest_seconds,
                    notes=ex.notes,
                    order_index=ex.order_index,
                    superset_group=ex.superset_group,
                )

    def _assign_nutrition_to_user(self, template_plan: NutritionPlan, user):
        NutritionPlan.objects.filter(user=user, is_active=True).update(is_active=False)

        plan, _ = NutritionPlan.objects.update_or_create(
            user=user,
            name=f"{template_plan.name} - {user.first_name or user.email}",
            defaults={
                "description": template_plan.description,
                "daily_calories": template_plan.daily_calories,
                "protein_grams": template_plan.protein_grams,
                "carbs_grams": template_plan.carbs_grams,
                "fat_grams": template_plan.fat_grams,
                "fiber_grams": template_plan.fiber_grams,
                "protein_percentage": template_plan.protein_percentage,
                "carbs_percentage": template_plan.carbs_percentage,
                "fat_percentage": template_plan.fat_percentage,
                "goal": template_plan.goal,
                "diet_type": template_plan.diet_type,
                "meals_per_day": template_plan.meals_per_day,
                "duration_weeks": template_plan.duration_weeks,
                "portion_multiplier": template_plan.portion_multiplier,
                "is_template": False,
                "is_system": False,
                "is_active": True,
                "tags": template_plan.tags,
                "created_by": None,
                "start_date": None,
                "end_date": None,
            },
        )

        plan.meals.all().delete()

        for meal in template_plan.meals.all().order_by("day_of_week", "order_index"):
            copied_meal = PlanMeal.objects.create(
                plan=plan,
                day_of_week=meal.day_of_week,
                name=meal.name,
                meal_type=meal.meal_type,
                time=meal.time,
                calories=meal.calories,
                protein=meal.protein,
                carbs=meal.carbs,
                fat=meal.fat,
                description=meal.description,
                order_index=meal.order_index,
            )
            copied_meal.suggested_recipes.set(meal.suggested_recipes.all())
            for option in meal.meal_recipes.all().order_by("display_order"):
                PlanMealRecipe.objects.create(
                    meal=copied_meal,
                    recipe=option.recipe,
                    servings=option.servings,
                    custom_calories=option.custom_calories,
                    custom_protein=option.custom_protein,
                    custom_carbs=option.custom_carbs,
                    custom_fat=option.custom_fat,
                    display_order=option.display_order,
                )
