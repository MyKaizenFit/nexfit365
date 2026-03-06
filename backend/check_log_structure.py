#!/usr/bin/env python
import os
import sys
import django
import json

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from workouts.models import WorkoutLog
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(email='usuario@test.com')

# Obtener un log reciente
log = WorkoutLog.objects.filter(user=user).order_by('-date').first()

if log:
    print(f'\n📋 Log de entrenamiento: {log.date}')
    print(f'   Completado: {log.completed}')
    print(f'   Duración: {log.duration_minutes} min')
    
    print(f'\n📦 exercises_data (campo JSON):')
    print(f'   Tipo: {type(log.exercises_data)}')
    print(f'   Contenido: {json.dumps(log.exercises_data, indent=2) if log.exercises_data else "VACÍO"}')
    
    print(f'\n💪 log_exercises (relación):')
    print(f'   Total: {log.log_exercises.count()}')
    
    for log_ex in log.log_exercises.all()[:2]:  # Primeros 2
        print(f'\n   Ejercicio: {log_ex.exercise_name}')
        print(f'   Sets: {log_ex.sets.count()}')
        
        for s in log_ex.sets.all()[:3]:  # Primeros 3 sets
            if s.weight and s.reps:
                print(f'      Set {s.set_number}: {s.reps} reps @ {s.weight}kg = {float(s.weight) * s.reps:.1f}kg tonelaje')
            elif s.duration_seconds:
                print(f'      Set {s.set_number}: {s.duration_seconds}s duración')
    
    print(f'\n🔍 Estructura que debería usar el frontend:')
    print(f'   log.log_exercises[].sets[].weight')
    print(f'   log.log_exercises[].sets[].reps')
else:
    print('No hay logs para el usuario')
