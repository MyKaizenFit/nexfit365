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


users = CustomUser.objects.filter(workout_programs__is_active=True).distinct()

for user in users:
    
    program = WorkoutProgram.objects.filter(user=user, is_active=True).first()
    if not program:
        continue
    
    
    days = program.days.all().order_by('day_number')
    
    for day in days:
        exercises = WorkoutDayExercise.objects.filter(workout_day=day).order_by('order_index')
        exercise_names = [ex.exercise.name for ex in exercises]
        unique_count = len(set(exercise_names))
        
        
        # Verificar duplicados
        if len(exercise_names) != unique_count:
            duplicates = [name for name in exercise_names if exercise_names.count(name) > 1]
        else:
        
        # Mostrar primeros 3 ejercicios
        for ex in exercises[:3]:
            muscle_groups = ex.exercise.muscle_groups or []
        if exercises.count() > 3:






