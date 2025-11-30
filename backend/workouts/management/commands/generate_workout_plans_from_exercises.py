"""
Comando para generar planes de entrenamiento a partir de los ejercicios disponibles
Genera planes variados basados en combinaciones de:
- Días por semana (1-7)
- Dificultad (beginner, intermediate, advanced)
- Objetivo (weight_loss, muscle_gain, strength_building, endurance, general_fitness)
- Rol mínimo (basic, pro, premium)
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from workouts.models import (
    Exercise, 
    WorkoutPlanTemplate, 
    WorkoutPlanDay, 
    WorkoutPlanExercise
)
from accounts.models import CustomUser
import random


class Command(BaseCommand):
    help = 'Genera planes de entrenamiento desde los ejercicios disponibles'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days-range',
            type=str,
            default='1-7',
            help='Rango de días por semana (ej: 1-7, 3-5)',
        )
        parser.add_argument(
            '--max-plans',
            type=int,
            default=None,
            help='Número máximo de planes a generar (None = todos los posibles)',
        )

    def handle(self, *args, **options):
        # Obtener usuario administrador
        admin_user = CustomUser.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user = CustomUser.objects.first()
            if not admin_user:
                self.stdout.write(self.style.ERROR('❌ No hay usuarios en la base de datos'))
                return

        # Obtener ejercicios disponibles
        exercises = list(Exercise.objects.all())
        if not exercises:
            self.stdout.write(self.style.ERROR('❌ No hay ejercicios en la base de datos. Ejecuta primero populate_exercises_from_list'))
            return

        self.stdout.write(f'📋 Ejercicios disponibles: {len(exercises)}')

        # Configuraciones posibles
        days_per_week_options = list(range(1, 8))
        difficulties = ['beginner', 'intermediate', 'advanced']
        goals = ['weight_loss', 'muscle_gain', 'strength_building', 'endurance', 'general_fitness']
        roles = ['basic', 'pro', 'premium']

        # Parsear rango de días
        days_range = options['days_range']
        if '-' in days_range:
            start, end = map(int, days_range.split('-'))
            days_per_week_options = list(range(start, end + 1))

        max_plans = options.get('max_plans')

        plans_to_create = []

        # Generar combinaciones
        for days in days_per_week_options:
            for difficulty in difficulties:
                for goal in goals:
                    for role in roles:
                        plans_to_create.append({
                            'days_per_week': days,
                            'difficulty': difficulty,
                            'goal': goal,
                            'role': role
                        })

        if max_plans:
            plans_to_create = plans_to_create[:max_plans]

        self.stdout.write(f'🏋️  Generando {len(plans_to_create)} planes de entrenamiento...')

        created = 0
        errors = 0

        for plan_config in plans_to_create:
            try:
                with transaction.atomic():
                    plan_name = self._generate_plan_name(plan_config)
                    
                    # Verificar si ya existe
                    if WorkoutPlanTemplate.objects.filter(name=plan_name).exists():
                        continue

                    plan = WorkoutPlanTemplate.objects.create(
                        name=plan_name,
                        description=self._generate_description(plan_config),
                        difficulty=plan_config['difficulty'],
                        goal=plan_config['goal'],
                        duration_weeks=self._get_duration_weeks(plan_config['days_per_week']),
                        days_per_week=plan_config['days_per_week'],
                        is_active=True,
                        is_public=True,
                        created_by=admin_user,
                        min_role_required=plan_config['role'],
                        tags=self._generate_tags(plan_config),
                        is_default=False,  # Se marcará después según condiciones
                        default_conditions={}
                    )

                    # Crear días del plan
                    self._create_plan_days(plan, plan_config, exercises)

                    # Marcar como por defecto si cumple ciertas condiciones
                    self._mark_as_default_if_needed(plan, plan_config)

                    created += 1
                    self.stdout.write(f'   ✓ {plan_name}')

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'   ❌ Error al crear plan: {e}')
                )
                errors += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Proceso completado:\n'
                f'   - {created} planes creados\n'
                f'   - {errors} errores'
            )
        )

    def _generate_plan_name(self, config):
        """Genera nombre del plan"""
        days = config['days_per_week']
        difficulty_names = {
            'beginner': 'Principiante',
            'intermediate': 'Intermedio',
            'advanced': 'Avanzado'
        }
        goal_names = {
            'weight_loss': 'Pérdida de Peso',
            'muscle_gain': 'Ganancia Muscular',
            'strength_building': 'Fuerza',
            'endurance': 'Resistencia',
            'general_fitness': 'Fitness General'
        }
        role_names = {
            'basic': 'Básico',
            'pro': 'Pro',
            'premium': 'Premium'
        }

        difficulty = difficulty_names[config['difficulty']]
        goal = goal_names[config['goal']]
        role = role_names[config['role']]

        return f"Plan {days} días/semana - {difficulty} - {goal} ({role})"

    def _generate_description(self, config):
        """Genera descripción del plan"""
        return (
            f"Plan de entrenamiento de {config['days_per_week']} días por semana, "
            f"nivel {config['difficulty']}, enfocado en {config['goal']}. "
            f"Para usuarios con rol mínimo {config['role']}."
        )

    def _get_duration_weeks(self, days_per_week):
        """Calcula duración según días por semana"""
        if days_per_week <= 3:
            return 8
        elif days_per_week <= 5:
            return 6
        else:
            return 4

    def _generate_tags(self, config):
        """Genera etiquetas para el plan"""
        tags = [
            f"{config['days_per_week']}_dias",
            config['difficulty'],
            config['goal'],
            config['role']
        ]
        return tags

    def _create_plan_days(self, plan, config, exercises):
        """Crea los días del plan con ejercicios"""
        days_per_week = config['days_per_week']
        difficulty = config['difficulty']
        goal = config['goal']

        # Filtrar ejercicios por dificultad y objetivo (simplificado)
        available_exercises = exercises
        if difficulty == 'beginner':
            available_exercises = [e for e in exercises if 'cardio' not in e.category.lower() or 'strength' in e.category.lower()]
        elif difficulty == 'advanced':
            available_exercises = exercises

        day_names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

        for day_num in range(1, days_per_week + 1):
            day_name = day_names[(day_num - 1) % 7]
            day = WorkoutPlanDay.objects.create(
                plan=plan,
                day_name=day_name,
                day_number=day_num,
                is_rest_day=False,
                notes=f"Día {day_num} de entrenamiento",
                order_index=day_num
            )

            # Seleccionar 4-6 ejercicios para el día
            num_exercises = random.randint(4, 6)
            selected_exercises = random.sample(
                available_exercises,
                min(num_exercises, len(available_exercises))
            )

            for idx, exercise in enumerate(selected_exercises, 1):
                # Determinar series y repeticiones según dificultad
                if difficulty == 'beginner':
                    sets = random.randint(2, 3)
                    reps = random.choice(["8-10", "10-12", "12-15"])
                elif difficulty == 'intermediate':
                    sets = random.randint(3, 4)
                    reps = random.choice(["8-10", "10-12", "12"])
                else:  # advanced
                    sets = random.randint(4, 5)
                    reps = random.choice(["6-8", "8-10", "10"])

                rest_time = 60 if difficulty == 'beginner' else (90 if difficulty == 'intermediate' else 120)

                WorkoutPlanExercise.objects.create(
                    workout_day=day,
                    exercise=exercise,
                    sets=sets,
                    reps=reps,
                    rest_time=rest_time,
                    notes=f"Ejercicio {idx}",
                    order_index=idx
                )

    def _mark_as_default_if_needed(self, plan, config):
        """Marca el plan como por defecto si cumple condiciones comunes"""
        # Planes por defecto comunes:
        # - 3 días/semana, beginner, general_fitness, basic
        # - 4 días/semana, intermediate, muscle_gain, pro
        # - 5 días/semana, intermediate, strength_building, premium

        default_configs = [
            {
                'days_per_week': 3,
                'difficulty': 'beginner',
                'goal': 'general_fitness',
                'role': 'basic'
            },
            {
                'days_per_week': 4,
                'difficulty': 'intermediate',
                'goal': 'muscle_gain',
                'role': 'pro'
            },
            {
                'days_per_week': 5,
                'difficulty': 'intermediate',
                'goal': 'strength_building',
                'role': 'premium'
            },
        ]

        for default_config in default_configs:
            if all(
                config[key] == default_config[key]
                for key in ['days_per_week', 'difficulty', 'goal', 'role']
            ):
                plan.is_default = True
                plan.default_conditions = {
                    'days_per_week': config['days_per_week'],
                    'difficulty': config['difficulty'],
                    'goal': config['goal'],
                    'min_role_required': config['role']
                }
                plan.save()
                break

