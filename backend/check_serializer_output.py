#!/usr/bin/env python
import os
import sys
import django
import json

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from workouts.serializers import WorkoutLogSerializer
from workouts.models import WorkoutLog
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(email='member@example.invalid')

# Obtener un log reciente
log = WorkoutLog.objects.filter(user=user).order_by('-date').first()

if log:
    print(f'\n📋 Serializando WorkoutLog: {log.date}')
    
    # Serializar
    serializer = WorkoutLogSerializer(log)
    data = serializer.data
    
    print(f'\n📤 Datos enviados al frontend (JSON):')
    print(f'\n   exercises_data: {data.get("exercises_data")}')
    print(f'\n   log_exercises (primeros 2):')
    
    for i, log_ex in enumerate(data.get('log_exercises', [])[:2]):
        print(f'\n   [{i}] {log_ex.get("exercise_name")}:')
        print(f'       exercise: {log_ex.get("exercise")}')
        print(f'       sets: {len(log_ex.get("sets", []))} sets')
        
        for j, s in enumerate(log_ex.get('sets', [])[:2]):
            if s.get('weight') and s.get('reps'):
                print(f'         Set {s.get("set_number")}: weight={s.get("weight")}, reps={s.get("reps")}')
            elif s.get('duration_seconds'):
                print(f'         Set {s.get("set_number")}: duration={s.get("duration_seconds")}s')
    
    print(f'\n🎯 SOLUCIÓN: El frontend debe usar log.log_exercises en lugar de log.exercises_data')
