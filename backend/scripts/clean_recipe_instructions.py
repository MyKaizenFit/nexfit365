#!/usr/bin/env python
"""
Script para limpiar instrucciones de recetas eliminando texto basura del PDF
"""
import os
import sys
import django
import re

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from nutrition.models import Recipe

def clean_instructions(text):
    """Limpiar instrucciones eliminando texto basura"""
    if not text:
        return text
    
    # Eliminar líneas que solo dicen "RECETAS"
    text = re.sub(r'^\s*RECETAS\s*$', '', text, flags=re.MULTILINE)
    
    # Eliminar líneas que son solo guiones (---)
    text = re.sub(r'^\s*-+\s*$', '', text, flags=re.MULTILINE)
    
    # Eliminar líneas que son solo #
    text = re.sub(r'^\s*#+\s*$', '', text, flags=re.MULTILINE)
    
    # Eliminar emojis y caracteres especiales extraños
    # Mantener solo letras, números, puntuación común y espacios
    text = re.sub(r'[^\w\sáéíóúñÁÉÍÓÚÑ.,;:()°\-–—¿?¡!\'\"\/\n\d]', '', text)
    
    # Eliminar múltiples líneas vacías consecutivas
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
    
    # Eliminar espacios al inicio y final
    text = text.strip()
    
    # Eliminar líneas vacías al inicio
    while text.startswith('\n'):
        text = text[1:]
    
    # Eliminar líneas vacías al final
    while text.endswith('\n\n'):
        text = text[:-1]
    
    return text

def clean_ingredients(ingredients):
    """Limpiar lista de ingredientes"""
    if not ingredients:
        return ingredients
    
    if isinstance(ingredients, list):
        cleaned = []
        for ing in ingredients:
            if isinstance(ing, str):
                # Eliminar "RECETAS" y otros textos basura
                if ing.strip().upper() == 'RECETAS':
                    continue
                if ing.strip() == '---':
                    continue
                if ing.strip().startswith('#'):
                    continue
                # Eliminar emojis
                ing_clean = re.sub(r'[^\w\sáéíóúñÁÉÍÓÚÑ.,;:()°\-–—/\d]', '', ing)
                if ing_clean.strip():
                    cleaned.append(ing_clean.strip())
        return cleaned if cleaned else ingredients
    
    return ingredients

def main():
    print("=" * 70)
    print("🧹 LIMPIANDO INSTRUCCIONES E INGREDIENTES DE RECETAS")
    print("=" * 70 + "\n")
    
    recipes = Recipe.objects.all()
    
    print(f"📋 Total recetas: {recipes.count()}\n")
    
    cleaned_instructions = 0
    cleaned_ingredients = 0
    
    for recipe in recipes:
        updated = False
        
        # Limpiar instrucciones
        if recipe.instructions:
            original_inst = recipe.instructions
            clean_inst = clean_instructions(original_inst)
            
            if clean_inst != original_inst:
                recipe.instructions = clean_inst
                updated = True
                cleaned_instructions += 1
        
        # Limpiar ingredientes
        if recipe.ingredients:
            original_ing = recipe.ingredients
            clean_ing = clean_ingredients(original_ing)
            
            if clean_ing != original_ing:
                recipe.ingredients = clean_ing
                updated = True
                cleaned_ingredients += 1
        
        if updated:
            recipe.save()
            print(f"✅ Limpiada: {recipe.name}")
    
    print(f"\n{'='*70}")
    print(f"✅ Proceso completado")
    print(f"   Instrucciones limpiadas: {cleaned_instructions}")
    print(f"   Ingredientes limpiados: {cleaned_ingredients}")
    print(f"{'='*70}\n")

if __name__ == '__main__':
    main()

