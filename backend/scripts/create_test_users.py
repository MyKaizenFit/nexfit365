#!/usr/bin/env python3
"""
Script para crear usuarios de prueba con datos completos
"""
import os
import sys
import random
from datetime import datetime, timedelta
from decimal import Decimal

sys.path.insert(0, '/srv/mykaizenfit/pro/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from django.contrib.auth.hashers import make_password
from django.utils import timezone
from accounts.models import CustomUser
from workouts.models import Exercise, WorkoutProgram, WorkoutDay, WorkoutDayExercise, WorkoutLog, WorkoutLogExercise, WorkoutLogSet
from nutrition.models import Recipe, NutritionPlan, PlanMeal, MealLog
from progress.models import WeightEntry, BodyMeasurement, MoodEntry

print("=" * 60)
print("🔧 CREACIÓN DE USUARIOS DE PRUEBA")
print("=" * 60)
print()

# ============================================
# 1. CREAR USUARIO ADMINISTRADOR
# ============================================
print("👤 Creando usuario administrador...")

admin_email = "admin@mykaizenfit.com"
admin_password = "AdminNex-Fit123!"

# Eliminar si existe
CustomUser.objects.filter(email=admin_email).delete()

admin = CustomUser.objects.create(
    email=admin_email,
    password=make_password(admin_password),
    first_name="Admin",
    last_name="NexFit",
    is_staff=True,
    is_superuser=True,
    is_active=True,
    role='trainer',
    date_joined=timezone.now(),
)
print(f"   ✅ Admin creado: {admin_email}")
print(f"   🔑 Password: {admin_password}")
print()

# ============================================
# 2. CREAR USUARIO DE PRUEBA
# ============================================
print("👤 Creando usuario de prueba...")

test_email = "usuario@test.com"
test_password = "Test123!"

# Eliminar si existe
CustomUser.objects.filter(email=test_email).delete()

test_user = CustomUser.objects.create(
    email=test_email,
    password=make_password(test_password),
    first_name="María",
    last_name="García López",
    is_staff=False,
    is_superuser=False,
    is_active=True,
    role='basic',
    date_joined=timezone.now() - timedelta(days=30),
)
print(f"   ✅ Usuario creado: {test_email}")
print(f"   🔑 Password: {test_password}")
print()

# ============================================
# 3. CREAR PROGRAMA DE ENTRENAMIENTO
# ============================================
print("🏋️ Creando programa de entrenamiento...")

# Obtener ejercicios existentes
exercises = list(Exercise.objects.all()[:50])
if not exercises:
    print("   ⚠️ No hay ejercicios en la base de datos")
else:
    # Crear programa de 4 días
    program = WorkoutProgram.objects.create(
        name="Programa Fullbody 4 días",
        description="Programa de entrenamiento completo para principiantes/intermedios. 4 días por semana con descanso activo.",
        user=test_user,
        is_system=False,
        is_template=False,
        difficulty='intermediate',
        duration_weeks=8,
        days_per_week=4,
        goal='muscle_gain',
        is_active=True,
    )
    
    # Día 1: Tren Superior
    day1 = WorkoutDay.objects.create(
        program=program,
        name="Día 1 - Tren Superior (Empuje)",
        day_number=1,
        notes="Enfocado en pecho, hombros y tríceps"
    )
    
    # Día 2: Tren Inferior
    day2 = WorkoutDay.objects.create(
        program=program,
        name="Día 2 - Tren Inferior (Cuádriceps)",
        day_number=2,
        notes="Enfocado en cuádriceps y glúteos"
    )
    
    # Día 3: Tren Superior
    day3 = WorkoutDay.objects.create(
        program=program,
        name="Día 3 - Tren Superior (Tirón)",
        day_number=3,
        notes="Enfocado en espalda y bíceps"
    )
    
    # Día 4: Tren Inferior
    day4 = WorkoutDay.objects.create(
        program=program,
        name="Día 4 - Tren Inferior (Isquios/Glúteos)",
        day_number=4,
        notes="Enfocado en isquiotibiales y glúteos"
    )
    
    # Añadir ejercicios a cada día
    days_exercises = {
        day1: ['PRES', 'PRESS', 'PECHO', 'HOMBRO', 'TRICEPS'],
        day2: ['SENTADILLA', 'PRENSA', 'EXTENSION', 'CUADRICEPS'],
        day3: ['JALON', 'REMO', 'DOMINADA', 'BICEPS', 'CURL'],
        day4: ['PESO MUERTO', 'HIP THRUST', 'CURL FEMORAL', 'GLUTEO'],
    }
    
    for day, keywords in days_exercises.items():
        order = 1
        added = 0
        for ex in exercises:
            if added >= 5:
                break
            for kw in keywords:
                if kw.upper() in ex.name.upper():
                    WorkoutDayExercise.objects.create(
                        workout_day=day,
                        exercise=ex,
                        sets=4,
                        reps="8-12",
                        notes=f"Controlar el movimiento. RPE 7-8."
                    )
                    order += 1
                    added += 1
                    break
    
    print(f"   ✅ Programa creado: {program.name}")
    print(f"   📅 4 días de entrenamiento configurados")
    print()

# ============================================
# 4. CREAR REGISTROS DE ENTRENAMIENTO (últimos 30 días)
# ============================================
print("📊 Creando registros de entrenamiento...")

workout_logs_created = 0
if exercises:
    for days_ago in [28, 25, 21, 18, 14, 11, 7, 4, 1]:
        log_date = timezone.now() - timedelta(days=days_ago)
        
        log = WorkoutLog.objects.create(
            user=test_user,
            date=log_date.date(),
            duration_minutes=random.randint(50, 75),
            completed=True,
            rating=random.choice([7, 8, 9]),
        )
        
        # Añadir ejercicios al log
        for i, ex in enumerate(random.sample(exercises, min(5, len(exercises)))):
            log_ex = WorkoutLogExercise.objects.create(
                workout_log=log,
                exercise=ex,
                exercise_name=ex.name,
                order_index=i + 1,
                notes="Buenas sensaciones"
            )
            
            # Añadir sets
            for set_num in range(1, 5):
                WorkoutLogSet.objects.create(
                    log_exercise=log_ex,
                    set_number=set_num,
                    reps=random.randint(8, 12),
                    weight=Decimal(str(random.randint(20, 80))),
                    completed=True,
                )
        
        workout_logs_created += 1

print(f"   ✅ {workout_logs_created} entrenamientos registrados")
print()

# ============================================
# 5. CREAR PLAN DE NUTRICIÓN
# ============================================
print("🍽️ Creando plan de nutrición...")

recipes = list(Recipe.objects.all()[:20])
if not recipes:
    print("   ⚠️ No hay recetas en la base de datos")
else:
    nutrition_plan = NutritionPlan.objects.create(
        name="Plan Equilibrado - Ganancia Muscular",
        description="Plan nutricional diseñado para ganancia muscular con déficit calórico moderado",
        user=test_user,
        is_system=False,
        goal='muscle_gain',
        daily_calories=2200,
        protein_grams=165,  # 30%
        carbs_grams=248,    # 45%
        fat_grams=61,       # 25%
        meals_per_day=4,
        is_active=True,
    )
    
    # Crear comidas del plan
    meal_types = [
        ('breakfast', 'Desayuno', 7),
        ('snack', 'Media mañana', 10),
        ('lunch', 'Comida', 14),
        ('snack', 'Merienda', 17),
        ('dinner', 'Cena', 21),
    ]
    
    for meal_type, meal_name, hour in meal_types:
        meal = PlanMeal.objects.create(
            plan=nutrition_plan,
            name=meal_name,
            meal_type=meal_type,
            calories=nutrition_plan.daily_calories // 5,
            protein=nutrition_plan.protein_grams // 5,
            carbs=nutrition_plan.carbs_grams // 5,
            fat=nutrition_plan.fat_grams // 5,
        )
        
        # Añadir recetas sugeridas
        matching_recipes = [r for r in recipes if r.category == meal_type]
        if matching_recipes:
            meal.suggested_recipes.add(*matching_recipes[:3])
    
    print(f"   ✅ Plan creado: {nutrition_plan.name}")
    print(f"   🍳 5 comidas configuradas")
    print()

# ============================================
# 6. CREAR REGISTROS DE COMIDAS
# ============================================
print("📝 Creando registros de comidas...")

meal_logs_created = 0
if recipes:
    for days_ago in range(14, 0, -1):
        log_date = timezone.now() - timedelta(days=days_ago)
        
        # 3-4 comidas por día
        for meal_type in ['breakfast', 'lunch', 'dinner']:
            recipe = random.choice(recipes)
            
            MealLog.objects.create(
                user=test_user,
                date=log_date.date(),
                meal_type=meal_type,
                recipe=recipe,
                servings=Decimal('1.0'),
                calories=recipe.calories,
                protein=recipe.protein,
                carbs=recipe.carbs,
                fat=recipe.fat,
                notes="",
            )
            meal_logs_created += 1

print(f"   ✅ {meal_logs_created} comidas registradas")
print()

# ============================================
# 7. CREAR REGISTROS DE PESO
# ============================================
print("⚖️ Creando registros de peso...")

# Simular progreso de peso (pérdida gradual)
start_weight = 75.0
weight_logs_created = 0

for days_ago in range(30, 0, -2):
    log_date = timezone.now() - timedelta(days=days_ago)
    # Pérdida gradual con variaciones
    progress = (30 - days_ago) / 30
    weight = start_weight - (progress * 2) + random.uniform(-0.3, 0.3)
    
    WeightEntry.objects.create(
        user=test_user,
        date=log_date.date(),
        weight=Decimal(str(round(weight, 1))),
        notes="" if random.random() > 0.3 else "Después del entrenamiento",
    )
    weight_logs_created += 1

print(f"   ✅ {weight_logs_created} registros de peso")
print()

# ============================================
# 8. CREAR MEDIDAS CORPORALES
# ============================================
print("📐 Creando medidas corporales...")

body_measurements = [
    {'chest': 95, 'waist': 82, 'hips': 98, 'biceps': 32, 'thighs': 56},
    {'chest': 96, 'waist': 81, 'hips': 97, 'biceps': 33, 'thighs': 57},
    {'chest': 97, 'waist': 80, 'hips': 97, 'biceps': 33, 'thighs': 58},
]

for i, measures in enumerate(body_measurements):
    days_ago = (len(body_measurements) - i) * 10
    log_date = timezone.now() - timedelta(days=days_ago)
    
    BodyMeasurement.objects.create(
        user=test_user,
        date=log_date.date(),
        chest=Decimal(str(measures['chest'])),
        waist=Decimal(str(measures['waist'])),
        hips=Decimal(str(measures['hips'])),
        arms=Decimal(str(measures['biceps'])),
        thighs=Decimal(str(measures['thighs'])),
    )

print(f"   ✅ {len(body_measurements)} registros de medidas")
print()

# ============================================
# 9. CREAR REGISTROS DE ESTADO DE ÁNIMO
# ============================================
print("😊 Creando registros de ánimo...")

mood_logs_created = 0
for days_ago in range(14, 0, -1):
    log_date = timezone.now() - timedelta(days=days_ago)
    
    MoodEntry.objects.create(
        user=test_user,
        date=log_date.date(),
        mood_score=random.randint(3, 5),
        energy_level=random.randint(3, 5),
        stress_level=random.randint(1, 3),
    )
    mood_logs_created += 1

print(f"   ✅ {mood_logs_created} registros de ánimo")
print()

# ============================================
# RESUMEN FINAL
# ============================================
print("=" * 60)
print("✅ USUARIOS CREADOS EXITOSAMENTE")
print("=" * 60)
print()
print("👤 ADMINISTRADOR:")
print(f"   Email: {admin_email}")
print(f"   Password: {admin_password}")
print(f"   Rol: Administrador/Trainer")
print()
print("👤 USUARIO DE PRUEBA:")
print(f"   Email: {test_email}")
print(f"   Password: {test_password}")
print(f"   Nombre: María García López")
print(f"   Rol: Usuario básico")
print()
print("📊 DATOS DEL USUARIO DE PRUEBA:")
print(f"   - Programa de entrenamiento activo")
print(f"   - {workout_logs_created} entrenamientos registrados")
print(f"   - Plan de nutrición activo")
print(f"   - {meal_logs_created} comidas registradas")
print(f"   - {weight_logs_created} registros de peso")
print(f"   - {len(body_measurements)} medidas corporales")
print(f"   - {mood_logs_created} registros de ánimo")
print()

