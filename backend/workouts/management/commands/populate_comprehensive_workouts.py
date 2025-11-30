"""
Script para poblar planes de entrenamiento comprehensivos según todas las combinaciones del formulario
Uso: python manage.py populate_comprehensive_workouts
"""

from django.core.management.base import BaseCommand
from workouts.models import Exercise, WorkoutPlanTemplate, WorkoutPlanDay, WorkoutPlanExercise
from accounts.models import CustomUser


class Command(BaseCommand):
    help = 'Genera planes de entrenamiento para todas las combinaciones posibles del formulario'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('GENERADOR COMPLETO DE PLANES DE ENTRENAMIENTO'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        
        admin_user = CustomUser.objects.filter(is_superuser=True).first() or CustomUser.objects.first()
        
        # ===== GENERAR PLANES POR COMBINACIONES =====
        
        # === PLANES PARA 1 DÍA POR SEMANA ===
        self.create_plans_by_days(1, admin_user)
        
        # === PLANES PARA 2 DÍAS POR SEMANA ===
        self.create_plans_by_days(2, admin_user)
        
        # === PLANES PARA 3 DÍAS POR SEMANA ===
        self.create_plans_by_days(3, admin_user)
        
        # === PLANES PARA 4 DÍAS POR SEMANA ===
        self.create_plans_by_days(4, admin_user)
        
        # === PLANES PARA 5 DÍAS POR SEMANA ===
        self.create_plans_by_days(5, admin_user)
        
        # === PLANES PARA 6 DÍAS POR SEMANA ===
        self.create_plans_by_days(6, admin_user)
        
        # === PLANES PARA 7 DÍAS POR SEMANA ===
        self.create_plans_by_days(7, admin_user)
        
        # Estadísticas finales
        total_plans = WorkoutPlanTemplate.objects.count()
        total_days = WorkoutPlanDay.objects.count()
        total_exercises = WorkoutPlanExercise.objects.count()
        
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 70))
        self.stdout.write(self.style.SUCCESS('✓ TOTAL DE PLANES CREADOS:'))
        self.stdout.write(self.style.SUCCESS(f'  • Planes de entrenamiento: {total_plans}'))
        self.stdout.write(self.style.SUCCESS(f'  • Días de entrenamiento: {total_days}'))
        self.stdout.write(self.style.SUCCESS(f'  • Ejercicios en planes: {total_exercises}'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
    
    def create_plans_by_days(self, days_per_week, admin_user):
        """Crear planes para un número específico de días por semana"""
        
        locations = ['casa', 'gimnasio']
        goals = ['weight_loss', 'muscle_gain', 'body_recomposition']
        difficulty_levels = ['beginner', 'intermediate', 'advanced']
        
        for location in locations:
            for goal in goals:
                for difficulty in difficulty_levels:
                    
                    # Determinar si necesita equipamiento
                    is_equipment = (location == 'gimnasio')
                    
                    # Construir nombre descriptivo
                    location_name = 'Casa' if location == 'casa' else 'Gimnasio'
                    goal_name = {
                        'weight_loss': 'Perder Peso',
                        'muscle_gain': 'Ganar Músculo',
                        'body_recomposition': 'Recomposición'
                    }[goal]
                    difficulty_name = {
                        'beginner': 'Principiante',
                        'intermediate': 'Intermedio',
                        'advanced': 'Avanzado'
                    }[difficulty]
                    
                    plan_name = f"{location_name} - {days_per_week} Días - {goal_name} - {difficulty_name}"
                    
                    # Solo crear si no existe
                    if WorkoutPlanTemplate.objects.filter(name=plan_name).exists():
                        continue
                    
                    # Crear el plan
                    plan = WorkoutPlanTemplate.objects.create(
                        name=plan_name,
                        description=f"Plan de {days_per_week} días en {location_name.lower()} para {goal_name.lower()}. Nivel {difficulty_name.lower()}.",
                        difficulty=difficulty,
                        goal=goal,
                        duration_weeks=self.get_duration_weeks(goal, difficulty),
                        days_per_week=days_per_week,
                        is_active=True,
                        is_public=True,
                        created_by=admin_user,
                        tags=[location, goal, difficulty, f"{days_per_week}-dias"]
                    )
                    
                    # Crear los días del plan
                    self.create_plan_days(plan, days_per_week, is_equipment, goal, difficulty)
                    
                    self.stdout.write(self.style.SUCCESS(f'  ✓ {plan_name}'))
    
    def create_plan_days(self, plan, days_per_week, is_equipment, goal, difficulty):
        """Crear los días del plan con ejercicios"""
        
        for day_num in range(1, days_per_week + 1):
            day = WorkoutPlanDay.objects.create(
                plan=plan,
                day_name=f"Día {day_num}",
                day_number=day_num,
                is_rest_day=False,
                notes=f"Día {day_num} del plan {plan.name}",
                order_index=day_num
            )
            
            # Obtener ejercicios según el patrón del día
            exercises = self.get_exercises_for_day(day_num, days_per_week, is_equipment, goal, difficulty)
            
            # Agregar los ejercicios al día
            for i, ex_data in enumerate(exercises):
                ex_name, sets, reps, rest = ex_data
                ex = Exercise.objects.filter(name__icontains=ex_name).first()
                
                if ex:
                    WorkoutPlanExercise.objects.create(
                        workout_day=day,
                        exercise=ex,
                        sets=sets,
                        reps=reps,
                        rest_time=rest,
                        notes=f"",
                        order_index=i+1
                    )
    
    def get_exercises_for_day(self, day_num, total_days, is_equipment, goal, difficulty):
        """Obtener ejercicios según el día, objetivo y nivel"""
        
        # Determinar intensidad según dificultad
        sets_base = {'beginner': 2, 'intermediate': 3, 'advanced': 4}[difficulty]
        reps_base = {'beginner': 15, 'intermediate': 12, 'advanced': 8}[difficulty]
        
        # Determinar qué tipo de entrenamiento es según el día
        def get_exercise_name(ex_casa, ex_gimnasio):
            return ex_gimnasio if is_equipment else ex_casa
        
        # Si es 1 día, entrenamiento completo del cuerpo
        if total_days == 1:
            return [
                (get_exercise_name("Sentadillas", "Sentadillas con Barra"), sets_base, str(reps_base), 90),
                (get_exercise_name("Flexiones", "Press de Banca"), sets_base, str(reps_base), 90),
                (get_exercise_name("Remo con Mancuernas", "Remo con Barra"), sets_base, str(reps_base), 90),
                ("Press Militar", sets_base, str(reps_base), 90),
                ("Plancha", 1, "45 segundos", 60),
            ]
        
        # Si es 2 días
        elif total_days == 2:
            if day_num == 1:
                # Cuerpo completo A
                return [
                    (get_exercise_name("Sentadillas", "Sentadillas con Barra"), sets_base + 1, "20", 90),
                    (get_exercise_name("Flexiones", "Press de Banca"), sets_base, str(reps_base), 90),
                    ("Zancadas", sets_base, "12 por pierna", 90),
                ]
            else:  # day 2
                # Cuerpo completo B
                return [
                    ("Peso Muerto Rumano", sets_base, str(reps_base), 90),
                    ("Dominadas", sets_base, "10", 120),
                    ("Remo con Mancuernas", sets_base, str(reps_base), 90),
                    ("Mountain Climbers", sets_base, "20", 60),
                ]
        
        # Si es 3 días - Push, Pull, Legs
        elif total_days == 3:
            day_type = ((day_num - 1) % 3) + 1
            
            if day_type == 1:  # Push
                return [
                    (get_exercise_name("Flexiones", "Press de Banca"), sets_base, str(reps_base), 90),
                    (get_exercise_name("Flexiones Inclinadas", "Press Inclinado"), sets_base - 1, str(reps_base), 90),
                    (get_exercise_name("Dips en Banco", "Fondos en Paralelas"), sets_base - 1, "10", 90),
                    ("Extensiones de Tríceps", sets_base - 1, str(reps_base), 60),
                ]
            elif day_type == 2:  # Pull
                return [
                    ("Dominadas", sets_base, "8", 120),
                    (get_exercise_name("Remo con Mancuernas", "Remo con Barra"), sets_base, str(reps_base), 90),
                    (get_exercise_name("Curl con Mancuernas", "Curl con Barra"), sets_base - 1, str(reps_base), 60),
                    ("Plancha Lateral", 2, "30 segundos por lado", 60),
                ]
            else:  # Legs
                return [
                    (get_exercise_name("Sentadillas", "Sentadillas con Barra"), sets_base + 1, str(reps_base), 120),
                    ("Peso Muerto Rumano", sets_base, str(reps_base), 120),
                    (get_exercise_name("Zancadas", "Prensa de Piernas"), sets_base - 1, "12 por pierna", 90),
                    ("Elevación de Talones", sets_base, "15", 60),
                ]
        
        # Si es 4 días - Push, Pull, Legs, Core
        elif total_days == 4:
            if day_num == 1:  # Push
                return [
                    (get_exercise_name("Flexiones", "Press de Banca"), sets_base + 1, str(reps_base - 2), 120),
                    (get_exercise_name("Flexiones Inclinadas", "Press Inclinado"), sets_base, str(reps_base), 120),
                    (get_exercise_name("Dips en Banco", "Fondos en Paralelas"), sets_base - 1, str(reps_base), 90),
                    ("Press Militar", sets_base, str(reps_base), 90),
                ]
            elif day_num == 2:  # Pull
                return [
                    ("Dominadas", sets_base + 1, "8", 120),
                    (get_exercise_name("Remo con Mancuernas", "Remo con Barra"), sets_base, str(reps_base), 90),
                    (get_exercise_name("Curl con Mancuernas", "Curl con Barra"), sets_base - 1, str(reps_base), 60),
                    ("Plancha Lateral", 3, "30 segundos por lado", 60),
                ]
            elif day_num == 3:  # Legs
                return [
                    (get_exercise_name("Sentadillas", "Sentadillas con Barra"), sets_base + 2, str(reps_base - 4), 150),
                    ("Peso Muerto Rumano", sets_base, str(reps_base - 4), 120),
                    (get_exercise_name("Zancadas Andando", "Prensa de Piernas"), sets_base, str(reps_base), 90),
                    ("Elevación de Gemelos de Pie", sets_base, "15", 60),
                ]
            else:  # Core/Cardio
                if goal == 'weight_loss':
                    return [
                        ("Burpees", sets_base, "15", 90),
                        ("Jump Squats", sets_base - 1, "15", 60),
                        ("Mountain Climbers", sets_base, "20 por lado", 60),
                        ("High Knees", sets_base - 1, "30 segundos", 45),
                    ]
                else:
                    return [
                        ("Plancha", 3, "60 segundos", 90),
                        ("Mountain Climbers", sets_base, "15 por lado", 60),
                        ("Russian Twist", sets_base, "20", 45),
                        ("V-Ups", sets_base - 1, "15", 45),
                    ]
        
        # Si es 5 días - Push, Pull, Legs, Push, Pull (PPL avanzado)
        elif total_days == 5:
            day_pattern = ((day_num - 1) % 5) + 1
            
            if day_pattern in [1, 4]:  # Push (Pe cho y hombros)
                return [
                    (get_exercise_name("Flexiones", "Press de Banca"), sets_base + 1, str(reps_base - 4), 150),
                    (get_exercise_name("Flexiones Inclinadas", "Press Inclinado"), sets_base, str(reps_base - 2), 120),
                    ("Press Militar", sets_base, str(reps_base - 2), 120),
                    (get_exercise_name("Dips en Banco", "Fondos en Paralelas"), sets_base - 1, str(reps_base - 2), 90),
                ]
            elif day_pattern in [2, 5]:  # Pull (Espalda y bíceps)
                return [
                    ("Dominadas", sets_base + 1, "8", 150),
                    (get_exercise_name("Remo con Mancuernas", "Remo con Barra"), sets_base, str(reps_base - 2), 120),
                    (get_exercise_name("Curl con Mancuernas", "Curl con Barra"), sets_base, str(reps_base - 2), 60),
                    ("Curl Martillo", sets_base - 1, str(reps_base), 60),
                ]
            else:  # Legs (Piernas completo)
                return [
                    (get_exercise_name("Sentadillas", "Sentadillas con Barra"), sets_base + 2, str(reps_base - 4), 180),
                    ("Sentadillas Frontales" if is_equipment else "Sentadillas", sets_base, str(reps_base - 4), 150),
                    ("Peso Muerto Rumano", sets_base, str(reps_base - 2), 120),
                    ("Prensa de Piernas" if is_equipment else "Zancadas", sets_base, str(reps_base), 90),
                    ("Elevación de Gemelos de Pie", sets_base, "15", 60),
                ]
        
        # Si es 6 días
        elif total_days == 6:
            if goal == 'weight_loss':
                # Cardio/HIIT intenso todos los días
                return [
                    ("Burpees", sets_base + 1, "15", 90),
                    ("Jump Squats", sets_base, "15", 60),
                    ("Mountain Climbers", sets_base, "20 por lado", 60),
                    ("High Knees", sets_base, "30 segundos", 45),
                    ("Jumping Jacks", sets_base - 1, "30 segundos", 45),
                ]
            else:
                # Entrenamiento de fuerza 6 días
                day_type = ((day_num - 1) % 6) + 1
                
                if day_type <= 3:
                    return [
                        (get_exercise_name("Flexiones", "Press de Banca"), sets_base + 1, str(reps_base - 2), 120),
                        (get_exercise_name("Remo con Mancuernas", "Remo con Barra"), sets_base, str(reps_base - 2), 90),
                        (get_exercise_name("Sentadillas", "Sentadillas con Barra"), sets_base + 1, str(reps_base - 2), 120),
                    ]
                else:
                    return [
                        ("Press Militar", sets_base, str(reps_base - 2), 120),
                        ("Dominadas", sets_base + 1, "8", 180),
                        ("Peso Muerto Rumano", sets_base + 1, str(reps_base - 2), 180),
                    ]
        
        # Si es 7 días (entrenamiento todos los días)
        else:  # total_days == 7
            day_type = ((day_num - 1) % 7) + 1
            
            if day_type <= 3:
                return [
                    (get_exercise_name("Sentadillas", "Sentadillas con Barra"), sets_base, str(reps_base + 5), 90),
                    (get_exercise_name("Flexiones", "Press de Banca"), sets_base, str(reps_base + 5), 90),
                    ("Remo con Mancuernas", sets_base - 1, str(reps_base + 5), 60),
                ]
            else:
                return [
                    ("Dominadas", sets_base, "10", 120),
                    ("Plancha", 3, "60 segundos", 60),
                    ("Mountain Climbers", sets_base, "15 por lado", 45),
                ]
    
    def get_duration_weeks(self, goal, difficulty):
        """Determinar duración según objetivo y dificultad"""
        if goal == 'weight_loss':
            return 8 if difficulty == 'beginner' else 12 if difficulty == 'intermediate' else 8
        elif goal == 'muscle_gain':
            return 8 if difficulty == 'beginner' else 12 if difficulty == 'intermediate' else 10
        else:  # body_recomposition
            return 10 if difficulty == 'beginner' else 12 if difficulty == 'intermediate' else 14



