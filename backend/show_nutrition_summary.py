#!/usr/bin/env python
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from nutrition.models import DefaultNutritionPlan, Recipe

def show_nutrition_summary():
    """Mostrar resumen completo de recetas y planes de nutrición"""
    
    print("🍽️ RESUMEN DEL SISTEMA DE NUTRICIÓN")
    print("=" * 50)
    
    # Recetas
    recipes = Recipe.objects.all()
    print(f"\n📋 RECETAS CREADAS ({len(recipes)} total):")
    print("-" * 30)
    
    categories = {}
    for recipe in recipes:
        if recipe.category not in categories:
            categories[recipe.category] = []
        categories[recipe.category].append(recipe)
    
    for category, recipe_list in categories.items():
        print(f"\n🍳 {category.upper()} ({len(recipe_list)} recetas):")
        for recipe in recipe_list:
            print(f"  • {recipe.name}")
            print(f"    - Dificultad: {recipe.get_difficulty_display()}")
            print(f"    - Tiempo: {recipe.prep_time_minutes} min")
            print(f"    - Porciones: {recipe.servings}")
            print(f"    - Calorías: {recipe.calories_per_serving} cal/porción")
            print(f"    - Ingredientes: {len(recipe.ingredients)}")
            if recipe.tags:
                print(f"    - Tags: {', '.join(recipe.tags)}")
            print()
    
    # Planes de nutrición
    plans = DefaultNutritionPlan.objects.all()
    print(f"\n📊 PLANES DE NUTRICIÓN ({len(plans)} total):")
    print("-" * 35)
    
    for plan in plans:
        print(f"• {plan.name}")
        print(f"  - Descripción: {plan.description[:100]}{'...' if len(plan.description) > 100 else ''}")
        print(f"  - Calorías diarias: {plan.daily_calories}")
        if hasattr(plan, 'target_macros') and plan.target_macros:
            print(f"  - Macronutrientes: {plan.target_macros}")
        print(f"  - Estado: {'Activo' if plan.is_active else 'Inactivo'}")
        print(f"  - Por defecto: {'Sí' if plan.is_default else 'No'}")
        print()
    
    # Estadísticas generales
    print("📈 ESTADÍSTICAS GENERALES:")
    print("-" * 25)
    print(f"• Total de recetas: {len(recipes)}")
    print(f"• Total de planes: {len(plans)}")
    print(f"• Planes activos: {len([p for p in plans if p.is_active])}")
    print(f"• Planes por defecto: {len([p for p in plans if p.is_default])}")
    
    # Categorías de recetas
    print(f"• Categorías de recetas: {len(categories)}")
    for category, recipe_list in categories.items():
        print(f"  - {category}: {len(recipe_list)} recetas")
    
    print(f"\n🎯 PRÓXIMOS PASOS:")
    print("-" * 15)
    print("1. Acceder al dashboard de administración: http://localhost:3000/admin")
    print("2. Ir a la sección 'Recetas' para gestionar las recetas creadas")
    print("3. Ir a la sección 'Planes de Menús' para crear planes personalizados")
    print("4. Usar las recetas existentes para asignar comidas a los planes")
    print("5. Probar las funcionalidades de crear, editar y eliminar")
    
    print(f"\n✨ ¡SISTEMA DE NUTRICIÓN LISTO PARA USAR!")
    print("=" * 50)

if __name__ == '__main__':
    show_nutrition_summary()





















