#!/usr/bin/env python
"""
Script para extraer TODAS las recetas del PDF y actualizar la base de datos
"""
import os
import sys
import django
import pdfplumber
import re

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from nutrition.models import Recipe

PDF_PATH = '/srv/mykaizenfit/pro/frontend/media/RECETAS GENERALES-2.pdf'

def parse_recipe_from_text(text_block):
    """Parsear una receta desde un bloque de texto"""
    lines = [l.strip() for l in text_block.split('\n') if l.strip()]
    
    recipe_data = {
        'name': '',
        'category': 'lunch',
        'difficulty': 'medium',
        'prep_time': 15,
        'ingredients': [],
        'instructions': '',
        'calories': 400,
    }
    
    # Buscar nombre (primera línea que empiece con BOWL, FAJITA, TABLA, etc.)
    for line in lines:
        if any(line.startswith(prefix) for prefix in ['BOWL', 'FAJITA', 'TABLA', 'TOSTADA', 'CREMA', 'PURÉ']):
            recipe_data['name'] = line
            break
    
    # Buscar dificultad
    if 'Fácil' in text_block or 'fácil' in text_block:
        recipe_data['difficulty'] = 'easy'
    elif 'Muy fácil' in text_block or 'muy fácil' in text_block:
        recipe_data['difficulty'] = 'easy'
    elif 'Medio' in text_block or 'medio' in text_block:
        recipe_data['difficulty'] = 'medium'
    elif 'Difícil' in text_block or 'difícil' in text_block:
        recipe_data['difficulty'] = 'hard'
    
    # Buscar tiempo
    time_match = re.search(r'(\d+)(?:-(\d+))?\s*(?:min|minutos)', text_block, re.IGNORECASE)
    if time_match:
        recipe_data['prep_time'] = int(time_match.group(1))
    
    # Buscar instrucciones (después de PREPARACIÓN o similar)
    prep_idx = -1
    for idx, line in enumerate(lines):
        if 'PREPARACIÓN' in line.upper() or 'PASO A PASO' in line.upper():
            prep_idx = idx
            break
    
    if prep_idx >= 0:
        # Las instrucciones están después de la línea de PREPARACIÓN
        instructions_lines = []
        for line in lines[prep_idx+1:]:
            if line and not line.startswith('#') and not line.startswith('---'):
                instructions_lines.append(line)
            if len(instructions_lines) > 10:  # Limitar a primeras 10 líneas de instrucciones
                break
        recipe_data['instructions'] = '\n'.join(instructions_lines)
    
    return recipe_data

def extract_recipes_from_pdf(pdf_path):
    """Extraer todas las recetas del PDF"""
    print(f"📖 Leyendo PDF: {pdf_path}\n")
    
    recipes = []
    current_recipe_text = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"📄 Total páginas: {len(pdf.pages)}\n")
            
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                
                if text:
                    # Dividir por líneas
                    lines = text.split('\n')
                    
                    for line in lines:
                        # Detectar inicio de nueva receta
                        if any(line.strip().startswith(prefix) for prefix in ['BOWL ', 'FAJITA ', 'TABLA ', 'TOSTADA ', 'CREMA ', 'PURÉ']):
                            # Si ya teníamos una receta acumulada, procesarla
                            if current_recipe_text:
                                recipe_text = '\n'.join(current_recipe_text)
                                recipe_data = parse_recipe_from_text(recipe_text)
                                if recipe_data['name']:
                                    recipes.append(recipe_data)
                            
                            # Iniciar nueva receta
                            current_recipe_text = [line]
                        else:
                            # Continuar acumulando texto de la receta actual
                            if current_recipe_text:
                                current_recipe_text.append(line)
                
                if page_num % 10 == 0:
                    print(f"  Procesadas {page_num} páginas... ({len(recipes)} recetas encontradas)")
            
            # Procesar última receta
            if current_recipe_text:
                recipe_text = '\n'.join(current_recipe_text)
                recipe_data = parse_recipe_from_text(recipe_text)
                if recipe_data['name']:
                    recipes.append(recipe_data)
    
    except Exception as e:
        print(f"❌ Error leyendo PDF: {e}")
        return []
    
    print(f"\n✅ Total recetas extraídas: {len(recipes)}\n")
    return recipes

def update_recipe_with_pdf_data(recipe_data):
    """Actualizar una receta en la BD con datos del PDF"""
    try:
        pdf_name = recipe_data['name'].strip()
        
        # Intentar búsqueda exacta primero
        recipe = Recipe.objects.filter(name=pdf_name).first()
        
        if not recipe:
            # Buscar por nombre que contenga las palabras clave
            # Extraer el ID de la receta (BOWL 1, FAJITA 10, etc.)
            match = re.match(r'([A-Z]+)\s+(\d+)', pdf_name)
            if match:
                recipe_type = match.group(1)
                recipe_num = match.group(2)
                search_pattern = f"{recipe_type} {recipe_num}"
                recipe = Recipe.objects.filter(name__startswith=search_pattern).first()
        
        if recipe:
            # Actualizar solo si tenemos instrucciones del PDF
            if recipe_data['instructions'] and len(recipe_data['instructions']) > 20:
                recipe.instructions = recipe_data['instructions']
                recipe.difficulty = recipe_data['difficulty']
                recipe.prep_time_minutes = recipe_data['prep_time']
                recipe.save()
                return True, recipe.name
            return False, f"Sin instrucciones: {pdf_name}"
        else:
            return False, f"No encontrada: {pdf_name}"
    
    except Exception as e:
        return False, f"Error: {recipe_data.get('name', 'unknown')}"

def main():
    print("=" * 70)
    print("📚 EXTRAYENDO TODAS LAS RECETAS DEL PDF")
    print("=" * 70 + "\n")
    
    # Extraer recetas del PDF
    pdf_recipes = extract_recipes_from_pdf(PDF_PATH)
    
    if not pdf_recipes:
        print("❌ No se pudieron extraer recetas del PDF")
        return
    
    print(f"🔄 Actualizando recetas en la base de datos...\n")
    
    updated = 0
    not_found = 0
    
    for recipe_data in pdf_recipes:
        success, name = update_recipe_with_pdf_data(recipe_data)
        if success:
            print(f"✅ Actualizada: {name}")
            updated += 1
        else:
            not_found += 1
    
    print(f"\n{'='*70}")
    print(f"✅ Proceso completado")
    print(f"   Actualizadas: {updated}")
    print(f"   No encontradas: {not_found}")
    print(f"{'='*70}\n")

if __name__ == '__main__':
    main()

