# workouts/management/commands/populate_workout_days.py
"""
Comando para poblar los planes de entrenamiento del sistema con días y ejercicios.
"""
from django.core.management.base import BaseCommand
from workouts.models import WorkoutProgram, WorkoutDay, WorkoutDayExercise, Exercise
import random


class Command(BaseCommand):
    help = 'Poblar planes del sistema con días de entrenamiento y ejercicios'

    def handle(self, *args, **options):
        self.stdout.write('=== Poblando planes del sistema con días y ejercicios ===\n')
        
        # Obtener ejercicios disponibles por grupo muscular
        exercises = Exercise.objects.filter(is_active=True)
        exercises_by_group = {}
        
        for ex in exercises:
            groups = ex.muscle_groups or []
            for group in groups:
                if group not in exercises_by_group:
                    exercises_by_group[group] = []
                exercises_by_group[group].append(ex)
        
        self.stdout.write(f'Ejercicios disponibles: {exercises.count()}')
        self.stdout.write(f'Grupos musculares: {list(exercises_by_group.keys())}\n')
        
        # Configuración de días para diferentes tipos de planes
        plan_configs = {
            'Full Body': [
                {'name': 'Día 1 - Full Body A', 'day_number': 1, 'groups': ['chest', 'back', 'legs', 'shoulders']},
                {'name': 'Día 2 - Full Body B', 'day_number': 2, 'groups': ['chest', 'back', 'legs', 'arms']},
                {'name': 'Día 3 - Full Body C', 'day_number': 3, 'groups': ['legs', 'shoulders', 'core', 'arms']},
            ],
            'Push/Pull': [
                {'name': 'Día 1 - Push', 'day_number': 1, 'groups': ['chest', 'shoulders', 'triceps']},
                {'name': 'Día 2 - Pull', 'day_number': 2, 'groups': ['back', 'biceps', 'forearms']},
                {'name': 'Día 3 - Piernas', 'day_number': 3, 'groups': ['legs', 'glutes', 'calves']},
                {'name': 'Día 4 - Push', 'day_number': 4, 'groups': ['chest', 'shoulders', 'triceps']},
                {'name': 'Día 5 - Pull', 'day_number': 5, 'groups': ['back', 'biceps', 'forearms']},
            ],
            'Upper/Lower': [
                {'name': 'Día 1 - Upper', 'day_number': 1, 'groups': ['chest', 'back', 'shoulders', 'arms']},
                {'name': 'Día 2 - Lower', 'day_number': 2, 'groups': ['legs', 'glutes', 'calves', 'core']},
                {'name': 'Día 3 - Upper', 'day_number': 3, 'groups': ['chest', 'back', 'shoulders', 'arms']},
                {'name': 'Día 4 - Lower', 'day_number': 4, 'groups': ['legs', 'glutes', 'calves', 'core']},
            ],
            'Fuerza': [
                {'name': 'Día 1 - Pecho y Tríceps', 'day_number': 1, 'groups': ['chest', 'triceps']},
                {'name': 'Día 2 - Espalda y Bíceps', 'day_number': 2, 'groups': ['back', 'biceps']},
                {'name': 'Día 3 - Piernas', 'day_number': 3, 'groups': ['legs', 'glutes', 'calves']},
                {'name': 'Día 4 - Hombros y Core', 'day_number': 4, 'groups': ['shoulders', 'core']},
            ],
            'Definición': [
                {'name': 'Día 1 - Circuito Full Body', 'day_number': 1, 'groups': ['chest', 'back', 'legs']},
                {'name': 'Día 2 - HIIT + Core', 'day_number': 2, 'groups': ['core', 'legs', 'cardio']},
                {'name': 'Día 3 - Upper Body', 'day_number': 3, 'groups': ['chest', 'back', 'shoulders', 'arms']},
                {'name': 'Día 4 - Lower Body', 'day_number': 4, 'groups': ['legs', 'glutes', 'calves']},
                {'name': 'Día 5 - Full Body Intenso', 'day_number': 5, 'groups': ['chest', 'back', 'legs', 'shoulders']},
            ],
            'Glúteos': [
                {'name': 'Día 1 - Glúteos + Piernas', 'day_number': 1, 'groups': ['glutes', 'legs']},
                {'name': 'Día 2 - Upper Body', 'day_number': 2, 'groups': ['back', 'shoulders', 'arms']},
                {'name': 'Día 3 - Glúteos Intensivo', 'day_number': 3, 'groups': ['glutes', 'legs', 'core']},
                {'name': 'Día 4 - Full Body', 'day_number': 4, 'groups': ['chest', 'back', 'glutes', 'legs']},
            ],
        }
        
        # Mapeo de nombres alternativos de grupos musculares
        group_aliases = {
            'triceps': ['arms', 'upper_arms'],
            'biceps': ['arms', 'upper_arms'],
            'arms': ['upper_arms', 'triceps', 'biceps'],
            'calves': ['legs', 'lower_legs'],
            'core': ['abs', 'abdominals'],
            'glutes': ['legs', 'hips'],
            'cardio': ['legs', 'core'],
            'forearms': ['arms'],
        }
        
        def get_exercises_for_group(group, count=4):
            """Obtener ejercicios para un grupo muscular, con fallbacks"""
            available = exercises_by_group.get(group, [])
            
            # Si no hay suficientes, buscar en aliases
            if len(available) < count:
                for alias in group_aliases.get(group, []):
                    available.extend(exercises_by_group.get(alias, []))
            
            # Eliminar duplicados
            available = list(set(available))
            
            # Si aún no hay suficientes, usar ejercicios aleatorios
            if len(available) < count:
                all_exercises = list(exercises)
                random.shuffle(all_exercises)
                available.extend(all_exercises[:count - len(available)])
            
            return available[:count]
        
        # Procesar cada plan del sistema
        system_programs = WorkoutProgram.objects.filter(is_system=True, is_active=True)
        
        for program in system_programs:
            # Determinar qué configuración usar basándose en el nombre del plan
            config_key = None
            program_name_lower = program.name.lower()
            
            if 'full body' in program_name_lower or 'principiante' in program_name_lower:
                config_key = 'Full Body'
            elif 'push' in program_name_lower or 'pull' in program_name_lower:
                config_key = 'Push/Pull'
            elif 'upper' in program_name_lower or 'lower' in program_name_lower:
                config_key = 'Upper/Lower'
            elif 'fuerza' in program_name_lower:
                config_key = 'Fuerza'
            elif 'definición' in program_name_lower or 'perdida' in program_name_lower or 'grasa' in program_name_lower:
                config_key = 'Definición'
            elif 'glúteo' in program_name_lower:
                config_key = 'Glúteos'
            else:
                config_key = 'Full Body'  # Default
            
            days_config = plan_configs.get(config_key, plan_configs['Full Body'])
            
            # Verificar si el plan ya tiene días
            existing_days = WorkoutDay.objects.filter(program=program).count()
            if existing_days > 0:
                self.stdout.write(f'⏭️  {program.name}: Ya tiene {existing_days} días, saltando...')
                continue
            
            self.stdout.write(f'\n📋 {program.name} (config: {config_key})')
            
            # Crear días para este plan
            for day_config in days_config:
                workout_day = WorkoutDay.objects.create(
                    program=program,
                    name=day_config['name'],
                    day_number=day_config['day_number'],
                    is_rest_day=False,
                    notes=f"Entrenamiento enfocado en: {', '.join(day_config['groups'])}"
                )
                
                self.stdout.write(f'  ✅ Creado día: {workout_day.name}')
                
                # Agregar ejercicios para cada grupo muscular (evitando duplicados)
                order = 1
                used_exercises_in_day = set()  # Rastrear ejercicios ya usados en este día
                
                for group in day_config['groups']:
                    group_exercises = get_exercises_for_group(group, count=2)
                    
                    # Filtrar ejercicios ya usados en este día
                    available_exercises = [ex for ex in group_exercises if ex.id not in used_exercises_in_day]
                    
                    # Si no hay suficientes, buscar más ejercicios del grupo
                    if len(available_exercises) < 2:
                        additional = get_exercises_for_group(group, count=4)
                        available_exercises.extend([ex for ex in additional if ex.id not in used_exercises_in_day])
                        # Eliminar duplicados manteniendo orden
                        seen = set()
                        available_exercises = [ex for ex in available_exercises if ex.id not in seen and not seen.add(ex.id)]
                    
                    # Tomar máximo 2 ejercicios por grupo
                    for exercise in available_exercises[:2]:
                        if exercise.id in used_exercises_in_day:
                            continue
                        
                        # Determinar sets y reps según el tipo de plan
                        if 'fuerza' in program_name_lower:
                            sets, reps = 4, '6-8'
                        elif 'definición' in program_name_lower:
                            sets, reps = 3, '12-15'
                        else:
                            sets, reps = 3, '10-12'
                        
                        WorkoutDayExercise.objects.create(
                            workout_day=workout_day,
                            exercise=exercise,
                            sets=sets,
                            reps=reps,
                            rest_seconds=60 if 'definición' in program_name_lower else 90,
                            order_index=order,
                            notes=f"Enfocado en {group}"
                        )
                        order += 1
                        used_exercises_in_day.add(exercise.id)  # Marcar como usado
                
                exercises_count = WorkoutDayExercise.objects.filter(workout_day=workout_day).count()
                self.stdout.write(f'      → {exercises_count} ejercicios agregados')
        
        self.stdout.write(self.style.SUCCESS('\n✅ Planes del sistema poblados correctamente'))
        
        # Resumen final
        self.stdout.write('\n=== Resumen ===')
        for program in system_programs:
            days = WorkoutDay.objects.filter(program=program)
            total_exercises = sum(
                WorkoutDayExercise.objects.filter(workout_day=d).count() 
                for d in days
            )
            self.stdout.write(f'{program.name}: {days.count()} días, {total_exercises} ejercicios')






