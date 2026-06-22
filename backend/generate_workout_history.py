#!/usr/bin/env python
"""
Script para generar historial de entrenamientos con progresión de pesos
para pruebas de RP (Récords Personales), RM (Repeticiones Máximas) y Tonelaje
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from workouts.models import (
    Exercise, WorkoutProgram, WorkoutDay, WorkoutDayExercise,
    WorkoutLog, WorkoutLogExercise, WorkoutLogSet
)

User = get_user_model()


def generate_workout_history():
    """Genera historial de entrenamientos con progresión"""
    
    # Obtener usuario de prueba
    try:
        user = User.objects.get(email='member@example.invalid')
        print(f"✓ Usuario encontrado: {user.email}")
    except User.DoesNotExist:
        print("✗ Usuario 'member@example.invalid' no encontrado")
        return
    
    # Eliminar logs existentes primero
    existing_logs_count = WorkoutLog.objects.filter(user=user).count()
    if existing_logs_count > 0:
        print(f"ℹ Eliminando {existing_logs_count} entrenamientos existentes...")
        WorkoutLog.objects.filter(user=user).delete()
        print("✓ Logs anteriores eliminados")
    
    # Obtener programa activo del usuario
    try:
        program = WorkoutProgram.objects.filter(user=user, is_active=True).first()
        if not program:
            print("✗ No hay programa activo para el usuario")
            return
        print(f"✓ Programa encontrado: {program.name}")
    except Exception as e:
        print(f"✗ Error al buscar programa: {e}")
        return
    
    # Obtener días del programa
    workout_days = list(program.days.all())
    if not workout_days:
        print("✗ El programa no tiene días de entrenamiento")
        return
    print(f"✓ Días en el programa: {len(workout_days)}")
    
    # Obtener ejercicios principales para el historial
    exercises_with_weights = []
    for day in workout_days:
        for day_exercise in day.exercises.all():
            if day_exercise.exercise:
                exercises_with_weights.append({
                    'exercise': day_exercise.exercise,
                    'day': day,
                    'sets': day_exercise.sets or 3,
                    'reps': day_exercise.reps or 10,
                })
    
    if not exercises_with_weights:
        print("✗ No hay ejercicios en el programa")
        return
    print(f"✓ Ejercicios encontrados: {len(exercises_with_weights)}")
    
    # Generar historial de las últimas 12 semanas (3 meses)
    # Progresión: empezar con pesos menores e ir aumentando
    today = datetime.now().date()
    logs_created = 0
    
    # Definir progresión de peso base para cada ejercicio
    # Simularemos que el usuario ha estado progresando gradualmente
    base_weights = {
        'P Ejercicio Press Banca': Decimal('55.0'),       # Press de banca
        'P Ejercicio Sentadilla': Decimal('75.0'),        # Sentadilla
        'P Ejercicio Peso Muerto': Decimal('90.0'),       # Peso muerto
        'P Ejercicio Remo con Mancuernas': Decimal('25.0'), # Remo con mancuernas (cada mano)
        'P Ejercicio Plancha': Decimal('0.0'),            # Plancha - peso corporal
        'P Ejercicio Cinta Cardio': Decimal('0.0'),       # Cardio - sin peso
        'Test Casa Tag': Decimal('18.0'),                 # Ejercicio de prueba
    }
    
    # Generar 3 entrenamientos por semana durante 12 semanas = 36 entrenamientos
    for week in range(12, 0, -1):  # De la semana 12 a la semana 1 (más reciente)
        # Progresión semanal: incremento lineal del 2% por semana
        # Semana 12 (hace 3 meses): peso base
        # Semana 1 (actual): peso base + 22% (12 semanas * ~2%)
        weeks_of_progress = 12 - week  # 0 para semana 12, 11 para semana 1
        week_multiplier = weeks_of_progress * 0.02  # 2% de incremento por semana de progreso
        
        # 3 entrenamientos por semana (lunes, miércoles, viernes)
        for day_offset in [0, 2, 4]:  # Lunes, miércoles, viernes
            workout_date = today - timedelta(weeks=week, days=(6 - day_offset))
            
            # Seleccionar día del programa de forma cíclica
            day_index = logs_created % len(workout_days)
            workout_day = workout_days[day_index]
            
            # Crear WorkoutLog
            try:
                workout_log = WorkoutLog.objects.create(
                    user=user,
                    workout_day=workout_day,
                    date=workout_date,
                    duration_minutes=45 + (logs_created % 20),  # 45-65 minutos
                    completed=True,
                    rating=4 if logs_created % 3 != 0 else 5,  # Mayoría 4 estrellas, algunas 5
                )
                
                # Obtener ejercicios de este día
                day_exercises = list(workout_day.exercises.all())
                
                # Crear ejercicios y sets para este log
                for idx, day_exercise in enumerate(day_exercises):
                    if not day_exercise.exercise:
                        continue
                    
                    exercise = day_exercise.exercise
                    
                    # Crear WorkoutLogExercise
                    log_exercise = WorkoutLogExercise.objects.create(
                        workout_log=workout_log,
                        exercise=exercise,
                        exercise_name=exercise.name,
                        order_index=idx + 1
                    )
                    
                    # Determinar peso base para este ejercicio
                    base_weight = base_weights.get(exercise.name, Decimal('20.0'))
                    
                    # Aplicar progresión semanal
                    current_weight = base_weight * (Decimal('1.0') + Decimal(str(week_multiplier)))
                    
                    # Para ejercicios sin peso (cardio, plancha), usar duración en segundos en lugar de peso
                    is_bodyweight = base_weight == Decimal('0.0')
                    
                    # Crear sets (3-4 sets por ejercicio)
                    num_sets = day_exercise.sets or 3
                    
                    # Manejar reps que pueden ser un rango (ej: '10-12') o un número
                    target_reps_raw = day_exercise.reps
                    if isinstance(target_reps_raw, str):
                        # Si es un string con rango, tomar el valor medio
                        if '-' in target_reps_raw:
                            parts = target_reps_raw.split('-')
                            try:
                                target_reps = (int(parts[0]) + int(parts[1])) // 2
                            except (ValueError, IndexError):
                                target_reps = 10  # Valor por defecto
                        else:
                            try:
                                target_reps = int(target_reps_raw)
                            except ValueError:
                                target_reps = 10
                    elif target_reps_raw:
                        target_reps = int(target_reps_raw)
                    else:
                        target_reps = 10
                    
                    for set_num in range(1, num_sets + 1):
                        # Primer set con todas las reps, últimos sets con algunas menos (fatiga)
                        if set_num == 1:
                            reps = target_reps
                        elif set_num == num_sets:
                            reps = max(target_reps - 2, target_reps - 3)
                        else:
                            reps = target_reps - 1
                        
                        # Para ejercicios de peso corporal (plancha, cardio)
                        if is_bodyweight:
                            # Usar duración en segundos en lugar de peso
                            # Plancha: 30-60 segundos por set
                            # Cardio: 300-600 segundos (5-10 min)
                            if 'Plancha' in exercise.name:
                                duration = 30 + (13 - week) * 2  # Progresión de 30s a 54s
                            elif 'Cardio' in exercise.name or 'Cinta' in exercise.name:
                                duration = 300 + (13 - week) * 20  # Progresión de 300s a 540s
                            else:
                                duration = 45  # Valor por defecto
                            
                            WorkoutLogSet.objects.create(
                                log_exercise=log_exercise,
                                set_number=set_num,
                                reps=None,  # No aplica para cardio/plancha
                                weight=None,  # No hay peso
                                duration_seconds=duration,
                                rest_seconds=60 if set_num < num_sets else 0,
                                completed=True
                            )
                        else:
                            # Variación de peso entre sets (pirámide)
                            if set_num == 1:
                                set_weight = current_weight * Decimal('0.85')  # Calentamiento
                            elif set_num == num_sets:
                                set_weight = current_weight * Decimal('1.05')  # Set pesado final
                            else:
                                set_weight = current_weight
                            
                            # Redondear a 2.5kg (típico incremento de discos)
                            set_weight = (set_weight / Decimal('2.5')).quantize(Decimal('1')) * Decimal('2.5')
                            
                            WorkoutLogSet.objects.create(
                                log_exercise=log_exercise,
                                set_number=set_num,
                                reps=reps,
                                weight=set_weight,
                                rest_seconds=90 if set_num < num_sets else 0,
                                completed=True
                            )
                
                logs_created += 1
                if logs_created % 5 == 0:
                    print(f"  Creados {logs_created} entrenamientos...")
                
            except Exception as e:
                print(f"✗ Error creando log para {workout_date}: {e}")
                continue
    
    print(f"\n✓ Historial generado exitosamente!")
    print(f"  Total de entrenamientos: {logs_created}")
    print(f"  Periodo: {workout_date} hasta {today}")
    
    # Mostrar resumen de progresión
    print("\n📊 Resumen de progresión generada:")
    
    # Calcular tonelaje total
    total_tonnage = Decimal('0')
    for log in WorkoutLog.objects.filter(user=user):
        for log_ex in log.log_exercises.all():
            for log_set in log_ex.sets.all():
                if log_set.weight and log_set.reps:
                    total_tonnage += log_set.weight * log_set.reps
    
    print(f"  Tonelaje total acumulado: {total_tonnage:,.0f} kg")
    
    # Encontrar RPs por ejercicio
    print("\n🏆 Récords Personales (RP) generados:")
    exercise_prs = {}
    for log in WorkoutLog.objects.filter(user=user):
        for log_ex in log.log_exercises.all():
            ex_name = log_ex.exercise_name
            if ex_name not in exercise_prs:
                exercise_prs[ex_name] = {'max_weight': Decimal('0'), 'max_reps': 0}
            
            for log_set in log_ex.sets.all():
                if log_set.weight and log_set.weight > exercise_prs[ex_name]['max_weight']:
                    exercise_prs[ex_name]['max_weight'] = log_set.weight
                if log_set.reps and log_set.reps > exercise_prs[ex_name]['max_reps']:
                    exercise_prs[ex_name]['max_reps'] = log_set.reps
    
    for ex_name, prs in sorted(exercise_prs.items()):
        print(f"  {ex_name}:")
        print(f"    Peso máximo: {prs['max_weight']} kg")
        print(f"    Reps máximas: {prs['max_reps']} reps")
    
    print("\n✅ Listo para probar funcionalidades de RP, RM y Tonelaje!")


if __name__ == '__main__':
    print("=" * 60)
    print("Generador de Historial de Entrenamientos")
    print("=" * 60)
    print()
    
    generate_workout_history()
