#!/usr/bin/env python
"""
Script para actualizar planes de menús con recetas reales
"""
import os
import sys
import django
import random

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from nutrition.models import NutritionPlan, PlanMeal, Recipe

def assign_recipes_to_meal(meal, meal_type, num_recipes=3):
    """Asignar recetas sugeridas a una comida"""
    
    # Mapeo de tipo de comida a meal_types de recetas
    meal_type_mapping = {
        'Desayuno': ['breakfast'],
        'Media Mañana': ['snack', 'breakfast'],
        'Almuerzo': ['lunch'],
        'Comida': ['lunch'],
        'Merienda': ['snack', 'dessert'],
        'Cena': ['dinner'],
        'Post-Entreno': ['post_workout', 'lunch'],
    }
    
    # Obtener meal_types para buscar
    search_meal_types = meal_type_mapping.get(meal_type, ['lunch'])
    
    # Buscar recetas apropiadas
    suitable_recipes = Recipe.objects.filter(
        is_active=True,
        meal_types__overlap=search_meal_types
    )
    
    # Si no hay suficientes, buscar por categoría
    if suitable_recipes.count() < num_recipes:
        if meal_type in ['Desayuno', 'Media Mañana']:
            suitable_recipes = Recipe.objects.filter(is_active=True, category__in=['breakfast', 'snack'])
        elif meal_type in ['Comida', 'Almuerzo']:
            suitable_recipes = Recipe.objects.filter(is_active=True, category='lunch')
        elif meal_type in ['Cena']:
            suitable_recipes = Recipe.objects.filter(is_active=True, category='dinner')
        else:
            suitable_recipes = Recipe.objects.filter(is_active=True)
    
    # Seleccionar recetas aleatorias
    if suitable_recipes.count() > 0:
        selected_count = min(num_recipes, suitable_recipes.count())
        selected_recipes = random.sample(list(suitable_recipes), selected_count)
        
        # Limpiar recetas existentes
        meal.suggested_recipes.clear()
        
        # Asignar nuevas recetas
        for recipe in selected_recipes:
            meal.suggested_recipes.add(recipe)
        
        return len(selected_recipes)
    
    return 0

def update_plan_with_recipes(plan):
    """Actualizar un plan con recetas en sus comidas"""
    print(f"\n📋 Actualizando: {plan.name}")
    print(f"   Objetivo: {plan.goal} | Calorías: {plan.daily_calories} kcal")
    
    meals = plan.meals.all().order_by('order_index')
    
    if not meals:
        print("   ⚠️  Plan sin comidas definidas")
        return 0
    
    total_recipes = 0
    
    for meal in meals:
        # Usar meal.name o meal.meal_type como identificador
        meal_identifier = meal.name if hasattr(meal, 'name') and meal.name else meal.meal_type
        num_assigned = assign_recipes_to_meal(meal, meal_identifier, num_recipes=5)
        total_recipes += num_assigned
        print(f"   ✅ {meal_identifier}: {num_assigned} recetas")
    
    return total_recipes

def main():
    print("=" * 70)
    print("🍽️  ACTUALIZANDO PLANES DE MENÚS CON RECETAS")
    print("=" * 70 + "\n")
    
    # Obtener todos los planes plantilla
    plans = NutritionPlan.objects.filter(is_template=True)
    
    print(f"📊 Planes plantilla encontrados: {plans.count()}")
    print(f"📚 Recetas disponibles: {Recipe.objects.filter(is_active=True).count()}\n")
    
    total_recipes_assigned = 0
    
    for plan in plans:
        recipes_assigned = update_plan_with_recipes(plan)
        total_recipes_assigned += recipes_assigned
    
    print(f"\n{'='*70}")
    print(f"✅ Proceso completado")
    print(f"   Total recetas asignadas: {total_recipes_assigned}")
    print(f"{'='*70}\n")
    
    # Mostrar resumen
    print("📊 Resumen por plan:")
    for plan in plans:
        meals_count = plan.meals.count()
        recipes_count = sum(meal.suggested_recipes.count() for meal in plan.meals.all())
        print(f"   • {plan.name}: {meals_count} comidas, {recipes_count} recetas sugeridas")

if __name__ == '__main__':
    main()

