#!/usr/bin/env python
"""
Script para actualizar perfiles de usuario con datos reales y coherentes
"""
import os
import sys
import django
from datetime import date, datetime, timedelta
from decimal import Decimal

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.models import CustomUser
from nutrition.models import NutritionPlan
from workouts.models import WorkoutProgram

def calculate_age(birth_date):
    """Calcular edad a partir de fecha de nacimiento"""
    today = date.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))

def update_user_profile(email, profile_data):
    """Actualizar perfil de usuario con datos proporcionados"""
    try:
        user = CustomUser.objects.get(email=email)
        
        # Actualizar datos básicos
        for field, value in profile_data.items():
            if hasattr(user, field) and value is not None:
                setattr(user, field, value)
        
        user.save()
        print(f"✅ Actualizado perfil de {email}")
        return user
    except CustomUser.DoesNotExist:
        print(f"❌ Usuario {email} no encontrado")
        return None
    except Exception as e:
        print(f"❌ Error actualizando {email}: {e}")
        return None

def assign_nutrition_plan(user, goal):
    """Asignar plan nutricional adecuado según objetivo"""
    try:
        # Mapeo de objetivos a planes
        goal_to_plan = {
            'lose_weight': 'Plan Pérdida de Peso - Déficit Calórico',
            'gain_muscle': 'Plan Ganancia Muscular - Superávit',
            'body_recomposition': 'Plan Recomposición Corporal',
            'maintain': 'Plan Mantenimiento - Equilibrado',
        }
        
        plan_name = goal_to_plan.get(goal, 'Plan Mantenimiento - Equilibrado')
        template_plan = NutritionPlan.objects.filter(name=plan_name, is_template=True).first()
        
        if template_plan:
            # Crear plan personalizado para el usuario
            user_plan = NutritionPlan.objects.create(
                user=user,
                name=f"{template_plan.name} - {user.first_name}",
                description=template_plan.description,
                daily_calories=template_plan.daily_calories,
                protein_grams=template_plan.protein_grams,
                carbs_grams=template_plan.carbs_grams,
                fat_grams=template_plan.fat_grams,
                fiber_grams=template_plan.fiber_grams,
                goal=template_plan.goal,
                diet_type=template_plan.diet_type,
                meals_per_day=template_plan.meals_per_day,
                duration_weeks=template_plan.duration_weeks,
                is_template=False,
                is_system=False,
                is_active=True,
                start_date=date.today(),
                end_date=date.today() + timedelta(weeks=template_plan.duration_weeks),
                tags=template_plan.tags,
                created_by=user
            )
            print(f"  ✅ Plan nutricional asignado: {plan_name}")
            return user_plan
    except Exception as e:
        print(f"  ⚠️  Error asignando plan nutricional: {e}")
    return None

def assign_workout_program(user, goal, difficulty='intermediate'):
    """Asignar programa de entrenamiento adecuado"""
    try:
        # Mapeo de objetivos a programas
        goal_to_program = {
            'lose_weight': 'Plan Definición - Pérdida de Grasa',
            'gain_muscle': 'Plan Full Body - 4 días',
            'body_recomposition': 'Plan Glúteos Intensivo',
            'maintain': 'Plan Principiante - Full Body',
            'strength': 'Plan Fuerza Básica',
        }
        
        program_name = goal_to_program.get(goal, 'Plan Principiante - Full Body')
        template_program = WorkoutProgram.objects.filter(name=program_name).first()
        
        if template_program:
            # En este caso, simplemente asociamos el programa existente
            # (depende de cómo esté implementado en tu modelo)
            print(f"  ✅ Programa de entrenamiento sugerido: {program_name}")
            return template_program
    except Exception as e:
        print(f"  ⚠️  Error asignando programa de entrenamiento: {e}")
    return None

def main():
    """Actualizar todos los perfiles de usuario"""
    print("🔄 Iniciando actualización de perfiles de usuario...\n")
    
    # Definir datos realistas para cada usuario
    users_to_update = [
        {
            'email': 'admin@nexfit365.com',
            'data': {
                'birth_date': date(1990, 1, 15),
                'gender': 'male',
                'height': 178,
                'weight': 82,
                'target_weight': 75,
                'activity_level': 'very_active',
                'training_days_per_week': 5,
                'training_days': ['monday', 'tuesday', 'wednesday', 'friday', 'saturday'],
                'training_location': 'gym',
                'main_goal': 'body_recomposition',
                'workout_preferences': ['strength', 'cardio'],
                'equipment_available': ['dumbbells', 'barbell', 'machines'],
            }
        },
        {
            'email': 'trainer@mykaizenfit.com',
            'data': {
                'birth_date': date(1988, 5, 20),
                'gender': 'male',
                'height': 180,
                'weight': 85,
                'target_weight': 83,
                'activity_level': 'very_active',
                'training_days_per_week': 6,
                'training_days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
                'training_location': 'gym',
                'main_goal': 'gain_muscle',
                'workout_preferences': ['strength', 'hypertrophy'],
                'equipment_available': ['dumbbells', 'barbell', 'machines', 'kettlebells'],
            }
        },
        {
            'email': 'raptoraitor32@gmail.com',
            'data': {
                'birth_date': date(1999, 9, 19),
                'target_weight': 75,
                'training_days_per_week': 4,
                'training_days': ['monday', 'wednesday', 'friday', 'saturday'],
                'training_location': 'gym',
                'workout_preferences': ['cardio', 'strength'],
                'equipment_available': ['dumbbells', 'machines'],
                'dietary_restrictions': [],
                'allergies': [],
            }
        },
        {
            'email': 'saraottum@gmail.com',
            'data': {
                'birth_date': date(2000, 1, 2),
                'target_weight': 60,
                'training_days_per_week': 4,
                'training_days': ['tuesday', 'thursday', 'saturday', 'sunday'],
                'training_location': 'gym',
                'workout_preferences': ['cardio', 'toning'],
                'equipment_available': ['dumbbells', 'machines', 'bodyweight'],
                'dietary_restrictions': [],
                'allergies': [],
            }
        },
        {
            'email': 'usuario@test.com',
            'data': {
                'birth_date': date(1995, 6, 15),
                'target_weight': 68,
                'training_days_per_week': 3,
                'training_days': ['monday', 'wednesday', 'friday'],
                'training_location': 'home',
                'workout_preferences': ['toning', 'flexibility'],
                'equipment_available': ['dumbbells', 'resistance_bands', 'bodyweight'],
                'dietary_restrictions': [],
                'allergies': [],
            }
        },
        {
            'email': 'admin@mykaizenfit.com',
            'data': {
                'birth_date': date(1990, 1, 1),
                'target_weight': 78,
                'training_days_per_week': 4,
                'training_days': ['monday', 'tuesday', 'thursday', 'saturday'],
                'training_location': 'gym',
                'workout_preferences': ['strength', 'hypertrophy'],
                'equipment_available': ['dumbbells', 'barbell', 'machines'],
                'dietary_restrictions': [],
                'allergies': [],
            }
        },
        {
            'email': 'test2@test.com',
            'data': {
                'birth_date': date(1992, 3, 10),
                'gender': 'male',
                'height': 175,
                'weight': 80,
                'target_weight': 75,
                'activity_level': 'moderate',
                'training_days_per_week': 3,
                'training_days': ['monday', 'wednesday', 'friday'],
                'training_location': 'gym',
                'main_goal': 'lose_weight',
                'workout_preferences': ['cardio', 'strength'],
                'equipment_available': ['dumbbells', 'machines'],
                'dietary_restrictions': [],
                'allergies': [],
            }
        },
    ]
    
    # Actualizar cada usuario
    updated_count = 0
    for user_info in users_to_update:
        print(f"\n📝 Actualizando {user_info['email']}...")
        user = update_user_profile(user_info['email'], user_info['data'])
        
        if user and user.main_goal:
            # Asignar plan nutricional
            assign_nutrition_plan(user, user.main_goal)
            
            # Asignar programa de entrenamiento
            assign_workout_program(user, user.main_goal)
            
            updated_count += 1
    
    print(f"\n✅ Actualización completada: {updated_count} perfiles actualizados")
    
    # Mostrar resumen
    print("\n📊 Resumen de usuarios:")
    users = CustomUser.objects.all().order_by('role', 'email')
    for user in users:
        age = calculate_age(user.birth_date) if user.birth_date else 'N/A'
        goal = user.main_goal or 'N/A'
        print(f"  - {user.email}: {user.first_name} {user.last_name}, {age} años, Objetivo: {goal}")

if __name__ == '__main__':
    main()


