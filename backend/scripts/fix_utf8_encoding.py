#!/usr/bin/env python
"""
Script para corregir la codificación UTF-8 de los datos en la base de datos.
Corrige caracteres mal codificados como ?? por los caracteres correctos.
"""
import os
import sys
import django

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from nutrition.models import Recipe
import re

# Mapeo de caracteres mal codificados a caracteres correctos
CHAR_FIXES = {
    'C??sar': 'César',
    'At??n': 'Atún',
    'Mediterr??nea': 'Mediterránea',
    'Salm??n': 'Salmón',
    'Jazm??n': 'Jazmín',
    'PI??a': 'Piña',
    'pi??a': 'piña',
    'PIÑA': 'Piña',
    'Pi??a': 'Piña',
    'pi??a': 'piña',
    'DescripciÃ³n': 'Descripción',
    'descripciÃ³n': 'descripción',
    'PreparaciÃ³n': 'Preparación',
    'preparaciÃ³n': 'preparación',
}

def fix_string(text):
    """Corrige una cadena de texto con caracteres mal codificados"""
    if not text:
        return text
    
    fixed = text
    for wrong, correct in CHAR_FIXES.items():
        fixed = fixed.replace(wrong, correct)
    
    # Corregir patrones comunes de codificación incorrecta
    # Patrón: caracter seguido de ?? seguido de caracteres
    patterns = [
        (r'Mediterr(\?\?)nea', 'Mediterránea'),
        (r'C(\?\?)sar', 'César'),
        (r'At(\?\?)n', 'Atún'),
        (r'Salm(\?\?)n', 'Salmón'),
        (r'Jazm(\?\?)n', 'Jazmín'),
        (r'[Pp]i(\?\?)a', 'Piña'),
        (r'Pur(\?\?)', 'Puré'),
        (r'Poch(\?\?)', 'Poché'),
        (r'Piment(\?\?)n', 'Pimentón'),
        (r'Jam(\?\?)n', 'Jamón'),
        (r'D(\?\?)tiles', 'Dátiles'),
        (r'Cl(\?\?)sica', 'Clásica'),
        (r'Fantas(\?\?)a', 'Fantasía'),
        (r'Lim(\?\?)n', 'Limón'),
        (r'Calabac(\?\?)n', 'Calabacín'),
        (r'Mediterr(\?\?)neo', 'Mediterráneo'),
        (r'Descripci(\?\?)n', 'Descripción'),
        (r'Preparaci(\?\?)n', 'Preparación'),
    ]
    
    for pattern, replacement in patterns:
        fixed = re.sub(pattern, replacement, fixed)
    
    return fixed

def fix_recipe(recipe):
    """Corrige la codificación de una receta"""
    updated = False
    
    # Corregir nombre
    if recipe.name and '??' in recipe.name:
        old_name = recipe.name
        recipe.name = fix_string(recipe.name)
        if recipe.name != old_name:
            print(f"  ✅ Nombre: '{old_name}' → '{recipe.name}'")
            updated = True
    
    # Corregir descripción
    if recipe.description and ('??' in recipe.description or 'Ã³' in recipe.description):
        old_desc = recipe.description
        recipe.description = fix_string(recipe.description)
        if recipe.description != old_desc:
            print(f"  ✅ Descripción corregida")
            updated = True
    
    # Corregir ingredientes (JSONField)
    if recipe.ingredients:
        fixed_ingredients = []
        for ingredient in recipe.ingredients:
            if isinstance(ingredient, dict):
                fixed_ing = ingredient.copy()
                if 'name' in fixed_ing and ('??' in str(fixed_ing['name']) or 'Ã³' in str(fixed_ing['name'])):
                    fixed_ing['name'] = fix_string(str(fixed_ing['name']))
                    updated = True
                fixed_ingredients.append(fixed_ing)
            elif isinstance(ingredient, str):
                if '??' in ingredient or 'Ã³' in ingredient:
                    fixed_ingredients.append(fix_string(ingredient))
                    updated = True
                else:
                    fixed_ingredients.append(ingredient)
            else:
                fixed_ingredients.append(ingredient)
        
        if fixed_ingredients != recipe.ingredients:
            recipe.ingredients = fixed_ingredients
            print(f"  ✅ Ingredientes corregidos")
            updated = True
    
    # Corregir instrucciones
    if recipe.instructions and ('??' in recipe.instructions or 'Ã³' in recipe.instructions):
        old_instructions = recipe.instructions
        recipe.instructions = fix_string(recipe.instructions)
        if recipe.instructions != old_instructions:
            print(f"  ✅ Instrucciones corregidas")
            updated = True
    
    return updated

def main():
    print("=" * 70)
    print("🔧 CORRIGIENDO CODIFICACIÓN UTF-8 EN RECETAS")
    print("=" * 70 + "\n")
    
    # Buscar recetas con problemas de codificación
    from django.db.models import Q
    recipes_with_issues = Recipe.objects.filter(
        Q(name__contains='??') |
        Q(description__contains='??') |
        Q(instructions__contains='??') |
        Q(name__contains='Ã³') |
        Q(description__contains='Ã³') |
        Q(instructions__contains='Ã³')
    ).distinct()
    
    total_issues = recipes_with_issues.count()
    print(f"📋 Recetas con problemas de codificación encontradas: {total_issues}\n")
    
    if total_issues == 0:
        print("✅ No se encontraron problemas de codificación")
        return
    
    fixed_count = 0
    for recipe in recipes_with_issues:
        print(f"\n🔧 Corrigiendo: {recipe.name}")
        if fix_recipe(recipe):
            recipe.save()
            fixed_count += 1
            print(f"  ✅ Receta corregida y guardada")
        else:
            print(f"  ⏭️  Sin cambios necesarios")
    
    print(f"\n{'='*70}")
    print(f"✅ Proceso completado")
    print(f"   Recetas corregidas: {fixed_count}/{total_issues}")
    print(f"{'='*70}\n")

if __name__ == '__main__':
    main()

