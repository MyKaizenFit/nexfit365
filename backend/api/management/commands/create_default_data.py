from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import time
import random

from nutrition.models import DefaultNutritionPlan, DefaultMeal, Food
from workouts.models import DefaultWorkoutProgram, DefaultWorkoutDay, DefaultExercise, Exercise
from notifications.models import MotivationalTip
from progress.models import MoodEntry

User = get_user_model()


class Command(BaseCommand):
    help = 'Crea datos por defecto para la aplicación'

    def handle(self, *args, **options):
        self.stdout.write('Creando datos por defecto...')
        
        # Crear plan de nutrición por defecto
        self.create_default_nutrition_plan()
        
        # Crear programa de entrenamiento por defecto
        self.create_default_workout_program()
        
        # Crear consejos motivacionales
        self.create_motivational_tips()
        
        # Crear ejercicios básicos si no existen
        self.create_basic_exercises()
        
        # Crear alimentos básicos si no existen
        self.create_basic_foods()
        
        self.stdout.write(self.style.SUCCESS('¡Datos por defecto creados exitosamente!'))

    def create_default_nutrition_plan(self):
        """Crear plan de nutrición por defecto"""
        plan, created = DefaultNutritionPlan.objects.get_or_create(
            is_default=True,
            defaults={
                'name': 'Plan Básico de Nutrición',
                'description': 'Plan equilibrado para principiantes con 2000 calorías diarias',
                'daily_calories': 2000,
                'target_macros': {
                    'protein': 150,  # 30% de las calorías
                    'carbs': 250,     # 50% de las calorías
                    'fat': 67         # 20% de las calorías
                }
            }
        )
        
        if created:
            self.stdout.write(f'Plan de nutrición creado: {plan.name}')
            
            # Crear comidas por defecto
            meals_data = [
                {
                    'name': 'Desayuno',
                    'time': time(8, 0),
                    'calories': 500,
                    'protein': 30,
                    'carbs': 60,
                    'fat': 20,
                    'description': 'Desayuno energético para empezar el día'
                },
                {
                    'name': 'Almuerzo',
                    'time': time(13, 0),
                    'calories': 700,
                    'protein': 45,
                    'carbs': 80,
                    'fat': 25,
                    'description': 'Comida principal del día'
                },
                {
                    'name': 'Merienda',
                    'time': time(16, 0),
                    'calories': 300,
                    'protein': 20,
                    'carbs': 35,
                    'fat': 12,
                    'description': 'Snack saludable para la tarde'
                },
                {
                    'name': 'Cena',
                    'time': time(20, 0),
                    'calories': 500,
                    'protein': 55,
                    'carbs': 75,
                    'fat': 10,
                    'description': 'Cena ligera y nutritiva'
                }
            ]
            
            for i, meal_data in enumerate(meals_data, 1):
                DefaultMeal.objects.get_or_create(
                    plan=plan,
                    name=meal_data['name'],
                    defaults={
                        **meal_data,
                        'order_index': i
                    }
                )
            
            self.stdout.write(f'Comidas por defecto creadas para {plan.name}')

    def create_default_workout_program(self):
        """Crear programa de entrenamiento por defecto"""
        program, created = DefaultWorkoutProgram.objects.get_or_create(
            is_default=True,
            defaults={
                'name': 'Programa Básico de Entrenamiento',
                'description': 'Programa de 4 semanas para principiantes',
                'difficulty': 'beginner',
                'duration_weeks': 4
            }
        )
        
        if created:
            self.stdout.write(f'Programa de entrenamiento creado: {program.name}')
            
            # Crear días de entrenamiento
            days_data = [
                {'day_name': 'Lunes', 'day_number': 1, 'is_rest_day': False, 'notes': 'Entrenamiento de pecho y tríceps'},
                {'day_name': 'Martes', 'day_number': 2, 'is_rest_day': False, 'notes': 'Entrenamiento de espalda y bíceps'},
                {'day_name': 'Miércoles', 'day_number': 3, 'is_rest_day': False, 'notes': 'Entrenamiento de piernas'},
                {'day_name': 'Jueves', 'day_number': 4, 'is_rest_day': False, 'notes': 'Entrenamiento de hombros'},
                {'day_name': 'Viernes', 'day_number': 5, 'is_rest_day': False, 'notes': 'Entrenamiento de cuerpo completo'},
                {'day_name': 'Sábado', 'day_number': 6, 'is_rest_day': True, 'notes': 'Día de descanso'},
                {'day_name': 'Domingo', 'day_number': 7, 'is_rest_day': True, 'notes': 'Día de descanso'}
            ]
            
            for day_data in days_data:
                DefaultWorkoutDay.objects.get_or_create(
                    program=program,
                    day_name=day_data['day_name'],
                    defaults=day_data
                )
            
            self.stdout.write(f'Días de entrenamiento creados para {program.name}')

    def create_motivational_tips(self):
        """Crear consejos motivacionales"""
        tips_data = [
            {
                'title': '¡Cada paso cuenta!',
                'content': 'Recuerda que cada pequeño esfuerzo te acerca a tu meta. No importa si es solo 10 minutos de ejercicio, ¡cuenta!',
                'category': 'motivation',
                'priority': 10
            },
            {
                'title': 'Hidratación es clave',
                'content': 'Bebe al menos 8 vasos de agua al día. La hidratación mejora tu rendimiento y recuperación.',
                'category': 'nutrition',
                'priority': 9
            },
            {
                'title': 'Consistencia sobre intensidad',
                'content': 'Es mejor hacer ejercicio moderado 5 días a la semana que hacer ejercicio intenso solo 1 día.',
                'category': 'workout',
                'priority': 8
            },
            {
                'title': 'Celebra tus logros',
                'content': 'No importa qué tan pequeños sean, celebra cada logro. ¡Te lo mereces!',
                'category': 'mindset',
                'priority': 7
            },
            {
                'title': 'Descanso es entrenamiento',
                'content': 'El descanso es parte fundamental de tu progreso. Permite que tu cuerpo se recupere.',
                'category': 'recovery',
                'priority': 6
            }
        ]
        
        for tip_data in tips_data:
            MotivationalTip.objects.get_or_create(
                title=tip_data['title'],
                defaults=tip_data
            )
        
        self.stdout.write(f'{len(tips_data)} consejos motivacionales creados')

    def create_basic_exercises(self):
        """Crear ejercicios básicos si no existen"""
        exercises_data = [
            {'name': 'Flexiones de pecho', 'instructions': 'Ejercicio básico para pecho y tríceps', 'category': 'strength', 'muscle_groups': ['chest', 'triceps']},
            {'name': 'Sentadillas', 'instructions': 'Ejercicio fundamental para piernas', 'category': 'strength', 'muscle_groups': ['legs', 'glutes']},
            {'name': 'Plancha', 'instructions': 'Ejercicio isométrico para core', 'category': 'strength', 'muscle_groups': ['core', 'abs']},
            {'name': 'Burpees', 'instructions': 'Ejercicio completo de cuerpo', 'category': 'cardio', 'muscle_groups': ['full_body']},
            {'name': 'Mountain climbers', 'instructions': 'Ejercicio cardiovascular', 'category': 'cardio', 'muscle_groups': ['core', 'shoulders']},
        ]
        
        for exercise_data in exercises_data:
            Exercise.objects.get_or_create(
                name=exercise_data['name'],
                defaults=exercise_data
            )
        
        self.stdout.write('Ejercicios básicos verificados/creados')

    def create_basic_foods(self):
        """Crear alimentos básicos si no existen"""
        foods_data = [
            {'name': 'Pollo', 'unit': 'g', 'calories': 165, 'protein': 31, 'carbs': 0, 'fat': 3.6},
            {'name': 'Arroz integral', 'unit': 'g', 'calories': 111, 'protein': 2.6, 'carbs': 23, 'fat': 0.9},
            {'name': 'Brócoli', 'unit': 'g', 'calories': 34, 'protein': 2.8, 'carbs': 7, 'fat': 0.4},
            {'name': 'Huevo', 'unit': 'unidad', 'calories': 70, 'protein': 6, 'carbs': 0.6, 'fat': 5},
            {'name': 'Avena', 'unit': 'g', 'calories': 389, 'protein': 17, 'carbs': 66, 'fat': 7},
        ]
        
        for food_data in foods_data:
            Food.objects.get_or_create(
                name=food_data['name'],
                defaults=food_data
            )
        
        self.stdout.write('Alimentos básicos verificados/creados')
