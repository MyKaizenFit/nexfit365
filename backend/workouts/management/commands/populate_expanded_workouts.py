from django.core.management.base import BaseCommand
from workouts.models import Exercise, WorkoutPlanTemplate, WorkoutPlanDay, WorkoutPlanExercise
from accounts.models import CustomUser
from django.utils import timezone
import random

class Command(BaseCommand):
    help = 'Crea una gran variedad de planes de entrenamiento basados en todas las combinaciones posibles del formulario'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Eliminar todos los planes existentes antes de crear nuevos')

    def handle(self, *args, **options):
        if options['clear']:
            WorkoutPlanTemplate.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✅ Planes existentes eliminados'))
        
        admin_user = CustomUser.objects.filter(is_superuser=True).first() or CustomUser.objects.first()
        
        # Obtener todos los ejercicios disponibles
        exercises = list(Exercise.objects.all())
        
        self.stdout.write(f'📚 Total ejercicios disponibles: {len(exercises)}')
        
        if len(exercises) == 0:
            self.stdout.write(self.style.ERROR('❌ No hay ejercicios disponibles. Ejecuta primero populate_exercises.py'))
            return
        
        # Combinaciones: días (1-7) x ubicación (home/gym) x objetivo (3) x nivel_actividad (5) x dificultad (3)
        total_combinations = 7 * 2 * 3 * 5 * 3  # = 630 planes potenciales
        
        created_count = 0
        skipped_count = 0
        
        for days in range(1, 8):  # 1-7 días
            for location in ['home', 'gym']:
                for goal in ['lose_weight', 'gain_muscle', 'body_recomposition']:
                    for activity in ['sedentary', 'light', 'moderate', 'active', 'very_active']:
                        for difficulty in ['beginner', 'intermediate', 'advanced']:
                            try:
                                # Crear nombre descriptivo
                                location_name = 'Casa' if location == 'home' else 'Gimnasio'
                                goal_name = self.get_goal_name(goal)
                                activity_name = self.get_activity_name(activity)
                                difficulty_name = self.get_difficulty_name(difficulty)
                                
                                name = f"{location_name} - {days} {self.pluralize_dias(days)} - {goal_name} - {activity_name} - {difficulty_name}"
                                
                                # Verificar si ya existe
                                if WorkoutPlanTemplate.objects.filter(name=name).exists():
                                    skipped_count += 1
                                    continue
                                
                                # Crear el plan
                                plan = WorkoutPlanTemplate.objects.create(
                                    name=name,
                                    description=f"Plan de entrenamiento para {activity_name.lower()} en {location_name.lower()}. "
                                                f"Objetivo: {goal_name}. "
                                                f"{days} día(s) por semana.",
                                    difficulty=difficulty,
                                    goal=self.map_goal_to_template(goal),
                                    duration_weeks=self.get_duration(activity, goal),
                                    days_per_week=days,
                                    is_active=True,
                                    is_public=True,
                                    created_by=admin_user,
                                    tags=self.create_tags(days, location, goal, activity, difficulty),
                                    min_role_required='basic'
                                )
                                
                                # Agregar días de entrenamiento
                                self.create_workout_days(plan, days, location, goal, difficulty)
                                
                                created_count += 1
                                
                                if created_count % 50 == 0:
                                    self.stdout.write(f'✅ Creados {created_count} planes...')
                                    
                            except Exception as e:
                                self.stdout.write(self.style.ERROR(f'❌ Error creando plan: {e}'))
                                continue
        
        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Proceso completado:\n'
            f'   • Planes creados: {created_count}\n'
            f'   • Planes omitidos (ya existían): {skipped_count}\n'
            f'   • Total en base de datos: {WorkoutPlanTemplate.objects.count()}'
        ))
    
    def get_goal_name(self, goal):
        mapping = {
            'lose_weight': 'Pérdida de peso',
            'gain_muscle': 'Ganar músculo',
            'body_recomposition': 'Recomposición'
        }
        return mapping.get(goal, goal)
    
    def get_activity_name(self, activity):
        mapping = {
            'sedentary': 'Sedentario',
            'light': 'Ligero',
            'moderate': 'Moderado',
            'active': 'Activo',
            'very_active': 'Muy Activo'
        }
        return mapping.get(activity, activity)
    
    def get_difficulty_name(self, difficulty):
        mapping = {
            'beginner': 'Principiante',
            'intermediate': 'Intermedio',
            'advanced': 'Avanzado'
        }
        return mapping.get(difficulty, difficulty)
    
    def pluralize_dias(self, num):
        return 'Días' if num > 1 else 'Día'
    
    def map_goal_to_template(self, goal):
        # Mapear objetivo del formulario al objetivo del template
        if goal == 'lose_weight':
            return 'weight_loss'
        elif goal == 'gain_muscle':
            return 'muscle_gain'
        elif goal == 'body_recomposition':
            return 'general_fitness'
        return 'general_fitness'
    
    def get_duration(self, activity, goal):
        # Duración en semanas según nivel y objetivo
        base_duration = {
            'sedentary': 8,
            'light': 8,
            'moderate': 12,
            'active': 12,
            'very_active': 16
        }.get(activity, 12)
        
        # Ajustar según objetivo
        if goal == 'lose_weight':
            return base_duration + 4
        elif goal == 'gain_muscle':
            return base_duration + 2
        
        return base_duration
    
    def create_tags(self, days, location, goal, activity, difficulty):
        return [
            f"{days}_dias",
            location,
            goal,
            activity,
            difficulty,
            f"personalized_{goal}_{location}"
        ]
    
    def create_workout_days(self, plan, days_per_week, location, goal, difficulty):
        """Crea los días de entrenamiento para un plan"""
        all_exercises = list(Exercise.objects.all())
        
        for day_num in range(1, days_per_week + 1):
            # Determinar el enfoque del día según el número
            day_focus = self.get_day_focus(day_num, days_per_week, goal)
            
            # Crear el día
            workout_day = WorkoutPlanDay.objects.create(
                plan=plan,
                day_name=f"Día {day_num} - {day_focus}",
                day_number=day_num,
                is_rest_day=False,
                notes=f"Enfoque: {day_focus}"
            )
            
            # Seleccionar ejercicios apropiados
            exercises_for_day = self.select_exercises_for_day(
                all_exercises, day_focus, location, goal, difficulty, day_num, days_per_week
            )
            
            # Agregar ejercicios al día
            for order_index, (exercise, sets, reps, rest) in enumerate(exercises_for_day, start=1):
                WorkoutPlanExercise.objects.create(
                    workout_day=workout_day,
                    exercise=exercise,
                    sets=sets,
                    reps=reps,
                    rest_time=rest,
                    notes=f"{reps} repeticiones por serie"
                )
    
    def get_day_focus(self, day_num, days_per_week, goal):
        """Determina el enfoque del día según el número de días"""
        focuses = []
        
        if days_per_week == 1:
            focuses = ['Cuerpo completo']
        elif days_per_week == 2:
            focuses = ['Tren superior', 'Tren inferior']
        elif days_per_week == 3:
            if goal == 'gain_muscle':
                focuses = ['Push', 'Pull', 'Piernas']
            else:
                focuses = ['Tren superior', 'Tren inferior', 'Cardio/Core']
        elif days_per_week == 4:
            focuses = ['Push', 'Pull', 'Piernas', 'Cardio/Core']
        elif days_per_week == 5:
            focuses = ['Push', 'Pull', 'Piernas', 'Tren superior', 'Tren inferior']
        elif days_per_week >= 6:
            focuses = ['Push', 'Pull', 'Piernas', 'Cardio', 'Full Body', 'HIIT']
        
        return focuses[(day_num - 1) % len(focuses)] if focuses else 'Entrenamiento'
    
    def select_exercises_for_day(self, all_exercises, day_focus, location, goal, difficulty, day_num, days_per_week):
        """Selecciona ejercicios apropiados para un día"""
        # Filtrar ejercicios por ubicación
        if location == 'home':
            available_exercises = [e for e in all_exercises if any(
                tag in ['casa', 'bodyweight', 'sin-equipo'] for tag in (getattr(e, 'tags', []) or [])
            )]
        else:
            available_exercises = all_exercises
        
        # Si no hay suficientes ejercicios, usar todos
        if len(available_exercises) < 5:
            available_exercises = all_exercises
        
        # Determinar número de ejercicios según el día
        num_exercises = self.get_num_exercises(days_per_week, difficulty)
        
        # Seleccionar ejercicios aleatorios
        selected = random.sample(available_exercises, min(num_exercises, len(available_exercises)))
        
        # Crear estructura de ejercicios
        exercises_data = []
        for exercise in selected:
            sets = 3 if difficulty == 'beginner' else (4 if difficulty == 'intermediate' else 5)
            reps = self.get_reps_for_goal(goal, difficulty)
            rest = 60 if difficulty == 'beginner' else (90 if difficulty == 'intermediate' else 120)
            
            exercises_data.append((exercise, sets, reps, rest))
        
        return exercises_data
    
    def get_num_exercises(self, days_per_week, difficulty):
        """Determina cuántos ejercicios incluir según días y dificultad"""
        base = {
            1: 8, 2: 6, 3: 5, 4: 4, 5: 4, 6: 3, 7: 3
        }.get(days_per_week, 5)
        
        # Ajustar por dificultad
        if difficulty == 'beginner':
            return base
        elif difficulty == 'intermediate':
            return base + 1
        else:
            return base + 2
    
    def get_reps_for_goal(self, goal, difficulty):
        """Determina las repeticiones según objetivo"""
        if goal == 'lose_weight':
            # Más repeticiones para pérdida de peso
            return '15-20' if difficulty == 'beginner' else ('12-15' if difficulty == 'intermediate' else '10-12')
        elif goal == 'gain_muscle':
            # Menos repeticiones para ganancia muscular
            return '8-12' if difficulty == 'beginner' else ('6-10' if difficulty == 'intermediate' else '4-8')
        else:
            # Recomposición: intermedio
            return '10-15' if difficulty == 'beginner' else ('8-12' if difficulty == 'intermediate' else '6-10')



