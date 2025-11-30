"""
Comando para completar los programas de entrenamiento por defecto
con días y ejercicios según el número de días de entrenamiento
"""
from django.core.management.base import BaseCommand
from workouts.models import DefaultWorkoutProgram, DefaultWorkoutDay, DefaultExercise, Exercise
from django.utils import timezone
import random

class Command(BaseCommand):
    help = 'Completa los programas de entrenamiento por defecto con días y ejercicios'

    def handle(self, *args, **options):
        self.stdout.write('=' * 80)
        self.stdout.write('COMPLETANDO PROGRAMAS DE ENTRENAMIENTO POR DEFECTO')
        self.stdout.write('=' * 80)
        
        # Obtener todos los ejercicios disponibles
        all_exercises = list(Exercise.objects.all())
        if not all_exercises:
            self.stdout.write(self.style.ERROR('❌ No hay ejercicios disponibles. Ejecuta primero populate_workouts'))
            return
        
        self.stdout.write(f'\n📚 Ejercicios disponibles: {len(all_exercises)}')
        
        # Obtener todos los programas por defecto
        programs = DefaultWorkoutProgram.objects.all()
        self.stdout.write(f'\n🏋️ Programas por defecto encontrados: {programs.count()}')
        
        created_days = 0
        created_exercises = 0
        
        for program in programs:
            self.stdout.write(f'\n📋 Procesando: {program.name}')
            
            # Verificar si ya tiene días
            existing_days = program.days.count()
            if existing_days > 0:
                self.stdout.write(f'   ⏭️  Ya tiene {existing_days} días, omitiendo...')
                continue
            
            # Determinar número de días según el programa
            # Calcular días por semana basado en la dificultad y duración
            difficulty = program.difficulty or 'beginner'
            duration_weeks = program.duration_weeks or 4
            
            # Días por semana según dificultad
            if difficulty == 'beginner':
                days_per_week = 3
            elif difficulty == 'intermediate':
                days_per_week = 4
            else:  # advanced
                days_per_week = 5
            
            self.stdout.write(f'   📅 Creando {days_per_week} días/semana por {duration_weeks} semanas...')
            
            # Crear días de entrenamiento
            day_names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
            day_number = 1
            total_days = days_per_week * duration_weeks
            
            # Distribuir ejercicios por grupos musculares
            exercises_by_muscle = self._organize_exercises_by_muscle(all_exercises)
            
            for week in range(1, duration_weeks + 1):
                for day_idx in range(days_per_week):
                    day_name = f"{day_names[day_idx]} - Semana {week}"
                    
                    workout_day = DefaultWorkoutDay.objects.create(
                        program=program,
                        day_name=day_name,
                        day_number=day_number,
                        is_rest_day=False,
                        notes=f"Día {day_idx + 1} de la semana {week}"
                    )
                    created_days += 1
                    
                    # Seleccionar ejercicios según el día y dificultad
                    exercises_for_day = self._select_exercises_for_day(
                        day_idx, difficulty, exercises_by_muscle, all_exercises
                    )
                    
                    # Crear ejercicios para el día
                    for order, exercise in enumerate(exercises_for_day, 1):
                        sets, reps, rest_time = self._get_sets_reps_rest(difficulty)
                        
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
            
            self.stdout.write(self.style.SUCCESS(f'   ✅ Creados {days_per_week * duration_weeks} días con ejercicios'))
        
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS(
            f'✅ PROCESO COMPLETADO:\n'
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
    
    def _select_exercises_for_day(self, day_idx, difficulty, exercises_by_muscle, all_exercises):
        """Selecciona ejercicios para un día según el índice del día"""
        num_exercises = 4 if difficulty == 'beginner' else (5 if difficulty == 'intermediate' else 6)
        
        # Rotar grupos musculares según el día
        muscle_rotations = [
            ['chest', 'triceps', 'shoulders'],  # Día 0: Push
            ['legs', 'quads', 'glutes', 'calves'],  # Día 1: Legs
            ['lats', 'biceps', 'back'],  # Día 2: Pull
            ['core', 'abs'],  # Día 3: Core
            ['full_body'],  # Día 4: Full body
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
    
    def _get_sets_reps_rest(self, difficulty):
        """Retorna sets, reps y tiempo de descanso según dificultad"""
        if difficulty == 'beginner':
            return 3, 10, 60
        elif difficulty == 'intermediate':
            return 4, 8, 90
        else:  # advanced
            return 4, 6, 120

