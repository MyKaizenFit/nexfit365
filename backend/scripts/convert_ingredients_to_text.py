#!/usr/bin/env python
"""
Script para convertir ingredientes de formato JSON a texto simple
"""
import os
import sys
import django

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from nutrition.models import Recipe

def convert_ingredients_to_text(recipe):
    """Convertir ingredientes de JSON a texto"""
    
    if not recipe.ingredients or not isinstance(recipe.ingredients, list):
        return False
    
    # Convertir array de objetos a texto
    ingredients_text_lines = []
    
    for ing in recipe.ingredients:
        if isinstance(ing, dict):
            name = ing.get('name', '')
            quantity = ing.get('quantity', '')
            unit = ing.get('unit', '')
            
            if name:
                if quantity and unit:
                    line = f"- {quantity} {unit} de {name}"
                elif quantity:
                    line = f"- {quantity} {name}"
                else:
                    line = f"- {name}"
                
                ingredients_text_lines.append(line)
    
    if ingredients_text_lines:
        recipe.ingredients = ingredients_text_lines
        recipe.save()
        return True
    
    return False

def main():
    print("=" * 70)
    print("🔄 CONVIRTIENDO INGREDIENTES A FORMATO TEXTO")
    print("=" * 70 + "\n")
    
    # Obtener todas las recetas
    recipes = Recipe.objects.all()
    
    print(f"📋 Total recetas: {recipes.count()}\n")
    
    converted = 0
    skipped = 0
    
    for recipe in recipes:
        if convert_ingredients_to_text(recipe):
            print(f"✅ {recipe.name}")
            converted += 1
        else:
            skipped += 1
    
    print(f"\n{'='*70}")
    print(f"✅ Proceso completado")
    print(f"   Convertidas: {converted}")
    print(f"   Omitidas: {skipped}")
    print(f"{'='*70}\n")

if __name__ == '__main__':
    main()

