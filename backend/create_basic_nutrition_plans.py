#!/usr/bin/env python
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from nutrition.models import DefaultNutritionPlan, Recipe

def create_basic_nutrition_plans():
    """Crear planes de nutrición básicos con los campos que realmente existen"""
    
    # Obtener todas las recetas disponibles
    recipes = Recipe.objects.all()
    
    # Solo usar los campos que realmente existen en la base de datos
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
            'name': 'Plan Pro - Ganancia Muscular',
            'description': 'Plan de nutrición profesional para ganancia de masa muscular con alto contenido proteico.',
            'min_role_required': 'pro',
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
            'min_role_required': 'premium',
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
            'name': 'Plan Vegetariano - Básico',
            'description': 'Plan de nutrición vegetariano básico con enfoque en proteínas vegetales y nutrientes esenciales.',
            'min_role_required': 'basic',
            'daily_calories': 1800,
            'protein_percentage': 20.0,
            'carbs_percentage': 55.0,
            'fat_percentage': 25.0,
            'duration_weeks': 4,
            'target_audience': 'Vegetarianos',
            'tags': ['vegetariano', 'básico', 'proteína vegetal'],
            'is_active': True,
            'is_default': False
        },
        {
            'name': 'Plan Deportivo - Alto Rendimiento',
            'description': 'Plan de nutrición para deportistas con alta demanda energética y recuperación optimizada.',
            'min_role_required': 'basic',
            'daily_calories': 3000,
            'protein_percentage': 25.0,
            'carbs_percentage': 55.0,
            'fat_percentage': 20.0,
            'duration_weeks': 8,
            'target_audience': 'Deportistas',
            'tags': ['deportivo', 'alto rendimiento', 'energía'],
            'is_active': True,
            'is_default': False
        }
    ]

    print("🍽️ Creando planes de nutrición básicos...")
    
    created_count = 0
    for plan_data in plans_data:
        # Verificar si el plan ya existe
        if not DefaultNutritionPlan.objects.filter(name=plan_data['name']).exists():
            try:
                DefaultNutritionPlan.objects.create(**plan_data)
                created_count += 1
                print(f"✅ Creado: {plan_data['name']}")
            except Exception as e:
                print(f"❌ Error creando {plan_data['name']}: {e}")
        else:
            print(f"⏭️  Ya existe: {plan_data['name']}")
    
    print(f"\n🎉 ¡Proceso completado! Se crearon {created_count} nuevos planes.")
    print(f"📊 Total de planes en la base de datos: {DefaultNutritionPlan.objects.count()}")
    
    # Mostrar resumen de recetas disponibles
    print(f"\n📋 Recetas disponibles por categoría:")
    categories = {}
    for recipe in recipes:
        if recipe.category not in categories:
            categories[recipe.category] = 0
        categories[recipe.category] += 1
    
    for category, count in categories.items():
        print(f"  • {category}: {count} recetas")
    
    print(f"\n🍳 Total de recetas disponibles: {len(recipes)}")
    print("\n💡 Puedes usar estas recetas para crear planes de menús personalizados en el dashboard de administración.")
    
    # Mostrar planes existentes
    print(f"\n📊 Planes de nutrición existentes:")
    for plan in DefaultNutritionPlan.objects.all():
        print(f"  • {plan.name} - {plan.daily_calories} cal/día - {'Activo' if plan.is_active else 'Inactivo'}")

if __name__ == '__main__':
    create_basic_nutrition_plans()














