"""
Comando para crear programas de entrenamiento por defecto basados en los planes nutricionales
Crea programas con diferentes números de días según los planes nutricionales existentes
"""
from django.core.management.base import BaseCommand
from workouts.models import DefaultWorkoutProgram, DefaultWorkoutDay, DefaultExercise, Exercise
from nutrition.models import DefaultNutritionPlan
import random

class Command(BaseCommand):
    help = 'Crea programas de entrenamiento por defecto basados en planes nutricionales'

    def handle(self, *args, **options):
        self.stdout.write('=' * 80)
        self.stdout.write('CREANDO PROGRAMAS DE ENTRENAMIENTO POR DEFECTO')
        self.stdout.write('=' * 80)
        
        # Obtener todos los ejercicios disponibles
        all_exercises = list(Exercise.objects.all())
        if not all_exercises:
            self.stdout.write(self.style.ERROR('❌ No hay ejercicios disponibles'))
            return
        
        self.stdout.write(f'\n📚 Ejercicios disponibles: {len(all_exercises)}')
        
        # Obtener planes nutricionales únicos por días de entrenamiento
        nutrition_plans = DefaultNutritionPlan.objects.all()
        
        # Extraer combinaciones únicas de días de entrenamiento
        unique_combinations = set()
        for plan in nutrition_plans:
            # Extraer días de entrenamiento del nombre del plan
            if 'Día' in plan.name or 'día' in plan.name:
                # Buscar patrón "X Día" o "X días"
                import re
                match = re.search(r'(\d+)\s*(?:Día|día)', plan.name)
                if match:
                    days = int(match.group(1))
                    # Extraer objetivo y nivel de actividad
                    goal = 'general'
                    if 'Pérdida' in plan.name or 'pérdida' in plan.name:
                        goal = 'weight_loss'
                    elif 'Ganancia' in plan.name or 'ganancia' in plan.name:
                        goal = 'muscle_gain'
                    elif 'Recomposición' in plan.name or 'recomposición' in plan.name:
                        goal = 'body_recomposition'
                    
                    activity = 'moderate'
                    if 'Sedentario' in plan.name:
                        activity = 'sedentary'
                    elif 'Ligero' in plan.name:
                        activity = 'light'
                    elif 'Activo' in plan.name:
                        activity = 'active'
                    elif 'Muy Activo' in plan.name:
                        activity = 'very_active'
                    
                    unique_combinations.add((days, goal, activity))
        
        self.stdout.write(f'\n📋 Combinaciones únicas encontradas: {len(unique_combinations)}')
        
        created_programs = 0
        created_days = 0
        created_exercises = 0
        
        # Organizar ejercicios por grupos musculares
        exercises_by_muscle = self._organize_exercises_by_muscle(all_exercises)
        
        for days, goal, activity in unique_combinations:
            # Determinar dificultad según días y actividad
            if days <= 2:
                difficulty = 'beginner'
                duration_weeks = 4
            elif days <= 4:
                difficulty = 'intermediate'
                duration_weeks = 6
            else:
                difficulty = 'advanced'
                duration_weeks = 8
            
            # Crear nombre del programa
            goal_name = {
                'weight_loss': 'Pérdida de Peso',
                'muscle_gain': 'Ganancia Muscular',
                'body_recomposition': 'Recomposición',
                'general': 'Fitness General'
            }.get(goal, 'Fitness General')
            
            activity_name = {
                'sedentary': 'Principiante',
                'light': 'Ligero',
                'moderate': 'Moderado',
                'active': 'Activo',
                'very_active': 'Muy Activo'
            }.get(activity, 'Moderado')
            
            program_name = f"Programa {goal_name} - {activity_name} - {days} Días"
            
            # Verificar si ya existe
            if DefaultWorkoutProgram.objects.filter(name=program_name).exists():
                self.stdout.write(f'   ⏭️  {program_name} ya existe, omitiendo...')
                continue
            
            # Crear el programa
            program = DefaultWorkoutProgram.objects.create(
                name=program_name,
                description=f"Programa de entrenamiento de {days} días por semana para {goal_name.lower()} con nivel de actividad {activity_name.lower()}. Duración: {duration_weeks} semanas.",
                difficulty=difficulty,
                duration_weeks=duration_weeks,
                is_active=True,
                is_default=False,
                min_role_required='basic',
                tags=[goal, activity, f"{days}_dias"],
                estimated_duration_minutes=45 if difficulty == 'beginner' else (60 if difficulty == 'intermediate' else 75)
            )
            created_programs += 1
            self.stdout.write(f'\n✅ Creado: {program.name}')
            
            # Crear días de entrenamiento
            day_names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
            day_number = 1
            
            for week in range(1, duration_weeks + 1):
                for day_idx in range(days):
                    day_name = f"{day_names[day_idx]} - Semana {week}"
                    
                    workout_day = DefaultWorkoutDay.objects.create(
                        program=program,
                        day_name=day_name,
                        day_number=day_number,
                        is_rest_day=False,
                        notes=f"Día {day_idx + 1} de la semana {week} - {goal_name}"
                    )
                    created_days += 1
                    
                    # Seleccionar ejercicios para el día
                    exercises_for_day = self._select_exercises_for_day(
                        day_idx, difficulty, exercises_by_muscle, all_exercises, goal
                    )
                    
                    # Crear ejercicios para el día
                    for order, exercise in enumerate(exercises_for_day, 1):
                        sets, reps, rest_time = self._get_sets_reps_rest(difficulty, goal)
                        
                        DefaultExercise.objects.create(
                            workout_day=workout_day,
                            exercise=exercise,
                            sets=sets,
                            reps=reps,
                            weight=None,
                            duration=None,
                            rest_time=rest_time,
                            order_index=order
                        )
                        created_exercises += 1
                    
                    day_number += 1
            
            self.stdout.write(f'   ✅ {days * duration_weeks} días creados con ejercicios')
        
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS(
            f'✅ PROCESO COMPLETADO:\n'
            f'   • Programas creados: {created_programs}\n'
            f'   • Días creados: {created_days}\n'
            f'   • Ejercicios asignados: {created_exercises}'
        ))
        self.stdout.write('=' * 80)
    
    def _organize_exercises_by_muscle(self, exercises):
        """Organiza ejercicios por grupos musculares"""
        organized = {}
        for exercise in exercises:
            for muscle in exercise.muscle_groups or []:
                if muscle not in organized:
                    organized[muscle] = []
                organized[muscle].append(exercise)
        return organized
    
    def _select_exercises_for_day(self, day_idx, difficulty, exercises_by_muscle, all_exercises, goal):
        """Selecciona ejercicios para un día según el índice del día y objetivo"""
        num_exercises = 4 if difficulty == 'beginner' else (5 if difficulty == 'intermediate' else 6)
        
        # Rotar grupos musculares según el día y objetivo
        if goal == 'weight_loss':
            # Más cardio y full body para pérdida de peso
            muscle_rotations = [
                ['full_body', 'core', 'cardio'],
                ['legs', 'quads', 'glutes', 'calves'],
                ['full_body', 'core'],
                ['chest', 'triceps', 'shoulders'],
                ['lats', 'biceps', 'back'],
            ]
        elif goal == 'muscle_gain':
            # Más fuerza y aislamiento para ganancia muscular
            muscle_rotations = [
                ['chest', 'triceps', 'shoulders'],
                ['legs', 'quads', 'glutes'],
                ['lats', 'biceps', 'back'],
                ['shoulders', 'triceps'],
                ['legs', 'hamstrings'],
            ]
        else:  # body_recomposition o general
            muscle_rotations = [
                ['chest', 'triceps', 'shoulders'],
                ['legs', 'quads', 'glutes', 'calves'],
                ['lats', 'biceps', 'back'],
                ['core', 'abs'],
                ['full_body'],
            ]
        
        target_muscles = muscle_rotations[day_idx % len(muscle_rotations)]
        
        selected = []
        for muscle in target_muscles:
            if muscle in exercises_by_muscle and exercises_by_muscle[muscle]:
                selected.extend(exercises_by_muscle[muscle][:2])
        
        # Si no hay suficientes, agregar ejercicios aleatorios
        while len(selected) < num_exercises:
            exercise = random.choice(all_exercises)
            if exercise not in selected:
                selected.append(exercise)
        
        return selected[:num_exercises]
    
    def _get_sets_reps_rest(self, difficulty, goal):
        """Retorna sets, reps y tiempo de descanso según dificultad y objetivo"""
        if goal == 'weight_loss':
            # Más repeticiones para pérdida de peso
            if difficulty == 'beginner':
                return 3, 12, 45
            elif difficulty == 'intermediate':
                return 4, 15, 60
            else:  # advanced
                return 4, 12, 75
        elif goal == 'muscle_gain':
            # Menos repeticiones, más peso para ganancia muscular
            if difficulty == 'beginner':
                return 3, 8, 90
            elif difficulty == 'intermediate':
                return 4, 6, 120
            else:  # advanced
                return 4, 5, 150
        else:  # body_recomposition o general
            if difficulty == 'beginner':
                return 3, 10, 60
            elif difficulty == 'intermediate':
                return 4, 8, 90
            else:  # advanced
                return 4, 6, 120

