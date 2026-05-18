# accounts/management/commands/create_admin_data.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import CustomUser
from workouts.models import (
    Exercise, WorkoutPlanTemplate, WorkoutPlanDay, WorkoutPlanExercise,
    UserWorkoutPlan, UserWorkoutPlanDay, UserWorkoutPlanExercise
)
from nutrition.models import DefaultNutritionPlan, Food, Meal
from progress.models import WeightEntry, BodyMeasurement
from datetime import datetime, timedelta
import random
import os

User = get_user_model()

class Command(BaseCommand):
    help = 'Crea datos de prueba para el usuario administrador'

    def handle(self, *args, **options):
        self.stdout.write('Creando datos de prueba para el administrador...')
        
        # Buscar el usuario administrador
        admin_email = os.getenv('ADMIN_EMAIL', 'admin@example.invalid')
        try:
            admin_user = User.objects.get(email=admin_email)
            self.stdout.write(f'Usuario administrador encontrado: {admin_user.email}')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Usuario administrador no encontrado: {admin_email}'))
            return

        # Actualizar perfil del administrador
        self.create_admin_profile(admin_user)
        
        # Crear ejercicios de ejemplo
        self.create_sample_exercises()
        
        # Crear plantillas de planes de entrenamiento
        self.create_workout_templates(admin_user)
        
        # Crear plan nutricional por defecto
        self.create_nutrition_plan()
        
        # Crear datos de progreso de ejemplo
        self.create_sample_progress_data(admin_user)
        
        self.stdout.write(self.style.SUCCESS('Datos de prueba creados exitosamente'))

    def create_admin_profile(self, user):
        """Actualizar el perfil del administrador"""
        user.first_name = 'Admin'
        user.last_name = 'Administrador'
        user.phone = ''
        user.date_of_birth = datetime(1990, 5, 15).date()
        user.gender = 'male'
        user.height = 180  # cm
        user.weight = 75  # kg
        user.activity_level = 'moderate'
        user.fitness_goal = 'maintenance'
        user.medical_conditions = 'Ninguna'
        user.emergency_contact_name = ''
        user.emergency_contact_phone = ''
        user.save()
        
        self.stdout.write('Perfil del administrador actualizado')

    def create_sample_exercises(self):
        """Crear ejercicios de ejemplo"""
        exercises_data = [
            {
                'name': 'Press de banca',
                'category': 'upper_body',
                'muscle_groups': ['pectorales', 'deltoides', 'tríceps'],
                'instructions': 'Acuéstate en el banco, baja la barra al pecho y empuja hacia arriba. Ejercicio fundamental para el desarrollo del pecho.'
            },
            {
                'name': 'Sentadilla',
                'category': 'lower_body',
                'muscle_groups': ['cuádriceps', 'glúteos', 'isquiotibiales'],
                'instructions': 'Párate con los pies al ancho de los hombros, baja como si te sentaras. Ejercicio rey para las piernas.'
            },
            {
                'name': 'Peso muerto',
                'category': 'full_body',
                'muscle_groups': ['espalda', 'glúteos', 'isquiotibiales'],
                'instructions': 'Levanta la barra del suelo manteniendo la espalda recta. Ejercicio completo para todo el cuerpo.'
            },
            {
                'name': 'Press militar',
                'category': 'upper_body',
                'muscle_groups': ['deltoides', 'tríceps'],
                'instructions': 'Empuja la barra desde los hombros hacia arriba. Desarrollo de hombros.'
            },
            {
                'name': 'Dominadas',
                'category': 'upper_body',
                'muscle_groups': ['dorsales', 'bíceps'],
                'instructions': 'Cuelga de la barra y tira hacia arriba hasta que el mentón pase la barra. Ejercicio de tracción para la espalda.'
            },
            {
                'name': 'Plancha',
                'category': 'core',
                'muscle_groups': ['core', 'abdominales'],
                'instructions': 'Mantén la posición de plancha con el cuerpo recto. Ejercicio isométrico para el core.'
            }
        ]

        for exercise_data in exercises_data:
            exercise, created = Exercise.objects.get_or_create(
                name=exercise_data['name'],
                defaults=exercise_data
            )
            if created:
                self.stdout.write(f'Ejercicio creado: {exercise.name}')

    def create_workout_templates(self, admin_user):
        """Crear plantillas de planes de entrenamiento"""
        
        # Plan para principiantes
        beginner_plan = WorkoutPlanTemplate.objects.create(
            name='Plan Principiante - 4 Semanas',
            description='Plan ideal para personas que empiezan en el gimnasio',
            difficulty='beginner',
            goal='muscle_gain',
            duration_weeks=4,
            days_per_week=3,
            is_active=True,
            is_public=True,
            created_by=admin_user,
            tags=['principiante', 'musculación', '4_semanas']
        )

        # Días del plan principiante
        days_data = [
            {
                'day_name': 'Día 1 - Tren Superior',
                'day_number': 1,
                'is_rest_day': False,
                'notes': 'Enfoque en pecho, espalda y brazos',
                'exercises': [
                    {'name': 'Press de banca', 'sets': 3, 'reps': '8-10', 'weight': '40-50kg', 'rest_time': 90},
                    {'name': 'Dominadas asistidas', 'sets': 3, 'reps': '5-8', 'weight': 'Asistido', 'rest_time': 90},
                    {'name': 'Press militar', 'sets': 3, 'reps': '8-10', 'weight': '20-25kg', 'rest_time': 60},
                    {'name': 'Plancha', 'sets': 3, 'reps': '30-45s', 'weight': 'Peso corporal', 'rest_time': 60}
                ]
            },
            {
                'day_name': 'Día 2 - Tren Inferior',
                'day_number': 2,
                'is_rest_day': False,
                'notes': 'Enfoque en piernas y glúteos',
                'exercises': [
                    {'name': 'Sentadilla', 'sets': 3, 'reps': '8-10', 'weight': '30-40kg', 'rest_time': 90},
                    {'name': 'Peso muerto rumano', 'sets': 3, 'reps': '8-10', 'weight': '30-40kg', 'rest_time': 90},
                    {'name': 'Zancadas', 'sets': 3, 'reps': '10-12', 'weight': 'Peso corporal', 'rest_time': 60},
                    {'name': 'Plancha lateral', 'sets': 2, 'reps': '20-30s', 'weight': 'Peso corporal', 'rest_time': 60}
                ]
            },
            {
                'day_name': 'Día 3 - Descanso',
                'day_number': 3,
                'is_rest_day': True,
                'notes': 'Día de descanso activo o recuperación',
                'exercises': []
            }
        ]

        for day_data in days_data:
            day = WorkoutPlanDay.objects.create(
                plan=beginner_plan,
                day_name=day_data['day_name'],
                day_number=day_data['day_number'],
                is_rest_day=day_data['is_rest_day'],
                notes=day_data['notes'],
                order_index=day_data['day_number']
            )

            for i, exercise_data in enumerate(day_data['exercises']):
                try:
                    exercise = Exercise.objects.get(name=exercise_data['name'])
                    WorkoutPlanExercise.objects.create(
                        workout_day=day,
                        exercise=exercise,
                        sets=exercise_data['sets'],
                        reps=exercise_data['reps'],
                        weight=exercise_data['weight'],
                        rest_time=exercise_data['rest_time'],
                        notes=f'Ejercicio {i+1} del {day.day_name}',
                        order_index=i+1
                    )
                except Exercise.DoesNotExist:
                    self.stdout.write(f'Ejercicio no encontrado: {exercise_data["name"]}')

        self.stdout.write(f'Plan de entrenamiento creado: {beginner_plan.name}')

    def create_nutrition_plan(self):
        """Crear plan nutricional por defecto"""
        
        # Crear alimentos básicos
        foods_data = [
            {'name': 'Pechuga de pollo', 'unit': '100g', 'calories': 165, 'protein': 31, 'carbs': 0, 'fat': 3.6},
            {'name': 'Arroz blanco', 'unit': '100g', 'calories': 130, 'protein': 2.7, 'carbs': 28, 'fat': 0.3},
            {'name': 'Brócoli', 'unit': '100g', 'calories': 34, 'protein': 2.8, 'carbs': 7, 'fat': 0.4},
            {'name': 'Aceite de oliva', 'unit': '100g', 'calories': 884, 'protein': 0, 'carbs': 0, 'fat': 100},
            {'name': 'Plátano', 'unit': '100g', 'calories': 89, 'protein': 1.1, 'carbs': 23, 'fat': 0.3},
            {'name': 'Avena', 'unit': '100g', 'calories': 389, 'protein': 17, 'carbs': 66, 'fat': 7},
        ]

        for food_data in foods_data:
            food, created = Food.objects.get_or_create(
                name=food_data['name'],
                defaults=food_data
            )
            if created:
                self.stdout.write(f'Alimento creado: {food.name}')

        # Crear plan nutricional por defecto
        nutrition_plan, created = DefaultNutritionPlan.objects.get_or_create(
            name='Plan Básico de Mantenimiento',
            defaults={
                'description': 'Plan nutricional básico para mantenimiento de peso',
                'daily_calories': 2000,
                'target_macros': {
                    'protein': 150,
                    'carbs': 250,
                    'fat': 67
                },
                'is_active': True,
                'is_default': True
            }
        )

        if created:
            self.stdout.write(f'Plan nutricional creado: {nutrition_plan.name}')

    def create_sample_progress_data(self, user):
        """Crear datos de progreso de ejemplo"""
        
        # Crear entradas de peso de los últimos 30 días
        base_weight = 75.0
        for i in range(30):
            date = datetime.now().date() - timedelta(days=29-i)
            # Simular variación de peso
            weight_variation = random.uniform(-0.5, 0.5)
            weight = base_weight + weight_variation + (i * 0.1)  # Tendencia ligeramente ascendente
            
            WeightEntry.objects.get_or_create(
                user=user,
                date=date,
                defaults={
                    'weight': round(weight, 1),
                    'notes': f'Peso registrado el {date.strftime("%d/%m/%Y")}'
                }
            )

        # Crear mediciones corporales
        BodyMeasurement.objects.get_or_create(
            user=user,
            date=datetime.now().date(),
            defaults={
                'chest': 100,
                'waist': 85,
                'hips': 95,
                'arms': 35,
                'thighs': 60,
                'notes': 'Mediciones iniciales del administrador'
            }
        )

        self.stdout.write('Datos de progreso creados')
