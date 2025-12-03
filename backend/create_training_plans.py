#!/usr/bin/env python
"""
Script para crear planes de entrenamiento coherentes y variados
Ejecutar dentro del contenedor Docker:
    docker exec nexfit-pro-backend-1 python create_training_plans.py
"""

import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from workouts.models import Exercise, WorkoutProgram, WorkoutDay, WorkoutDayExercise


def get_exercises_by_muscle(muscle_groups):
    """Obtiene ejercicios que trabajen alguno de los grupos musculares especificados"""
    exercises = Exercise.objects.filter(is_active=True)
    matching = []
    for ex in exercises:
        if any(mg in ex.muscle_groups for mg in muscle_groups):
            matching.append(ex)
    return matching


def get_exercise_by_name(name):
    """Obtiene un ejercicio por nombre (parcial)"""
    try:
        return Exercise.objects.filter(name__icontains=name).first()
    except:
        return None


def create_training_plans():
    """Crear múltiples planes de entrenamiento variados"""
    
    print("🏋️ Creando planes de entrenamiento...")
    
    # Obtener ejercicios por categoría para usar después
    exercises = {
        # Pecho
        'press_banca': get_exercise_by_name('Press Banca en Multipower'),
        'press_inclinado': get_exercise_by_name('Press Banca Inclinado'),
        'press_estrecho': get_exercise_by_name('Press Banca Agarre Estrecho'),
        'press_abierto': get_exercise_by_name('Press Banca Agarre Abierto'),
        
        # Espalda
        'jalon_prono': get_exercise_by_name('Jalón al Pecho Agarre Prono'),
        'jalon_supino': get_exercise_by_name('Jalón al Pecho Agarre Supino'),
        'jalon_estrecho': get_exercise_by_name('Jalón al Pecho Agarre Estrecho'),
        'jalon_unilateral': get_exercise_by_name('Jalón al Pecho Agarre Unilateral'),
        'jalon_maquina': get_exercise_by_name('Jalón al Pecho en Máquina'),
        'remo_neutro': get_exercise_by_name('Remo Agarre Neutro'),
        'remo_prono': get_exercise_by_name('Remo Agarre Prono'),
        'remo_barra': get_exercise_by_name('Remo con Barra'),
        'remo_mancuerna': get_exercise_by_name('Remo con Mancuerna'),
        'dominada_banda': get_exercise_by_name('Dominada con Banda'),
        'dominada_prona': get_exercise_by_name('Dominada Prona'),
        'pullover_maquina': get_exercise_by_name('Pull Over en Máquina'),
        'pullover_polea': get_exercise_by_name('Pull Over en Polea'),
        
        # Hombros
        'press_militar': get_exercise_by_name('Press Militar'),
        'remo_alto': get_exercise_by_name('Remo Alto'),
        
        # Brazos
        'curl_biceps': get_exercise_by_name('Curl de Bíceps Bayesian'),
        'curl_polea_z': get_exercise_by_name('Curl de Bíceps en Polea con Barra Z'),
        'curl_unilateral': get_exercise_by_name('Curl de Bíceps en Polea Unilateral'),
        'extension_triceps': get_exercise_by_name('Extensión de Tríceps en Polea Alta'),
        'extension_triceps_z': get_exercise_by_name('Extensión de Tríceps en Polea Alta con Barra Z'),
        
        # Piernas - Cuádriceps
        'prensa': get_exercise_by_name('Prensa'),
        'prensa_arriba': get_exercise_by_name('Prensa con Pies Arriba'),
        'prensa_unilateral': get_exercise_by_name('Prensa Unilateral'),
        'extension_cuadriceps': get_exercise_by_name('Extensión de Cuádriceps'),
        'peso_muerto_sumo': get_exercise_by_name('Peso Muerto Sumo'),
        
        # Piernas - Isquiotibiales
        'curl_femoral': get_exercise_by_name('Curl Femoral'),
        'peso_muerto_rumano': get_exercise_by_name('Peso Muerto Rumano'),
        'peso_muerto_rigido': get_exercise_by_name('Peso Muerto Piernas Rígidas'),
        'buenos_dias': get_exercise_by_name('Buenos Días'),
        
        # Glúteos
        'hip_thrust': get_exercise_by_name('Hip Thrust'),
        'prensa_gluteo': get_exercise_by_name('Prensa de Glúteo'),
        'patada_gluteo_maquina': get_exercise_by_name('Patada de Glúteo en Máquina'),
        'patada_gluteo_polea': get_exercise_by_name('Patada de Glúteo en Polea'),
        'puente_gluteo': get_exercise_by_name('Puente de Glúteo'),
        'puente_gluteo_peso': get_exercise_by_name('Puente de Glúteo con Peso'),
        'hiperextension': get_exercise_by_name('Hiperextensiones'),
        'hiperextension_lastre': get_exercise_by_name('Hiperextensiones con Lastre'),
        'hiperextension_glute': get_exercise_by_name('Hiperextensiones en Máquina Glute'),
        'abduccion': get_exercise_by_name('Abducción en Polea'),
        'clamshells': get_exercise_by_name('Clamshells'),
        
        # Gemelos
        'elevacion_talon': get_exercise_by_name('Elevación de Talón'),
        
        # Core
        'crunch_polea': get_exercise_by_name('Crunch Abdominal'),
    }
    
    # Limpiar None values
    exercises = {k: v for k, v in exercises.items() if v is not None}
    print(f"📦 Ejercicios encontrados: {len(exercises)}")
    
    plans_created = []
    
    # =========================================================================
    # PLAN 1: Principiante - Full Body 3 días
    # =========================================================================
    plan1, created = WorkoutProgram.objects.update_or_create(
        name="Plan Principiante - Full Body",
        is_system=True,
        defaults={
            'description': 'Plan ideal para principiantes que buscan mejorar su condición física general. '
                          'Entrena todo el cuerpo 3 veces por semana con ejercicios básicos de máquinas '
                          'para aprender la técnica correcta.',
            'difficulty': 'beginner',
            'goal': 'general_fitness',
            'location': 'gym',
            'duration_weeks': 8,
            'days_per_week': 3,
            'estimated_duration_minutes': 45,
            'equipment_needed': ['multipower', 'máquinas', 'poleas'],
            'is_template': True,
            'is_active': True,
            'tags': ['principiante', 'full body', 'máquinas', 'iniciación'],
        }
    )
    
    if created or plan1.days.count() == 0:
        plan1.days.all().delete()
        
        # Día 1: Full Body A
        day1 = WorkoutDay.objects.create(
            program=plan1,
            name="Full Body A",
            day_number=1,
            day_of_week='monday',
            is_rest_day=False,
            duration_minutes=45,
            focus="Tren superior + Piernas",
            order_index=1
        )
        day1_exercises = [
            ('press_banca', 3, '10-12', 60, "Mantén la espalda pegada al banco"),
            ('jalon_maquina', 3, '10-12', 60, "Controla el movimiento en todo el recorrido"),
            ('press_militar', 3, '10-12', 60, "No arquees la espalda"),
            ('prensa', 3, '12-15', 90, "Pies a la anchura de hombros"),
            ('curl_femoral', 3, '12-15', 60, "Contrae bien en la parte superior"),
            ('crunch_polea', 3, '15-20', 45, "Exhala al contraer"),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(day1_exercises, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day1,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        # Día 2: Descanso
        WorkoutDay.objects.create(
            program=plan1,
            name="Descanso",
            day_number=2,
            day_of_week='tuesday',
            is_rest_day=True,
            notes="Recuperación activa: caminar o estiramientos ligeros",
            order_index=2
        )
        
        # Día 3: Full Body B
        day3 = WorkoutDay.objects.create(
            program=plan1,
            name="Full Body B",
            day_number=3,
            day_of_week='wednesday',
            is_rest_day=False,
            duration_minutes=45,
            focus="Tren superior + Glúteos",
            order_index=3
        )
        day3_exercises = [
            ('press_inclinado', 3, '10-12', 60, "30-45 grados de inclinación"),
            ('remo_neutro', 3, '10-12', 60, "Lleva los codos hacia atrás"),
            ('curl_biceps', 2, '12-15', 45, "Codo pegado al cuerpo"),
            ('extension_triceps', 2, '12-15', 45, "Solo mueve el antebrazo"),
            ('hip_thrust', 3, '12-15', 60, "Aprieta glúteos arriba"),
            ('extension_cuadriceps', 3, '12-15', 60, "Extensión completa"),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(day3_exercises, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day3,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        # Día 4: Descanso
        WorkoutDay.objects.create(
            program=plan1,
            name="Descanso",
            day_number=4,
            day_of_week='thursday',
            is_rest_day=True,
            notes="Recuperación",
            order_index=4
        )
        
        # Día 5: Full Body C
        day5 = WorkoutDay.objects.create(
            program=plan1,
            name="Full Body C",
            day_number=5,
            day_of_week='friday',
            is_rest_day=False,
            duration_minutes=45,
            focus="Tren superior + Piernas completo",
            order_index=5
        )
        day5_exercises = [
            ('jalon_prono', 3, '10-12', 60, "Agarre a la anchura de hombros"),
            ('press_banca', 3, '10-12', 60, "Baja hasta el pecho"),
            ('prensa_arriba', 3, '12-15', 90, "Énfasis en glúteos"),
            ('curl_femoral', 3, '12-15', 60, ""),
            ('elevacion_talon', 3, '15-20', 45, "Rango completo de movimiento"),
            ('crunch_polea', 3, '15-20', 45, ""),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(day5_exercises, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day5,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        print(f"  ✅ Creado: {plan1.name}")
    plans_created.append(plan1)
    
    # =========================================================================
    # PLAN 2: Intermedio - Push/Pull/Legs 3 días
    # =========================================================================
    plan2, created = WorkoutProgram.objects.update_or_create(
        name="Plan Intermedio - Push/Pull/Piernas",
        is_system=True,
        defaults={
            'description': 'Rutina clásica de empuje, tirón y piernas para nivel intermedio. '
                          'Ideal para quienes ya dominan los ejercicios básicos y buscan progresar.',
            'difficulty': 'intermediate',
            'goal': 'muscle_gain',
            'location': 'gym',
            'duration_weeks': 12,
            'days_per_week': 3,
            'estimated_duration_minutes': 60,
            'equipment_needed': ['multipower', 'máquinas', 'poleas', 'mancuernas'],
            'is_template': True,
            'is_active': True,
            'tags': ['intermedio', 'ppl', 'hipertrofia', 'fuerza'],
        }
    )
    
    if created or plan2.days.count() == 0:
        plan2.days.all().delete()
        
        # Día 1: Push (Empuje - Pecho/Hombros/Tríceps)
        day1 = WorkoutDay.objects.create(
            program=plan2,
            name="Push - Empuje",
            day_number=1,
            day_of_week='monday',
            is_rest_day=False,
            duration_minutes=60,
            focus="Pecho, Hombros, Tríceps",
            order_index=1
        )
        push_exercises = [
            ('press_banca', 4, '8-10', 90, "Ejercicio principal - progresión de peso"),
            ('press_inclinado', 3, '10-12', 75, "Enfoque en pecho superior"),
            ('press_militar', 3, '10-12', 75, ""),
            ('press_estrecho', 3, '10-12', 60, "Énfasis en tríceps"),
            ('extension_triceps', 3, '12-15', 45, "Squeeze en contracción"),
            ('crunch_polea', 3, '15-20', 45, ""),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(push_exercises, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day1,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        # Día 2: Pull (Tirón - Espalda/Bíceps)
        day2 = WorkoutDay.objects.create(
            program=plan2,
            name="Pull - Tirón",
            day_number=2,
            day_of_week='wednesday',
            is_rest_day=False,
            duration_minutes=60,
            focus="Espalda, Bíceps",
            order_index=2
        )
        pull_exercises = [
            ('jalon_prono', 4, '8-10', 90, "Ejercicio principal de espalda"),
            ('remo_barra', 4, '8-10', 90, "Mantén la espalda recta"),
            ('jalon_estrecho', 3, '10-12', 60, ""),
            ('remo_mancuerna', 3, '10-12', 60, "Un brazo a la vez"),
            ('curl_polea_z', 3, '10-12', 45, ""),
            ('curl_biceps', 3, '12-15', 45, "Contracción máxima"),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(pull_exercises, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day2,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        # Día 3: Legs (Piernas)
        day3 = WorkoutDay.objects.create(
            program=plan2,
            name="Legs - Piernas",
            day_number=3,
            day_of_week='friday',
            is_rest_day=False,
            duration_minutes=60,
            focus="Cuádriceps, Isquiotibiales, Glúteos",
            order_index=3
        )
        legs_exercises = [
            ('prensa', 4, '10-12', 120, "Ejercicio compuesto principal"),
            ('peso_muerto_rumano', 4, '10-12', 90, "Estiramiento controlado"),
            ('extension_cuadriceps', 3, '12-15', 60, ""),
            ('curl_femoral', 3, '12-15', 60, ""),
            ('hip_thrust', 4, '12-15', 75, ""),
            ('elevacion_talon', 4, '15-20', 45, ""),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(legs_exercises, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day3,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        print(f"  ✅ Creado: {plan2.name}")
    plans_created.append(plan2)
    
    # =========================================================================
    # PLAN 3: Avanzado - Upper/Lower 4 días
    # =========================================================================
    plan3, created = WorkoutProgram.objects.update_or_create(
        name="Plan Avanzado - Upper/Lower",
        is_system=True,
        defaults={
            'description': 'Rutina de alto volumen dividida en tren superior e inferior. '
                          '4 días de entrenamiento para maximizar la frecuencia y el volumen de trabajo.',
            'difficulty': 'advanced',
            'goal': 'strength',
            'location': 'gym',
            'duration_weeks': 12,
            'days_per_week': 4,
            'estimated_duration_minutes': 75,
            'equipment_needed': ['multipower', 'máquinas', 'poleas', 'barra', 'mancuernas'],
            'is_template': True,
            'is_active': True,
            'tags': ['avanzado', 'upper lower', 'fuerza', 'alto volumen'],
        }
    )
    
    if created or plan3.days.count() == 0:
        plan3.days.all().delete()
        
        # Día 1: Upper A (Énfasis Push)
        day1 = WorkoutDay.objects.create(
            program=plan3,
            name="Upper A - Énfasis Push",
            day_number=1,
            day_of_week='monday',
            is_rest_day=False,
            duration_minutes=75,
            focus="Pecho, Hombros, Tríceps + Espalda",
            order_index=1
        )
        upper_a_exercises = [
            ('press_banca', 4, '6-8', 120, "Peso pesado, técnica perfecta"),
            ('jalon_prono', 4, '8-10', 90, ""),
            ('press_inclinado', 4, '8-10', 90, ""),
            ('remo_neutro', 3, '10-12', 75, ""),
            ('press_militar', 3, '8-10', 90, ""),
            ('extension_triceps_z', 3, '10-12', 60, ""),
            ('curl_polea_z', 3, '10-12', 60, ""),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(upper_a_exercises, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day1,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        # Día 2: Lower A (Énfasis Cuádriceps)
        day2 = WorkoutDay.objects.create(
            program=plan3,
            name="Lower A - Énfasis Cuádriceps",
            day_number=2,
            day_of_week='tuesday',
            is_rest_day=False,
            duration_minutes=75,
            focus="Cuádriceps, Glúteos, Core",
            order_index=2
        )
        lower_a_exercises = [
            ('prensa', 5, '8-10', 120, "Ejercicio principal"),
            ('peso_muerto_sumo', 4, '8-10', 120, ""),
            ('extension_cuadriceps', 4, '12-15', 60, ""),
            ('hip_thrust', 4, '10-12', 90, ""),
            ('hiperextension', 3, '12-15', 60, ""),
            ('elevacion_talon', 4, '15-20', 45, ""),
            ('crunch_polea', 3, '15-20', 45, ""),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(lower_a_exercises, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day2,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        # Día 3: Descanso
        WorkoutDay.objects.create(
            program=plan3,
            name="Descanso",
            day_number=3,
            day_of_week='wednesday',
            is_rest_day=True,
            notes="Recuperación activa recomendada",
            order_index=3
        )
        
        # Día 4: Upper B (Énfasis Pull)
        day4 = WorkoutDay.objects.create(
            program=plan3,
            name="Upper B - Énfasis Pull",
            day_number=4,
            day_of_week='thursday',
            is_rest_day=False,
            duration_minutes=75,
            focus="Espalda, Bíceps + Pecho/Hombros",
            order_index=4
        )
        upper_b_exercises = [
            ('remo_barra', 4, '6-8', 120, "Peso pesado"),
            ('press_abierto', 4, '8-10', 90, ""),
            ('jalon_supino', 4, '8-10', 90, ""),
            ('press_estrecho', 3, '10-12', 75, ""),
            ('pullover_maquina', 3, '10-12', 60, ""),
            ('curl_biceps', 3, '10-12', 60, ""),
            ('extension_triceps', 3, '12-15', 45, ""),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(upper_b_exercises, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day4,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        # Día 5: Lower B (Énfasis Posterior)
        day5 = WorkoutDay.objects.create(
            program=plan3,
            name="Lower B - Énfasis Posterior",
            day_number=5,
            day_of_week='friday',
            is_rest_day=False,
            duration_minutes=75,
            focus="Isquiotibiales, Glúteos, Gemelos",
            order_index=5
        )
        lower_b_exercises = [
            ('peso_muerto_rumano', 4, '8-10', 120, ""),
            ('prensa_arriba', 4, '10-12', 90, ""),
            ('curl_femoral', 4, '10-12', 75, ""),
            ('prensa_gluteo', 4, '12-15', 75, ""),
            ('buenos_dias', 3, '12-15', 60, ""),
            ('patada_gluteo_maquina', 3, '12-15', 45, ""),
            ('elevacion_talon', 4, '15-20', 45, ""),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(lower_b_exercises, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day5,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        print(f"  ✅ Creado: {plan3.name}")
    plans_created.append(plan3)
    
    # =========================================================================
    # PLAN 4: Glúteos Intensivo 3 días
    # =========================================================================
    plan4, created = WorkoutProgram.objects.update_or_create(
        name="Plan Glúteos Intensivo",
        is_system=True,
        defaults={
            'description': 'Plan especializado en el desarrollo y tonificación de glúteos. '
                          '3 días enfocados en activar y trabajar los glúteos desde diferentes ángulos.',
            'difficulty': 'intermediate',
            'goal': 'body_recomposition',
            'location': 'gym',
            'duration_weeks': 8,
            'days_per_week': 3,
            'estimated_duration_minutes': 50,
            'equipment_needed': ['multipower', 'máquinas', 'poleas', 'bandas elásticas'],
            'is_template': True,
            'is_active': True,
            'tags': ['glúteos', 'tonificación', 'piernas', 'mujeres'],
        }
    )
    
    if created or plan4.days.count() == 0:
        plan4.days.all().delete()
        
        # Día 1: Glúteo Mayor
        day1 = WorkoutDay.objects.create(
            program=plan4,
            name="Glúteo Mayor - Hip Dominant",
            day_number=1,
            day_of_week='monday',
            is_rest_day=False,
            duration_minutes=50,
            focus="Glúteo mayor, extensión de cadera",
            order_index=1
        )
        glute1_exercises = [
            ('hip_thrust', 4, '12-15', 75, "Aprieta 2 segundos arriba"),
            ('peso_muerto_rumano', 4, '10-12', 90, ""),
            ('prensa_gluteo', 4, '12-15', 60, ""),
            ('hiperextension_glute', 3, '15', 60, "Squeeze en la parte alta"),
            ('puente_gluteo_peso', 3, '15-20', 45, ""),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(glute1_exercises, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day1,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        # Día 2: Glúteo Medio + Abductores
        day2 = WorkoutDay.objects.create(
            program=plan4,
            name="Glúteo Medio + Abductores",
            day_number=2,
            day_of_week='wednesday',
            is_rest_day=False,
            duration_minutes=50,
            focus="Glúteo medio, estabilidad de cadera",
            order_index=2
        )
        glute2_exercises = [
            ('abduccion', 4, '15-20', 45, "Movimiento controlado"),
            ('clamshells', 3, '20', 30, "Banda en rodillas"),
            ('patada_gluteo_polea', 4, '12-15', 45, ""),
            ('prensa_unilateral', 3, '10-12', 60, "Una pierna a la vez"),
            ('buenos_dias', 3, '12-15', 60, ""),
            ('puente_gluteo', 3, '20', 30, "Activación"),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(glute2_exercises, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day2,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        # Día 3: Glúteos Full + Piernas
        day3 = WorkoutDay.objects.create(
            program=plan4,
            name="Glúteos Full + Piernas",
            day_number=3,
            day_of_week='friday',
            is_rest_day=False,
            duration_minutes=55,
            focus="Trabajo completo de tren inferior",
            order_index=3
        )
        glute3_exercises = [
            ('prensa_arriba', 4, '10-12', 90, "Pies arriba = más glúteo"),
            ('hip_thrust', 4, '10-12', 75, ""),
            ('curl_femoral', 3, '12-15', 60, ""),
            ('patada_gluteo_maquina', 3, '12-15', 45, ""),
            ('extension_cuadriceps', 3, '15', 45, ""),
            ('hiperextension', 3, '15', 45, ""),
            ('elevacion_talon', 3, '15-20', 30, ""),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(glute3_exercises, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day3,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        print(f"  ✅ Creado: {plan4.name}")
    plans_created.append(plan4)
    
    # =========================================================================
    # PLAN 5: Definición - 4 días
    # =========================================================================
    plan5, created = WorkoutProgram.objects.update_or_create(
        name="Plan Definición - Pérdida de Grasa",
        is_system=True,
        defaults={
            'description': 'Plan enfocado en la pérdida de grasa y definición muscular. '
                          'Combina entrenamiento de fuerza con alto volumen y descansos cortos.',
            'difficulty': 'intermediate',
            'goal': 'weight_loss',
            'location': 'gym',
            'duration_weeks': 10,
            'days_per_week': 4,
            'estimated_duration_minutes': 55,
            'equipment_needed': ['multipower', 'máquinas', 'poleas'],
            'is_template': True,
            'is_active': True,
            'tags': ['definición', 'pérdida de grasa', 'tonificación', 'cutting'],
        }
    )
    
    if created or plan5.days.count() == 0:
        plan5.days.all().delete()
        
        # Día 1: Pecho + Espalda (Superseries)
        day1 = WorkoutDay.objects.create(
            program=plan5,
            name="Pecho + Espalda",
            day_number=1,
            day_of_week='monday',
            is_rest_day=False,
            duration_minutes=55,
            focus="Superseries antagónicas",
            notes="Hacer ejercicios marcados con mismo grupo de superset seguidos",
            order_index=1
        )
        chest_back = [
            ('press_banca', 4, '12-15', 60, "", 1),
            ('jalon_prono', 4, '12-15', 60, "", 1),
            ('press_inclinado', 3, '12-15', 45, "", 2),
            ('remo_neutro', 3, '12-15', 45, "", 2),
            ('pullover_polea', 3, '15', 30, "", None),
            ('crunch_polea', 3, '20', 30, "", None),
        ]
        for idx, (ex_key, sets, reps, rest, notes, superset) in enumerate(chest_back, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day1,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx,
                    superset_group=superset
                )
        
        # Día 2: Piernas + Glúteos
        day2 = WorkoutDay.objects.create(
            program=plan5,
            name="Piernas + Glúteos",
            day_number=2,
            day_of_week='tuesday',
            is_rest_day=False,
            duration_minutes=55,
            focus="Tren inferior completo",
            order_index=2
        )
        legs_def = [
            ('prensa', 4, '15', 60, ""),
            ('peso_muerto_rumano', 4, '12-15', 60, ""),
            ('extension_cuadriceps', 3, '15', 45, ""),
            ('curl_femoral', 3, '15', 45, ""),
            ('hip_thrust', 3, '15', 45, ""),
            ('elevacion_talon', 3, '20', 30, ""),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(legs_def, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day2,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        # Día 3: Descanso
        WorkoutDay.objects.create(
            program=plan5,
            name="Descanso Activo",
            day_number=3,
            day_of_week='wednesday',
            is_rest_day=True,
            notes="30-40 min de cardio suave (caminar, bici)",
            order_index=3
        )
        
        # Día 4: Hombros + Brazos
        day4 = WorkoutDay.objects.create(
            program=plan5,
            name="Hombros + Brazos",
            day_number=4,
            day_of_week='thursday',
            is_rest_day=False,
            duration_minutes=50,
            focus="Hombros, Bíceps, Tríceps",
            order_index=4
        )
        shoulders_arms = [
            ('press_militar', 4, '12-15', 60, ""),
            ('remo_alto', 3, '12-15', 45, ""),
            ('curl_polea_z', 3, '12-15', 30, ""),
            ('extension_triceps_z', 3, '12-15', 30, ""),
            ('curl_unilateral', 3, '15', 30, ""),
            ('extension_triceps', 3, '15', 30, ""),
            ('crunch_polea', 3, '20', 30, ""),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(shoulders_arms, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day4,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        # Día 5: Full Body Metabólico
        day5 = WorkoutDay.objects.create(
            program=plan5,
            name="Full Body Metabólico",
            day_number=5,
            day_of_week='friday',
            is_rest_day=False,
            duration_minutes=45,
            focus="Circuito metabólico - descansos mínimos",
            notes="Circuito: 3 rondas de todos los ejercicios con 90s descanso entre rondas",
            order_index=5
        )
        metabolic = [
            ('prensa', 3, '15', 30, ""),
            ('jalon_maquina', 3, '15', 30, ""),
            ('press_banca', 3, '12', 30, ""),
            ('hip_thrust', 3, '15', 30, ""),
            ('curl_biceps', 2, '15', 20, ""),
            ('extension_triceps', 2, '15', 20, ""),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(metabolic, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day5,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        print(f"  ✅ Creado: {plan5.name}")
    plans_created.append(plan5)
    
    # =========================================================================
    # PLAN 6: Fuerza Básica - 3 días
    # =========================================================================
    plan6, created = WorkoutProgram.objects.update_or_create(
        name="Plan Fuerza Básica",
        is_system=True,
        defaults={
            'description': 'Plan centrado en ganar fuerza en los movimientos principales. '
                          'Bajas repeticiones y descansos largos para maximizar la intensidad.',
            'difficulty': 'intermediate',
            'goal': 'strength',
            'location': 'gym',
            'duration_weeks': 8,
            'days_per_week': 3,
            'estimated_duration_minutes': 60,
            'equipment_needed': ['multipower', 'barra', 'máquinas'],
            'is_template': True,
            'is_active': True,
            'tags': ['fuerza', 'powerlifting', 'básicos', 'compuestos'],
        }
    )
    
    if created or plan6.days.count() == 0:
        plan6.days.all().delete()
        
        # Día 1: Press + Accesorios
        day1 = WorkoutDay.objects.create(
            program=plan6,
            name="Día de Press",
            day_number=1,
            day_of_week='monday',
            is_rest_day=False,
            duration_minutes=60,
            focus="Press de banca y accesorios",
            order_index=1
        )
        press_day = [
            ('press_banca', 5, '5', 180, "Peso del 80-85% 1RM"),
            ('press_inclinado', 4, '6-8', 120, ""),
            ('jalon_prono', 4, '8-10', 90, ""),
            ('extension_triceps_z', 3, '10-12', 60, ""),
            ('crunch_polea', 3, '15', 45, ""),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(press_day, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day1,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        # Día 2: Piernas
        day2 = WorkoutDay.objects.create(
            program=plan6,
            name="Día de Piernas",
            day_number=2,
            day_of_week='wednesday',
            is_rest_day=False,
            duration_minutes=65,
            focus="Prensa y movimientos de piernas",
            order_index=2
        )
        squat_day = [
            ('prensa', 5, '5', 180, "Peso del 80-85% 1RM"),
            ('peso_muerto_rumano', 4, '6-8', 120, ""),
            ('extension_cuadriceps', 3, '10-12', 60, ""),
            ('curl_femoral', 3, '10-12', 60, ""),
            ('elevacion_talon', 4, '12-15', 45, ""),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(squat_day, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day2,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        # Día 3: Tirón
        day3 = WorkoutDay.objects.create(
            program=plan6,
            name="Día de Tirón",
            day_number=3,
            day_of_week='friday',
            is_rest_day=False,
            duration_minutes=60,
            focus="Remo, Jalón y accesorios de espalda",
            order_index=3
        )
        row_day = [
            ('remo_barra', 5, '5', 180, "Peso pesado"),
            ('jalon_supino', 4, '6-8', 120, ""),
            ('remo_mancuerna', 3, '8-10', 90, ""),
            ('press_militar', 3, '8-10', 90, ""),
            ('curl_polea_z', 3, '10-12', 60, ""),
        ]
        for idx, (ex_key, sets, reps, rest, notes) in enumerate(row_day, 1):
            if ex_key in exercises:
                WorkoutDayExercise.objects.create(
                    workout_day=day3,
                    exercise=exercises[ex_key],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest,
                    notes=notes,
                    order_index=idx
                )
        
        print(f"  ✅ Creado: {plan6.name}")
    plans_created.append(plan6)
    
    print(f"\n🎉 ¡Completado! Se crearon/actualizaron {len(plans_created)} planes de entrenamiento.")
    
    # Resumen
    print("\n📋 RESUMEN DE PLANES:")
    for plan in plans_created:
        days = plan.days.filter(is_rest_day=False).count()
        print(f"  • {plan.name}")
        print(f"    Dificultad: {plan.get_difficulty_display()} | Objetivo: {plan.get_goal_display()}")
        print(f"    {days} días de entrenamiento | {plan.duration_weeks} semanas")
        print()


if __name__ == '__main__':
    create_training_plans()


