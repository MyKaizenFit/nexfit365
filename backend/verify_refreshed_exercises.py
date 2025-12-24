#!/usr/bin/env python
"""Script para verificar los ejercicios refrescados"""
import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from workouts.models import WorkoutProgram, WorkoutDay, WorkoutDayExercise
from accounts.models import CustomUser

print("=" * 70)
print("📊 VERIFICACIÓN DE EJERCICIOS REFRESCADOS")
print("=" * 70)

users = CustomUser.objects.filter(workout_programs__is_active=True).distinct()

for user in users:
    print(f"\n👤 Usuario: {user.email} ({user.get_full_name() or 'Sin nombre'})")
    
    program = WorkoutProgram.objects.filter(user=user, is_active=True).first()
    if not program:
        print("  ⚠️  No tiene plan activo")
        continue
    
    print(f"  📋 Plan: {program.name}")
    print(f"  📅 Días por semana: {program.days_per_week}")
    print(f"  🎯 Objetivo: {program.goal}")
    
    days = program.days.all().order_by('day_number')
    print(f"\n  📊 Días de entrenamiento ({days.count()}):")
    
    for day in days:
        exercises = WorkoutDayExercise.objects.filter(workout_day=day).order_by('order_index')
        exercise_names = [ex.exercise.name for ex in exercises]
        unique_count = len(set(exercise_names))
        
        print(f"\n    📅 {day.name}")
        print(f"       Focus: {day.focus}")
        print(f"       Ejercicios: {exercises.count()} (únicos: {unique_count})")
        
        # Verificar duplicados
        if len(exercise_names) != unique_count:
            duplicates = [name for name in exercise_names if exercise_names.count(name) > 1]
            print(f"       ⚠️  Duplicados: {set(duplicates)}")
        else:
            print(f"       ✅ Sin duplicados")
        
        # Mostrar primeros 3 ejercicios
        print(f"       Ejercicios:")
        for ex in exercises[:3]:
            muscle_groups = ex.exercise.muscle_groups or []
            print(f"         - {ex.exercise.name} ({', '.join(muscle_groups[:2])})")
        if exercises.count() > 3:
            print(f"         ... y {exercises.count() - 3} más")

print("\n" + "=" * 70)
print("✅ Verificación completada")
print("=" * 70)



