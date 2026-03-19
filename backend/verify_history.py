#!/usr/bin/env python
import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from workouts.models import WorkoutLog, WorkoutLogExercise, WorkoutLogSet
from django.contrib.auth import get_user_model
from django.db.models import Sum, Max, Min, Avg, Count
from decimal import Decimal
from datetime import datetime, timedelta

User = get_user_model()
user = User.objects.get(email='usuario@test.com')

print('\n' + '='*70)
print('📊 RESUMEN COMPLETO DEL HISTORIAL DE ENTRENAMIENTOS')
print('='*70)

# Estadísticas generales
logs = WorkoutLog.objects.filter(user=user).order_by('date')
total_logs = logs.count()
first_date = logs.first().date
last_date = logs.last().date

print(f'\n📅 Periodo: {first_date} a {last_date}')
print(f'   Total entrenamientos: {total_logs}')
print(f'   Duración: {(last_date - first_date).days} días (~{(last_date - first_date).days / 7:.0f} semanas)')

# Tonelaje total y por ejercicio
print(f'\n💪 TONELAJE POR EJERCICIO:')
exercise_stats = {}

for log in logs:
    for log_ex in log.log_exercises.all():
        ex_name = log_ex.exercise_name
        if ex_name not in exercise_stats:
            exercise_stats[ex_name] = {
                'tonnage': Decimal('0'),
                'total_sets': 0,
                'total_reps': 0,
                'max_weight': Decimal('0'),
                'max_reps': 0,
                'weights': []
            }
        
        for s in log_ex.sets.all():
            exercise_stats[ex_name]['total_sets'] += 1
            
            if s.weight and s.reps:
                tonnage = s.weight * Decimal(str(s.reps))
                exercise_stats[ex_name]['tonnage'] += tonnage
                exercise_stats[ex_name]['total_reps'] += s.reps
                exercise_stats[ex_name]['weights'].append(float(s.weight))
                
                if s.weight > exercise_stats[ex_name]['max_weight']:
                    exercise_stats[ex_name]['max_weight'] = s.weight
                if s.reps > exercise_stats[ex_name]['max_reps']:
                    exercise_stats[ex_name]['max_reps'] = s.reps

# Mostrar ejercicios ordenados por tonelaje
sorted_exercises = sorted(exercise_stats.items(), key=lambda x: x[1]['tonnage'], reverse=True)

total_tonnage = Decimal('0')
for ex_name, stats in sorted_exercises:
    if stats['tonnage'] > 0:
        total_tonnage += stats['tonnage']
        min_weight = min(stats['weights']) if stats['weights'] else 0
        print(f'\n   {ex_name}:')
        print(f'      Tonelaje total: {stats["tonnage"]:,.1f} kg')
        print(f'      Sets completados: {stats["total_sets"]}')
        print(f'      Peso: {min_weight:.1f}kg → {stats["max_weight"]:.1f}kg (progresión)')
        print(f'      Reps máximas: {stats["max_reps"]}')

print(f'\n   TOTAL ACUMULADO: {total_tonnage:,.1f} kg')

# Ejercicios de duración
print(f'\n⏱️  EJERCICIOS DE DURACIÓN (Cardio/Plancha):')
for ex_name in ['P Ejercicio Plancha', 'P Ejercicio Cinta Cardio']:
    durations = []
    total_sets = 0
    
    for log in logs:
        for log_ex in log.log_exercises.filter(exercise_name=ex_name):
            for s in log_ex.sets.all():
                if s.duration_seconds:
                    durations.append(s.duration_seconds)
                    total_sets += 1
    
    if durations:
        print(f'\n   {ex_name}:')
        print(f'      Duración: {min(durations)}s → {max(durations)}s (progresión)')
        print(f'      Promedio: {sum(durations)/len(durations):.0f}s ({sum(durations)/len(durations)/60:.1f} min)')
        print(f'      Total de sets: {total_sets}')

# Progreso semanalsemanal
print(f'\n📈 PROGRESO POR SEMANAS (últimas 6 semanas):')
for week_ago in range(5, -1, -1):
    week_start = last_date - timedelta(weeks=week_ago+1)
    week_end = last_date - timedelta(weeks=week_ago)
    
    week_logs = logs.filter(date__gte=week_start, date__lt=week_end)
    week_tonnage = Decimal('0')
    
    for log in week_logs:
        for log_ex in log.log_exercises.all():
            for s in log_ex.sets.all():
                if s.weight and s.reps:
                    week_tonnage += s.weight * Decimal(str(s.reps))
    
    if week_logs.exists():
        print(f'   Semana {6-week_ago} ({week_start} a {week_end}):')
        print(f'      Entrenamientos: {week_logs.count()}')
        print(f'      Tonelaje: {week_tonnage:,.1f} kg')

print('\n' + '='*70)
print('✅ El historial está listo para probar:')
print('   • RP (Récords Personales): Pesos máximos por ejercicio')
print('   • RM (Repeticiones Máximas): Mayor número de reps a peso específico')
print('   • Tonelaje: Volumen total de carga levantada')
print('   • Progresión: Evolución de pesos en 12 semanas')
print('='*70)
