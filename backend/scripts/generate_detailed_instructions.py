#!/usr/bin/env python
"""
Script para generar instrucciones detalladas para recetas con instrucciones genéricas
"""
import os
import sys
import django
import json

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from nutrition.models import Recipe


def extract_ingredient_names(ingredients):
    """Extrae los nombres de los ingredientes de la lista"""
    names = []
    for ing in ingredients:
        if isinstance(ing, dict):
            name = ing.get('name', '')
        elif isinstance(ing, str):
            # Formato: "- 100 g de Yogur griego"
            name = ing.replace('-', '').strip()
            # Remover cantidad y unidad
            parts = name.split(' de ', 1)
            if len(parts) > 1:
                name = parts[1]
            else:
                # Si no tiene "de", tomar desde el segundo espacio
                parts = name.split(' ', 2)
                if len(parts) > 2:
                    name = parts[2]
        else:
            name = str(ing)
        
        # Limpiar nombre
        name = name.strip().lower()
        if name and name not in ['sal', 'pimienta', 'aceite de oliva', 'aove']:
            names.append(name)
    return names


def generate_bowl_instructions(recipe_name, ingredients):
    """Genera instrucciones detalladas para bowls"""
    ing_names = extract_ingredient_names(ingredients)
    
    # Identificar ingredientes principales
    protein = None
    carb = None
    vegetables = []
    
    protein_keywords = ['pollo', 'pavo', 'ternera', 'salmón', 'atún', 'caballa', 'sardinas', 'tofu', 'huevo', 'lentejas', 'hummus']
    carb_keywords = ['arroz', 'patata', 'quinoa', 'boniato', 'pasta']
    veg_keywords = ['pimiento', 'tomate', 'cebolla', 'pepino', 'brocoli', 'espinacas', 'aguacate', 'lechuga', 'esparragos']
    
    for ing in ing_names:
        if any(kw in ing for kw in protein_keywords):
            protein = ing
        elif any(kw in ing for kw in carb_keywords):
            carb = ing
        elif any(kw in ing for kw in veg_keywords):
            vegetables.append(ing)
    
    instructions = []
    
    # Paso 1: Preparar proteína
    if protein:
        if 'pollo' in protein or 'pavo' in protein:
            instructions.append(f"1. Cocina el {protein} en una sartén con aceite de oliva, sal y pimienta durante 4-5 minutos hasta que esté dorado y cocido por completo.")
        elif 'ternera' in protein:
            instructions.append(f"1. Cocina la {protein} en una sartén con aceite de oliva, sal y pimienta durante 5-6 minutos hasta que esté bien sellada.")
        elif 'salmón' in protein or 'atún' in protein or 'caballa' in protein or 'sardinas' in protein:
            instructions.append(f"1. Cocina el {protein} en una sartén o plancha con aceite de oliva, sal y pimienta durante 3-4 minutos por cada lado.")
        elif 'tofu' in protein:
            instructions.append(f"1. Corta el {protein} en cubos y saltéalo en una sartén con aceite de oliva, sal y pimienta durante 5-6 minutos hasta que esté dorado.")
        elif 'huevo' in protein:
            instructions.append(f"1. Prepara el {protein} según tu preferencia (cocido, revuelto o pochado).")
        elif 'lentejas' in protein or 'hummus' in protein:
            instructions.append(f"1. Prepara el {protein} (si es necesario cocinarlo) o úsalo directamente si ya está listo.")
        else:
            instructions.append(f"1. Prepara el {protein} según sea necesario.")
    else:
        instructions.append("1. Prepara los ingredientes principales según sea necesario.")
    
    # Paso 2: Preparar carbohidrato
    if carb:
        if 'patata' in carb:
            instructions.append(f"2. Cocina la {carb} al vapor o en el microondas hasta que esté tierna. Luego córtala en cubos.")
        elif 'arroz' in carb:
            instructions.append(f"3. Cocina el {carb} según las instrucciones del paquete hasta que esté al dente.")
        elif 'quinoa' in carb:
            instructions.append(f"3. Cocina la {carb} en agua hirviendo durante 12-15 minutos hasta que esté tierna.")
        elif 'boniato' in carb:
            instructions.append(f"3. Cocina el {carb} al horno o al vapor hasta que esté tierno. Luego córtalo en cubos.")
        else:
            instructions.append(f"3. Prepara el {carb} según sea necesario.")
    else:
        instructions.append("2. Prepara la base de carbohidratos si es necesaria.")
    
    # Paso 3: Preparar verduras
    if vegetables:
        veg_list = ", ".join(vegetables[:3])  # Limitar a 3 para no hacer muy largo
        instructions.append(f"{len(instructions) + 1}. Lava y corta las verduras ({veg_list}) en trozos del tamaño deseado.")
    
    # Paso 4: Montar el bowl
    instructions.append(f"{len(instructions) + 1}. Monta el bowl: coloca la base de carbohidratos, luego la proteína, y finalmente las verduras.")
    
    # Paso 5: Aliñar
    instructions.append(f"{len(instructions) + 1}. Aliña con aceite de oliva, sal, pimienta y un toque de limón si lo deseas. Mezcla ligeramente y sirve inmediatamente.")
    
    return "\n".join(instructions)


def generate_fajita_instructions(recipe_name, ingredients):
    """Genera instrucciones detalladas para fajitas"""
    ing_names = extract_ingredient_names(ingredients)
    
    # Identificar ingredientes
    protein = None
    vegetables = []
    has_salsa = 'yogur' in ' '.join(ing_names) or 'salsa' in ' '.join(ing_names)
    
    protein_keywords = ['pollo', 'pavo', 'ternera', 'atún', 'carne', 'berenjena']
    veg_keywords = ['pimiento', 'tomate', 'cebolla', 'zanahoria', 'berenjena']
    
    for ing in ing_names:
        if any(kw in ing for kw in protein_keywords):
            protein = ing
        elif any(kw in ing for kw in veg_keywords):
            vegetables.append(ing)
    
    instructions = []
    
    # Paso 1: Preparar salsa si existe
    if has_salsa:
        if 'yogur' in ' '.join(ing_names):
            instructions.append("1. Prepara la salsa de yogur mezclando el yogur griego con un poco de aceite de oliva, sal, pimienta y hierbas al gusto.")
        else:
            instructions.append("1. Prepara la salsa según la receta o úsala directamente si ya está lista.")
    
    # Paso 2: Preparar relleno
    if protein:
        if 'pollo' in protein or 'pavo' in protein:
            instructions.append(f"{len(instructions) + 1}. Corta el {protein} en tiras y saltéalo en una sartén con aceite de oliva, sal y pimienta durante 4-5 minutos hasta que esté cocido.")
        elif 'ternera' in protein or 'carne' in protein:
            instructions.append(f"{len(instructions) + 1}. Cocina la {protein} en una sartén con aceite de oliva, sal y pimienta durante 5-6 minutos hasta que esté bien sellada.")
        elif 'atún' in protein:
            instructions.append(f"{len(instructions) + 1}. Cocina el {protein} en una sartén con aceite de oliva, sal y pimienta durante 2-3 minutos por cada lado.")
        elif 'berenjena' in protein:
            instructions.append(f"{len(instructions) + 1}. Corta la {protein} en tiras y saltéala en una sartén con aceite de oliva, sal y pimienta durante 6-8 minutos hasta que esté tierna.")
        else:
            instructions.append(f"{len(instructions) + 1}. Prepara el {protein} según sea necesario.")
    
    if vegetables:
        veg_list = ", ".join(vegetables[:2])
        instructions.append(f"{len(instructions) + 1}. Corta las verduras ({veg_list}) en tiras finas y saltéalas en la misma sartén durante 2-3 minutos hasta que estén tiernas pero crujientes.")
    
    # Paso 3: Calentar tortilla
    instructions.append(f"{len(instructions) + 1}. Calienta la tortilla integral en una sartén o en el microondas durante 20-30 segundos hasta que esté caliente y flexible.")
    
    # Paso 4: Rellenar
    instructions.append(f"{len(instructions) + 1}. Coloca el relleno en el centro de la tortilla, añade la salsa si la tienes, y enrolla la fajita firmemente.")
    
    # Paso 5: Servir
    instructions.append(f"{len(instructions) + 1}. Sirve inmediatamente mientras está caliente.")
    
    return "\n".join(instructions)


def generate_tabla_instructions(recipe_name, ingredients):
    """Genera instrucciones detalladas para tablas"""
    ing_names = extract_ingredient_names(ingredients)
    
    # Identificar tipo de tabla
    is_sweet = 'dulce' in recipe_name.lower() or 'dátiles' in ' '.join(ing_names) or 'fresas' in ' '.join(ing_names) or 'uvas' in ' '.join(ing_names)
    is_protein = any(kw in ' '.join(ing_names) for kw in ['pollo', 'pavo', 'ternera', 'atún', 'salmón', 'pulpo', 'jamón'])
    
    instructions = []
    
    if is_sweet:
        instructions.append("1. Prepara los ingredientes dulces: corta las frutas en trozos del tamaño deseado.")
        instructions.append("2. Si incluye frutos secos o semillas, tóstalos ligeramente si lo deseas para realzar su sabor.")
        instructions.append("3. Disponer todos los ingredientes de forma atractiva en una tabla o plato plano.")
        instructions.append("4. Añade un toque de miel, sirope o crema si la receta lo incluye.")
        instructions.append("5. Sirve a temperatura ambiente y disfruta como snack o postre.")
    elif is_protein:
        instructions.append("1. Prepara las proteínas: si es necesario cocinar (pollo, pavo, ternera), hazlo con sal y pimienta. Si es pescado en conserva o jamón, úsalo directamente.")
        instructions.append("2. Corta las verduras y acompañamientos en trozos del tamaño de bocado.")
        instructions.append("3. Si incluye queso, córtalo en cubos o láminas según el tipo.")
        instructions.append("4. Disponer todos los ingredientes de forma equilibrada en una tabla o plato grande.")
        instructions.append("5. Aliña con aceite de oliva, sal marina y hierbas al gusto.")
        instructions.append("6. Sirve a temperatura ambiente o ligeramente frío.")
    else:
        instructions.append("1. Prepara todos los ingredientes: lava y corta las verduras en trozos del tamaño deseado.")
        instructions.append("2. Si incluye proteínas, prepáralas según sea necesario (cocidas, a la plancha, etc.).")
        instructions.append("3. Disponer todos los ingredientes de forma atractiva y equilibrada en una tabla o plato grande.")
        instructions.append("4. Aliña con aceite de oliva, sal, pimienta y hierbas al gusto.")
        instructions.append("5. Sirve a temperatura ambiente y disfruta.")
    
    return "\n".join(instructions)


def generate_tostada_instructions(recipe_name, ingredients):
    """Genera instrucciones detalladas para tostadas"""
    ing_names = extract_ingredient_names(ingredients)
    
    # Identificar ingredientes principales
    protein = None
    has_egg = 'huevo' in ' '.join(ing_names)
    is_sweet = 'fresas' in ' '.join(ing_names) or 'miel' in ' '.join(ing_names) or 'ricotta' in ' '.join(ing_names)
    
    protein_keywords = ['pollo', 'pavo', 'atún', 'salmón', 'pulpo', 'jamón']
    
    for ing in ing_names:
        if any(kw in ing for kw in protein_keywords):
            protein = ing
    
    instructions = []
    
    # Paso 1: Tostar pan
    instructions.append("1. Tuesta el pan integral en una tostadora o sartén hasta que esté dorado y crujiente.")
    
    # Paso 2: Preparar ingredientes
    if has_egg:
        if 'poché' in recipe_name.lower():
            instructions.append("2. Prepara el huevo pochado: hierve agua con vinagre, remueve para crear un remolino y añade el huevo. Cocina 3-4 minutos.")
        else:
            instructions.append("2. Prepara el huevo según tu preferencia (cocido, revuelto o frito).")
    
    if protein:
        if 'pulpo' in protein:
            instructions.append(f"{len(instructions) + 1}. Si el {protein} no está cocido, cocínalo previamente. Si ya está listo, córtalo en rodajas.")
        elif 'atún' in protein or 'salmón' in protein:
            instructions.append(f"{len(instructions) + 1}. Prepara el {protein} (si es en conserva, escúrrelo bien; si es fresco, cocínalo a la plancha).")
        elif 'pollo' in protein or 'pavo' in protein:
            instructions.append(f"{len(instructions) + 1}. Cocina el {protein} en una sartén con sal y pimienta hasta que esté dorado.")
        else:
            instructions.append(f"{len(instructions) + 1}. Prepara el {protein} según sea necesario.")
    
    if is_sweet:
        instructions.append(f"{len(instructions) + 1}. Lava y corta las frutas (fresas, etc.) en rodajas o trozos.")
        instructions.append(f"{len(instructions) + 1}. Unta la tostada con ricotta o queso fresco si la receta lo incluye.")
        instructions.append(f"{len(instructions) + 1}. Coloca las frutas encima y añade un toque de miel.")
    else:
        # Paso 3: Montar tostada
        instructions.append(f"{len(instructions) + 1}. Coloca los ingredientes principales sobre la tostada caliente.")
        instructions.append(f"{len(instructions) + 1}. Añade los acompañamientos (tomate, aguacate, etc.) y aliña con aceite de oliva, sal y pimienta.")
    
    # Paso final: Servir
    instructions.append(f"{len(instructions) + 1}. Sirve inmediatamente mientras la tostada está caliente y crujiente.")
    
    return "\n".join(instructions)


def generate_instructions(recipe):
    """Genera instrucciones detalladas según el tipo de receta"""
    recipe_name = recipe.name.upper()
    ingredients = recipe.ingredients if recipe.ingredients else []
    
    if 'BOWL' in recipe_name:
        return generate_bowl_instructions(recipe.name, ingredients)
    elif 'FAJITA' in recipe_name:
        return generate_fajita_instructions(recipe.name, ingredients)
    elif 'TABLA' in recipe_name:
        return generate_tabla_instructions(recipe.name, ingredients)
    elif 'TOSTADA' in recipe_name:
        return generate_tostada_instructions(recipe.name, ingredients)
    else:
        # Instrucciones genéricas mejoradas
        return "1. Prepara todos los ingredientes según sea necesario.\n2. Cocina los ingredientes principales con sal y pimienta.\n3. Monta el plato de forma atractiva.\n4. Aliña al gusto y sirve inmediatamente."


def main():
    print("=" * 70)
    print("🍽️  GENERANDO INSTRUCCIONES DETALLADAS PARA RECETAS")
    print("=" * 70 + "\n")
    
    # Obtener todas las recetas con instrucciones genéricas
    recipes = Recipe.objects.filter(
        is_active=True,
        instructions__in=['Seguir preparación indicada.', 'Seguir preparación indicada']
    )
    
    # También buscar por longitud
    all_recipes = Recipe.objects.filter(is_active=True)
    generic_recipes = []
    for recipe in all_recipes:
        if recipe.instructions and len(recipe.instructions.strip()) == 28:
            if 'seguir preparación' in recipe.instructions.lower():
                generic_recipes.append(recipe)
    
    # Combinar ambas listas sin duplicados
    recipe_ids = set()
    final_recipes = []
    for recipe in list(recipes) + generic_recipes:
        if recipe.id not in recipe_ids:
            recipe_ids.add(recipe.id)
            final_recipes.append(recipe)
    
    print(f"📋 Encontradas {len(final_recipes)} recetas con instrucciones genéricas\n")
    
    updated = 0
    errors = 0
    
    for recipe in final_recipes:
        try:
            old_instructions = recipe.instructions
            new_instructions = generate_instructions(recipe)
            
            recipe.instructions = new_instructions
            recipe.save()
            
            print(f"✅ {recipe.name}")
            print(f"   Instrucciones generadas: {len(new_instructions.split(chr(10)))} pasos")
            updated += 1
            
        except Exception as e:
            print(f"❌ Error en {recipe.name}: {str(e)}")
            errors += 1
    
    print("\n" + "=" * 70)
    print(f"✅ Actualizadas: {updated} recetas")
    if errors > 0:
        print(f"❌ Errores: {errors} recetas")
    print("=" * 70)


if __name__ == '__main__':
    main()


