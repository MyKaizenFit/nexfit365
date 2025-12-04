#!/usr/bin/env python
"""
Script para agregar ejercicios reales a los programas outdoor
"""
import os
import sys
import django

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from workouts.models import WorkoutProgram, WorkoutDay, WorkoutDayExercise, Exercise

def get_or_create_exercise(name, **defaults):
    """Obtener o crear un ejercicio"""
    exercise, created = Exercise.objects.get_or_create(
        name=name,
        defaults=defaults
    )
    if created:
        print(f"  ✅ Ejercicio creado: {name}")
    return exercise

def create_outdoor_exercises():
    """Crear ejercicios específicos para outdoor si no existen"""
    print("🏃 Creando ejercicios para outdoor...\n")
    
    exercises_data = [
        ('Running - Trote Continuo', 'Correr a ritmo constante y cómodo', 'cardio', 'beginner', ['cardiovascular', 'legs'], [], ['outdoor', 'cardio']),
        ('Sprints Intervalados', 'Sprints de alta intensidad con recuperación', 'cardio', 'intermediate', ['cardiovascular', 'legs'], [], ['outdoor', 'hiit']),
        ('Caminata Rápida', 'Caminar a paso rápido', 'cardio', 'beginner', ['cardiovascular'], [], ['outdoor', 'walking']),
        ('Flexiones (Push-ups)', 'Flexiones de brazos', 'strength', 'beginner', ['chest', 'triceps', 'core'], [], ['bodyweight', 'push']),
        ('Dominadas (Pull-ups)', 'Dominadas en barra', 'strength', 'intermediate', ['back', 'biceps'], ['pull_up_bar'], ['bodyweight', 'pull']),
        ('Fondos en Paralelas', 'Fondos en barras paralelas', 'strength', 'intermediate', ['chest', 'triceps'], ['parallel_bars'], ['bodyweight', 'push']),
        ('Sentadillas (Squats)', 'Sentadillas con peso corporal', 'strength', 'beginner', ['quadriceps', 'glutes'], [], ['bodyweight', 'legs']),
        ('Zancadas (Lunges)', 'Zancadas alternando piernas', 'strength', 'beginner', ['quadriceps', 'glutes'], [], ['bodyweight', 'legs']),
        ('Burpees', 'Ejercicio completo: flexión + salto', 'cardio', 'intermediate', ['full_body'], [], ['bodyweight', 'hiit']),
        ('Mountain Climbers', 'Escaladores en plancha', 'cardio', 'beginner', ['core', 'cardiovascular'], [], ['bodyweight', 'core']),
        ('Plancha (Plank)', 'Plancha isométrica', 'core', 'beginner', ['core'], [], ['bodyweight', 'isometric']),
        ('Jumping Jacks', 'Saltos abriendo piernas y brazos', 'cardio', 'beginner', ['cardiovascular'], [], ['bodyweight', 'warmup']),
        ('Pistol Squats', 'Sentadilla a una pierna', 'strength', 'advanced', ['quadriceps', 'glutes', 'core'], [], ['bodyweight', 'advanced']),
        ('Bear Crawl', 'Gateo del oso', 'strength', 'intermediate', ['core', 'shoulders'], [], ['bodyweight', 'functional']),
        ('Fondos en Suelo', 'Fondos para tríceps', 'strength', 'beginner', ['triceps'], [], ['bodyweight', 'push']),
    ]
    
    created_exercises = {}
    for name, desc, cat, diff, muscles, equip, tags in exercises_data:
        exercise = get_or_create_exercise(
            name,
            description=desc,
            instructions=desc,
            category=cat,
            difficulty=diff,
            muscle_groups=muscles,
            equipment=equip,
            tags=tags,
            video_url='',
            image_url='',
            google_drive_file_id='',
            is_system=True,
            is_active=True
        )
        created_exercises[name] = exercise
    
    print(f"\n✅ {len(created_exercises)} ejercicios outdoor disponibles\n")
    return created_exercises

def create_workout_day(program, name, day_num, focus, notes, duration, exercises_list, exercises_dict):
    """Crear un día de entrenamiento con sus ejercicios"""
    workout_day = WorkoutDay.objects.create(
        program=program,
        name=name,
        day_number=day_num,
        day_of_week='',
        is_rest_day=False,
        focus=focus,
        notes=notes,
        order_index=day_num,
        duration_minutes=duration
    )
    
    # Agregar ejercicios
    for idx, (ex_name, sets, reps, duration_sec, notes_ex) in enumerate(exercises_list, 1):
        exercise = exercises_dict.get(ex_name)
        if exercise:
            WorkoutDayExercise.objects.create(
                workout_day=workout_day,
                exercise=exercise,
                order_index=idx,
                sets=sets or 3,
                reps=str(reps) if reps else '',
                weight='',
                duration_seconds=duration_sec,
                rest_seconds=60,
                notes=notes_ex or ''
            )
    
    return workout_day

def add_workout_days_to_program(program, exercises_dict):
    """Agregar días de entrenamiento a un programa"""
    print(f"📅 Creando días para: {program.name}")
    
    # Eliminar días existentes
    WorkoutDay.objects.filter(program=program).delete()
    
    if 'Pérdida de Peso' in program.name:
        days = [
            ('Día 1 - Cardio + Core', 1, 'Cardio', 'Cardio moderado con core', 45, [
                ('Caminata Rápida', 1, None, 1800, '30 min'),
                ('Mountain Climbers', 3, 20, None, ''),
                ('Plancha (Plank)', 3, None, 60, '60 seg'),
                ('Jumping Jacks', 3, 30, None, ''),
            ]),
            ('Día 2 - Fuerza Superior', 2, 'Upper Body', 'Fuerza tren superior', 40, [
                ('Flexiones (Push-ups)', 4, 15, None, ''),
                ('Fondos en Suelo', 3, 12, None, ''),
                ('Mountain Climbers', 3, 20, None, ''),
            ]),
            ('Día 3 - HIIT', 3, 'HIIT', 'Alta intensidad', 30, [
                ('Burpees', 5, 10, None, ''),
                ('Sprints Intervalados', 8, None, 30, '30s sprint'),
                ('Jumping Jacks', 3, 30, None, ''),
            ]),
            ('Día 4 - Piernas + Cardio', 4, 'Lower Body', 'Piernas y cardio', 45, [
                ('Sentadillas (Squats)', 4, 20, None, ''),
                ('Zancadas (Lunges)', 3, 15, None, 'por pierna'),
                ('Running - Trote Continuo', 1, None, 1200, '20 min'),
            ]),
        ]
    elif 'Calistenia Muscular' in program.name:
        days = [
            ('Día 1 - Empuje', 1, 'Push', 'Pecho, hombros, tríceps', 50, [
                ('Flexiones (Push-ups)', 5, 15, None, ''),
                ('Fondos en Paralelas', 4, 12, None, ''),
                ('Plancha (Plank)', 3, None, 60, ''),
            ]),
            ('Día 2 - Tracción', 2, 'Pull', 'Espalda y bíceps', 45, [
                ('Dominadas (Pull-ups)', 5, 8, None, ''),
                ('Flexiones (Push-ups)', 3, 12, None, ''),
            ]),
            ('Día 3 - Piernas', 3, 'Legs', 'Piernas intensas', 50, [
                ('Sentadillas (Squats)', 5, 25, None, ''),
                ('Zancadas (Lunges)', 4, 15, None, ''),
                ('Pistol Squats', 3, 5, None, 'asistidas'),
            ]),
            ('Día 4 - Full Body', 4, 'Full Body', 'Cuerpo completo', 45, [
                ('Burpees', 4, 12, None, ''),
                ('Dominadas (Pull-ups)', 3, 8, None, ''),
                ('Flexiones (Push-ups)', 3, 15, None, ''),
                ('Bear Crawl', 3, None, 30, '30 seg'),
            ]),
        ]
    elif 'Recomposición Activa' in program.name:
        days = [
            ('Día 1 - HIIT', 1, 'HIIT', 'Alta intensidad', 35, [
                ('Burpees', 4, 15, None, ''),
                ('Mountain Climbers', 4, 30, None, ''),
                ('Sprints Intervalados', 6, None, 30, ''),
            ]),
            ('Día 2 - Superior', 2, 'Upper', 'Tren superior', 45, [
                ('Flexiones (Push-ups)', 4, 15, None, ''),
                ('Dominadas (Pull-ups)', 4, 8, None, ''),
                ('Fondos en Paralelas', 3, 12, None, ''),
            ]),
            ('Día 3 - Inferior', 3, 'Lower', 'Tren inferior', 45, [
                ('Sentadillas (Squats)', 5, 20, None, ''),
                ('Zancadas (Lunges)', 4, 15, None, ''),
                ('Pistol Squats', 3, 5, None, ''),
            ]),
            ('Día 4 - Circuito', 4, 'Circuit', 'Full body', 40, [
                ('Burpees', 3, 12, None, ''),
                ('Flexiones (Push-ups)', 3, 15, None, ''),
                ('Sentadillas (Squats)', 3, 20, None, ''),
                ('Mountain Climbers', 3, 30, None, ''),
            ]),
        ]
    else:  # Mantenimiento
        days = [
            ('Día 1 - Caminata', 1, 'Cardio Suave', 'Caminata y movilidad', 35, [
                ('Caminata Rápida', 1, None, 1800, '30 min'),
                ('Sentadillas (Squats)', 3, 15, None, ''),
            ]),
            ('Día 2 - Trote', 2, 'Cardio', 'Trote suave', 30, [
                ('Running - Trote Continuo', 1, None, 1200, '20 min'),
                ('Plancha (Plank)', 3, None, 30, ''),
            ]),
            ('Día 3 - Fuerza', 3, 'Strength', 'Fuerza básica', 35, [
                ('Flexiones (Push-ups)', 3, 10, None, ''),
                ('Sentadillas (Squats)', 3, 15, None, ''),
                ('Zancadas (Lunges)', 3, 12, None, ''),
            ]),
        ]
    
    # Crear días
    for name, day_num, focus, notes, duration, exercises_list in days:
        create_workout_day(program, name, day_num, focus, notes, duration, exercises_list, exercises_dict)
        print(f"  ✅ {name}: {len(exercises_list)} ejercicios")

def main():
    print("=" * 70)
    print("🏃 CREANDO PROGRAMAS OUTDOOR COMPLETOS CON EJERCICIOS")
    print("=" * 70 + "\n")
    
    # 1. Crear/obtener ejercicios outdoor
    exercises = create_outdoor_exercises()
    
    # 2. Obtener programas outdoor
    outdoor_programs = WorkoutProgram.objects.filter(name__icontains='Outdoor')
    
    print(f"📋 Programas outdoor encontrados: {outdoor_programs.count()}\n")
    
    # 3. Agregar días y ejercicios a cada programa
    for program in outdoor_programs:
        add_workout_days_to_program(program, exercises)
        print()
    
    print("=" * 70)
    print("✅ PROCESO COMPLETADO")
    print("=" * 70)
    
    # Mostrar resumen
    for program in outdoor_programs:
        days = WorkoutDay.objects.filter(program=program)
        days_count = days.count()
        total_exercises = sum(WorkoutDayExercise.objects.filter(workout_day=day).count() for day in days)
        print(f"\n📋 {program.name}")
        print(f"   Días: {days_count} | Total ejercicios: {total_exercises}")

if __name__ == '__main__':
    main()
