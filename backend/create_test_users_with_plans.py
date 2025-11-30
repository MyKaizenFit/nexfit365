#!/usr/bin/env python
"""
Script para crear planes nutricionales básicos, configuraciones de planes,
y 3 usuarios de prueba con diferentes perfiles y planes asignados automáticamente.
"""
import os
import sys
import django
from datetime import date, timedelta

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.models import CustomUser, DefaultPlanConfiguration
from nutrition.models import DefaultNutritionPlan, DefaultMeal
from workouts.models import DefaultWorkoutProgram, WorkoutPlanTemplate
from accounts.services import DefaultPlanAssignmentService
from django.utils import timezone

def create_basic_nutrition_plans():
    """Crear planes nutricionales básicos para pruebas"""
    print("\n🍽️  Creando planes nutricionales básicos...")
    
    plans_data = [
        {
            'name': 'Plan Básico - Pérdida de Peso',
            'description': 'Plan de nutrición básico enfocado en la pérdida de peso con comidas balanceadas y control calórico.',
            'min_role_required': 'basic',
            'daily_calories': 1500,
            'protein_percentage': 30.0,
            'carbs_percentage': 40.0,
            'fat_percentage': 30.0,
            'duration_weeks': 4,
            'target_audience': 'Pérdida de peso',
            'tags': ['pérdida de peso', 'básico', 'balanceado'],
            'is_active': True,
            'is_default': True
        },
        {
            'name': 'Plan Moderado - Pérdida de Peso',
            'description': 'Plan de nutrición moderado para pérdida de peso con nivel de actividad moderado.',
            'min_role_required': 'basic',
            'daily_calories': 1800,
            'protein_percentage': 30.0,
            'carbs_percentage': 40.0,
            'fat_percentage': 30.0,
            'duration_weeks': 4,
            'target_audience': 'Pérdida de peso',
            'tags': ['pérdida de peso', 'moderado'],
            'is_active': True,
            'is_default': False
        },
        {
            'name': 'Plan Pro - Ganancia Muscular',
            'description': 'Plan de nutrición profesional para ganancia de masa muscular con alto contenido proteico.',
            'min_role_required': 'basic',
            'daily_calories': 2500,
            'protein_percentage': 35.0,
            'carbs_percentage': 45.0,
            'fat_percentage': 20.0,
            'duration_weeks': 8,
            'target_audience': 'Ganancia muscular',
            'tags': ['ganancia muscular', 'proteína', 'pro'],
            'is_active': True,
            'is_default': False
        },
        {
            'name': 'Plan Premium - Mantenimiento',
            'description': 'Plan de nutrición premium para mantenimiento del peso con comidas gourmet y balance nutricional óptimo.',
            'min_role_required': 'basic',
            'daily_calories': 2000,
            'protein_percentage': 25.0,
            'carbs_percentage': 50.0,
            'fat_percentage': 25.0,
            'duration_weeks': 4,
            'target_audience': 'Mantenimiento',
            'tags': ['mantenimiento', 'premium', 'gourmet'],
            'is_active': True,
            'is_default': False
        },
        {
            'name': 'Plan Activo - Recomposición Corporal',
            'description': 'Plan de nutrición para recomposición corporal con nivel de actividad activo.',
            'min_role_required': 'basic',
            'daily_calories': 2200,
            'protein_percentage': 30.0,
            'carbs_percentage': 45.0,
            'fat_percentage': 25.0,
            'duration_weeks': 6,
            'target_audience': 'Recomposición corporal',
            'tags': ['recomposición', 'activo'],
            'is_active': True,
            'is_default': False
        }
    ]
    
    created_plans = {}
    for plan_data in plans_data:
        plan, created = DefaultNutritionPlan.objects.get_or_create(
            name=plan_data['name'],
            defaults=plan_data
        )
        if created:
            print(f"  ✅ Creado: {plan.name}")
        else:
            print(f"  ⏭️  Ya existe: {plan.name}")
        created_plans[plan_data['name']] = plan
    
    return created_plans

def create_default_meals_for_plans(plans):
    """Crear comidas por defecto para los planes"""
    print("\n🍴 Creando comidas por defecto...")
    
    from datetime import time
    
    meals_data = [
        {'name': 'Desayuno', 'time': time(8, 0), 'calories': 400, 'protein': 30, 'carbs': 50, 'fat': 10},
        {'name': 'Snack Mañana', 'time': time(11, 0), 'calories': 150, 'protein': 10, 'carbs': 20, 'fat': 5},
        {'name': 'Almuerzo', 'time': time(14, 0), 'calories': 500, 'protein': 40, 'carbs': 60, 'fat': 15},
        {'name': 'Snack Tarde', 'time': time(17, 0), 'calories': 150, 'protein': 10, 'carbs': 20, 'fat': 5},
        {'name': 'Cena', 'time': time(20, 0), 'calories': 400, 'protein': 30, 'carbs': 50, 'fat': 10},
    ]
    
    for plan_name, plan in plans.items():
        # Ajustar calorías según el plan
        total_calories = plan.daily_calories
        meal_percentages = [0.25, 0.10, 0.30, 0.10, 0.25]  # Desayuno, Snack, Almuerzo, Snack, Cena
        
        for i, meal_template in enumerate(meals_data):
            meal_calories = int(total_calories * meal_percentages[i])
            meal_protein = (plan.protein_percentage / 100) * meal_calories / 4  # 4 cal/g proteína
            meal_carbs = (plan.carbs_percentage / 100) * meal_calories / 4  # 4 cal/g carbohidratos
            meal_fat = (plan.fat_percentage / 100) * meal_calories / 9  # 9 cal/g grasa
            
            meal, created = DefaultMeal.objects.get_or_create(
                plan=plan,
                name=meal_template['name'],
                defaults={
                    'time': meal_template['time'],
                    'calories': meal_calories,
                    'protein': round(meal_protein, 1),
                    'carbs': round(meal_carbs, 1),
                    'fat': round(meal_fat, 1),
                    'description': f"{meal_template['name']} del plan {plan.name}",
                    'order_index': i + 1
                }
            )
            if created:
                print(f"  ✅ Creada comida: {meal.name} para {plan.name}")
    
    print("  ✅ Comidas por defecto creadas\n")

def create_plan_configurations(plans):
    """Crear configuraciones de planes por defecto"""
    print("⚙️  Creando configuraciones de planes por defecto...")
    
    # Obtener o crear un admin para created_by
    admin = CustomUser.objects.filter(is_superuser=True).first()
    if not admin:
        admin = CustomUser.objects.first()
    
    configurations_data = [
        {
            'name': 'Pérdida de Peso - Sedentario',
            'description': 'Para usuarios que buscan perder peso con nivel de actividad sedentario',
            'priority': 10,
            'main_goal': 'lose_weight',
            'activity_level': 'sedentary',
            'default_nutrition_plan': plans.get('Plan Básico - Pérdida de Peso'),
        },
        {
            'name': 'Pérdida de Peso - Moderado',
            'description': 'Para usuarios que buscan perder peso con nivel de actividad moderado',
            'priority': 20,
            'main_goal': 'lose_weight',
            'activity_level': 'moderate',
            'default_nutrition_plan': plans.get('Plan Moderado - Pérdida de Peso'),
        },
        {
            'name': 'Ganancia Muscular - Moderado',
            'description': 'Para usuarios que buscan ganar músculo con nivel de actividad moderado',
            'priority': 30,
            'main_goal': 'gain_muscle',
            'activity_level': 'moderate',
            'default_nutrition_plan': plans.get('Plan Pro - Ganancia Muscular'),
        },
        {
            'name': 'Ganancia Muscular - Activo',
            'description': 'Para usuarios que buscan ganar músculo con nivel de actividad activo',
            'priority': 40,
            'main_goal': 'gain_muscle',
            'activity_level': 'active',
            'default_nutrition_plan': plans.get('Plan Pro - Ganancia Muscular'),
        },
        {
            'name': 'Recomposición Corporal - Activo',
            'description': 'Para usuarios que buscan recomposición corporal con nivel de actividad activo',
            'priority': 50,
            'main_goal': 'body_recomposition',
            'activity_level': 'active',
            'default_nutrition_plan': plans.get('Plan Activo - Recomposición Corporal'),
        },
        {
            'name': 'Mantenimiento - General',
            'description': 'Para usuarios que buscan mantenimiento con cualquier nivel de actividad',
            'priority': 100,
            'main_goal': 'body_recomposition',
            'activity_level': '',  # Cualquier nivel
            'default_nutrition_plan': plans.get('Plan Premium - Mantenimiento'),
        },
    ]
    
    created_configs = {}
    for config_data in configurations_data:
        # Si activity_level está vacío, no filtrar por él
        if not config_data.get('activity_level'):
            config_data.pop('activity_level', None)
        
        config, created = DefaultPlanConfiguration.objects.get_or_create(
            name=config_data['name'],
            defaults={
                **config_data,
                'created_by': admin,
                'is_active': True
            }
        )
        if created:
            print(f"  ✅ Creada configuración: {config.name}")
        else:
            # Actualizar si ya existe
            for key, value in config_data.items():
                if key != 'name':
                    setattr(config, key, value)
            config.save()
            print(f"  🔄 Actualizada configuración: {config.name}")
        created_configs[config_data['name']] = config
    
    print("  ✅ Configuraciones creadas\n")
    return created_configs

def create_test_users():
    """Crear 3 usuarios de prueba con diferentes perfiles"""
    print("👥 Creando usuarios de prueba...")
    
    users_data = [
        {
            'email': 'usuario1@test.com',
            'password': 'Test1234!',
            'first_name': 'María',
            'last_name': 'García',
            'birth_date': date(1995, 5, 15),
            'gender': 'female',
            'height': 165.0,
            'weight': 75.0,
            'target_weight': 65.0,
            'main_goal': 'lose_weight',
            'activity_level': 'sedentary',
            'training_days_per_week': 3,
            'training_days': [1, 3, 5],  # Lunes, Miércoles, Viernes
            'training_location': 'home',
            'dietary_restrictions': [],
            'allergies': [],
            'medical_conditions': [],
        },
        {
            'email': 'usuario2@test.com',
            'password': 'Test1234!',
            'first_name': 'Carlos',
            'last_name': 'Rodríguez',
            'birth_date': date(1990, 8, 20),
            'gender': 'male',
            'height': 180.0,
            'weight': 70.0,
            'target_weight': 80.0,
            'main_goal': 'gain_muscle',
            'activity_level': 'moderate',
            'training_days_per_week': 4,
            'training_days': [1, 2, 4, 6],  # Lunes, Martes, Jueves, Sábado
            'training_location': 'gym',
            'dietary_restrictions': [],
            'allergies': [],
            'medical_conditions': [],
        },
        {
            'email': 'usuario3@test.com',
            'password': 'Test1234!',
            'first_name': 'Ana',
            'last_name': 'Martínez',
            'birth_date': date(1992, 3, 10),
            'gender': 'female',
            'height': 170.0,
            'weight': 65.0,
            'target_weight': 65.0,
            'main_goal': 'body_recomposition',
            'activity_level': 'active',
            'training_days_per_week': 5,
            'training_days': [1, 2, 3, 5, 6],  # Lunes a Miércoles, Viernes, Sábado
            'training_location': 'gym',
            'dietary_restrictions': [],
            'allergies': [],
            'medical_conditions': [],
        },
    ]
    
    created_users = []
    for user_data in users_data:
        password = user_data.pop('password')
        
        # Verificar si el usuario ya existe
        user, created = CustomUser.objects.get_or_create(
            email=user_data['email'],
            defaults=user_data
        )
        
        if created:
            user.set_password(password)
            user.save()
            print(f"  ✅ Creado usuario: {user.email} ({user.get_full_name()})")
        else:
            # Actualizar datos si ya existe
            for key, value in user_data.items():
                setattr(user, key, value)
            user.set_password(password)
            user.save()
            print(f"  🔄 Actualizado usuario: {user.email} ({user.get_full_name()})")
        
        created_users.append((user, password))
    
    print("  ✅ Usuarios creados\n")
    return created_users

def assign_plans_to_users(users):
    """Asignar planes automáticamente a los usuarios"""
    print("📋 Asignando planes automáticamente a usuarios...")
    
    for user, password in users:
        try:
            assignment_service = DefaultPlanAssignmentService(user)
            result = assignment_service.assign()
            
            if result.configuration:
                print(f"\n  👤 Usuario: {user.email} ({user.get_full_name()})")
                print(f"     📊 Configuración: {result.configuration.name}")
                
                if result.nutrition_plan:
                    print(f"     🍽️  Plan nutricional: {result.nutrition_plan.name}")
                else:
                    print(f"     ⚠️  No se asignó plan nutricional")
                
                if result.workout_program:
                    print(f"     🏋️  Plan de entrenamiento: {result.workout_program.name}")
                else:
                    print(f"     ⚠️  No se asignó plan de entrenamiento")
            else:
                print(f"  ⚠️  Usuario {user.email}: No se encontró configuración que coincida")
        except Exception as e:
            print(f"  ❌ Error asignando planes a {user.email}: {str(e)}")
    
    print("\n  ✅ Asignación de planes completada\n")

def main():
    print("=" * 60)
    print("🚀 CREANDO DATOS DE PRUEBA PARA MYKAIZENFIT")
    print("=" * 60)
    
    # 1. Crear planes nutricionales básicos
    plans = create_basic_nutrition_plans()
    
    # 2. Crear comidas por defecto
    create_default_meals_for_plans(plans)
    
    # 3. Crear configuraciones de planes
    configs = create_plan_configurations(plans)
    
    # 4. Crear usuarios de prueba
    users = create_test_users()
    
    # 5. Asignar planes automáticamente
    assign_plans_to_users(users)
    
    # 6. Mostrar resumen
    print("=" * 60)
    print("✅ PROCESO COMPLETADO")
    print("=" * 60)
    print("\n📊 RESUMEN:")
    print(f"  • Planes nutricionales creados: {len(plans)}")
    print(f"  • Configuraciones creadas: {len(configs)}")
    print(f"  • Usuarios de prueba creados: {len(users)}")
    print("\n🔑 CREDENCIALES DE USUARIOS DE PRUEBA:")
    print("  " + "-" * 56)
    for user, password in users:
        print(f"  📧 Email: {user.email}")
        print(f"  🔒 Contraseña: {password}")
        print(f"  👤 Nombre: {user.get_full_name()}")
        print(f"  🎯 Objetivo: {user.get_main_goal_display() if hasattr(user, 'get_main_goal_display') else user.main_goal}")
        print(f"  📊 Nivel de actividad: {user.get_activity_level_display() if hasattr(user, 'get_activity_level_display') else user.activity_level}")
        print(f"  📅 Días de entrenamiento: {user.training_days_per_week} días/semana")
        print("  " + "-" * 56)
    
    print("\n💡 NOTA: Los planes se asignaron automáticamente según el perfil de cada usuario.")
    print("   Los administradores pueden modificar estos planes desde el panel de administración.\n")

if __name__ == '__main__':
    main()

