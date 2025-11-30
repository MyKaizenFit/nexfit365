#!/usr/bin/env python
"""
Script de migración de datos de la BD antigua a la nueva estructura.

Este script:
1. Lee los datos importantes de la BD actual (dev)
2. Los transforma al nuevo formato
3. Genera archivos para importar en la nueva BD (pro)

Uso:
    python manage.py shell < scripts/migrate_data.py

O ejecutar directamente:
    cd /srv/mykaizenfit/pro/backend
    DJANGO_SETTINGS_MODULE=backend.settings python scripts/migrate_data.py
"""

import os
import sys
import json
import csv
from datetime import datetime
from pathlib import Path

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from django.db import connection


# Directorio de salida
OUTPUT_DIR = Path('/srv/mykaizenfit/export/migration_data')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def log(message):
    """Imprimir con timestamp"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")


def export_exercises():
    """
    Exporta ejercicios de workouts_exercise a formato para nueva estructura.
    Estos son los ejercicios REALES (50 ejercicios).
    """
    log("📦 Exportando ejercicios...")
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT 
                id, name, category, muscle_groups, instructions, 
                video_url, image_url, google_drive_file_id,
                created_at, updated_at
            FROM workouts_exercise
            WHERE name IS NOT NULL
            ORDER BY name
        """)
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
    
    exercises = []
    for row in rows:
        exercise = dict(zip(columns, row))
        # Convertir a nuevo formato
        exercises.append({
            'id': str(exercise['id']),
            'name': exercise['name'],
            'description': '',
            'instructions': exercise['instructions'] or '',
            'category': exercise['category'] or 'strength',
            'muscle_groups': exercise['muscle_groups'] if isinstance(exercise['muscle_groups'], list) else [],
            'equipment': [],
            'difficulty': 'intermediate',
            'video_url': exercise['video_url'] or '',
            'image_url': exercise['image_url'] or '',
            'google_drive_file_id': exercise['google_drive_file_id'] or '',
            'is_system': True,  # Marcar como ejercicios del sistema
            'is_active': True,
            'created_by': None,
            'tags': [],
        })
    
    # Guardar como JSON
    output_file = OUTPUT_DIR / 'exercises.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(exercises, f, ensure_ascii=False, indent=2, default=str)
    
    log(f"   ✅ {len(exercises)} ejercicios exportados a {output_file}")
    return exercises


def export_recipes():
    """
    Exporta recetas de nutrition_recipe a formato para nueva estructura.
    """
    log("📦 Exportando recetas...")
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT 
                id, name, category, difficulty, prep_time_minutes,
                servings, calories_per_serving, ingredients, instructions,
                image_url, tags, created_at, updated_at
            FROM nutrition_recipe
            ORDER BY name
        """)
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
    
    recipes = []
    for row in rows:
        recipe = dict(zip(columns, row))
        
        # Mapear categoría a nuevo formato
        category_map = {
            'Desayuno': 'breakfast',
            'Almuerzo': 'lunch',
            'Cena': 'dinner',
            'Snack': 'snack',
            'Merienda': 'snack',
        }
        category = category_map.get(recipe['category'], 'lunch')
        
        recipes.append({
            'id': str(recipe['id']),
            'name': recipe['name'],
            'description': '',
            'category': category,
            'difficulty': recipe['difficulty'] or 'easy',
            'prep_time_minutes': recipe['prep_time_minutes'] or 15,
            'cook_time_minutes': 0,
            'servings': recipe['servings'] or 1,
            'calories': recipe['calories_per_serving'] or 0,
            'protein': 0,
            'carbs': 0,
            'fat': 0,
            'fiber': 0,
            'sugar': 0,
            'sodium': 0,
            'ingredients': recipe['ingredients'] if isinstance(recipe['ingredients'], list) else [],
            'instructions': recipe['instructions'] or '',
            'diet_types': [],
            'meal_types': [category],
            'allergens': [],
            'tags': recipe['tags'] if isinstance(recipe['tags'], list) else [],
            'image_url': recipe['image_url'] or '',
            'video_url': '',
            'is_system': True,
            'is_active': True,
            'is_featured': False,
            'created_by': None,
        })
    
    # Guardar como JSON
    output_file = OUTPUT_DIR / 'recipes.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(recipes, f, ensure_ascii=False, indent=2, default=str)
    
    log(f"   ✅ {len(recipes)} recetas exportadas a {output_file}")
    return recipes


def export_users():
    """
    Exporta usuarios importantes (eliminando usuarios de prueba).
    """
    log("📦 Exportando usuarios...")
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT 
                id, email, first_name, last_name, password,
                is_staff, is_superuser, is_active,
                phone_number, birth_date, gender, height, weight,
                activity_level, main_goal, training_location,
                training_days_per_week, training_days,
                dietary_restrictions, allergies, medical_conditions,
                equipment_available, notification_preferences,
                daily_streak, longest_streak, role,
                created_at, date_joined
            FROM accounts_customuser
            WHERE email NOT LIKE 'test@%%'
              AND email NOT LIKE 'user%%@mykaizenfit.com'
            ORDER BY id
        """)
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
    
    users = []
    for row in rows:
        user = dict(zip(columns, row))
        users.append({
            'id': user['id'],
            'email': user['email'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'password': user['password'],  # Hash, no texto plano
            'is_staff': user['is_staff'],
            'is_superuser': user['is_superuser'],
            'is_active': user['is_active'],
            'phone_number': user['phone_number'],
            'birth_date': str(user['birth_date']) if user['birth_date'] else None,
            'gender': user['gender'],
            'height': user['height'],
            'weight': user['weight'],
            'activity_level': user['activity_level'] or 'moderate',
            'main_goal': user['main_goal'],
            'training_location': user['training_location'],
            'training_days_per_week': user['training_days_per_week'],
            'training_days': user['training_days'] if isinstance(user['training_days'], list) else [],
            'dietary_restrictions': user['dietary_restrictions'] if isinstance(user['dietary_restrictions'], list) else [],
            'allergies': user['allergies'] if isinstance(user['allergies'], list) else [],
            'medical_conditions': user['medical_conditions'] if isinstance(user['medical_conditions'], list) else [],
            'equipment_available': user['equipment_available'] if isinstance(user['equipment_available'], list) else [],
            'notification_preferences': user['notification_preferences'] if isinstance(user['notification_preferences'], dict) else {},
            'daily_streak': user['daily_streak'] or 0,
            'longest_streak': user['longest_streak'] or 0,
            'role': user['role'] or 'basic',
            'onboarding_completed': True,
            'created_at': str(user['created_at']) if user['created_at'] else None,
        })
    
    # Guardar como JSON
    output_file = OUTPUT_DIR / 'users.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2, default=str)
    
    log(f"   ✅ {len(users)} usuarios exportados a {output_file}")
    log(f"      (Usuarios de prueba excluidos)")
    return users


def export_motivational_tips():
    """
    Exporta tips motivacionales.
    """
    log("📦 Exportando tips motivacionales...")
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, title, content, category, is_active, created_at
            FROM notifications_motivationaltip
            ORDER BY created_at
        """)
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
    
    tips = [dict(zip(columns, row)) for row in rows]
    
    # Guardar como JSON
    output_file = OUTPUT_DIR / 'motivational_tips.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(tips, f, ensure_ascii=False, indent=2, default=str)
    
    log(f"   ✅ {len(tips)} tips exportados a {output_file}")
    return tips


def generate_import_script():
    """
    Genera el script SQL para importar los datos en la nueva BD.
    """
    log("📝 Generando script de importación...")
    
    script_content = '''-- Script de importación de datos para la nueva estructura
-- Generado automáticamente por migrate_data.py
-- Fecha: {date}

-- IMPORTANTE: Ejecutar después de las migraciones Django

-- 1. Los datos de usuarios se importan vía Django ORM (ver import_data.py)
-- 2. Los ejercicios se importan vía Django ORM
-- 3. Las recetas se importan vía Django ORM

-- Este script es solo de referencia.
-- Usar import_data.py para la importación real.

-- Verificar tablas creadas:
-- \\dt workouts_*
-- \\dt nutrition_*
-- \\dt accounts_*

'''.format(date=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    
    output_file = OUTPUT_DIR / 'import_reference.sql'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    log(f"   ✅ Script de referencia generado: {output_file}")


def generate_import_python_script():
    """
    Genera el script Python para importar los datos usando Django ORM.
    """
    log("📝 Generando script Python de importación...")
    
    script_content = '''#!/usr/bin/env python
"""
Script para importar datos en la nueva estructura de BD.

Uso:
    cd /srv/mykaizenfit/pro/backend
    python manage.py shell < scripts/import_data.py
"""

import os
import json
from pathlib import Path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from workouts.models import Exercise
from nutrition.models import Recipe

User = get_user_model()
DATA_DIR = Path('/srv/mykaizenfit/export/migration_data')


def import_users():
    """Importar usuarios"""
    print("👤 Importando usuarios...")
    
    with open(DATA_DIR / 'users.json', 'r') as f:
        users_data = json.load(f)
    
    for user_data in users_data:
        user_id = user_data.pop('id')
        password = user_data.pop('password')
        
        # Verificar si ya existe
        if User.objects.filter(email=user_data['email']).exists():
            print(f"   ⏭️  Usuario {user_data['email']} ya existe, saltando...")
            continue
        
        # Crear usuario con el password hasheado original
        user = User(**user_data)
        user.password = password  # Ya está hasheado
        user.save()
        print(f"   ✅ Usuario {user.email} importado")
    
    print(f"   Total: {User.objects.count()} usuarios")


def import_exercises():
    """Importar ejercicios"""
    print("🏋️ Importando ejercicios...")
    
    with open(DATA_DIR / 'exercises.json', 'r') as f:
        exercises_data = json.load(f)
    
    created = 0
    for ex_data in exercises_data:
        ex_id = ex_data.pop('id')
        
        # Verificar si ya existe por nombre
        if Exercise.objects.filter(name=ex_data['name']).exists():
            continue
        
        Exercise.objects.create(**ex_data)
        created += 1
    
    print(f"   ✅ {created} ejercicios importados")
    print(f"   Total: {Exercise.objects.count()} ejercicios")


def import_recipes():
    """Importar recetas"""
    print("🍽️ Importando recetas...")
    
    with open(DATA_DIR / 'recipes.json', 'r') as f:
        recipes_data = json.load(f)
    
    created = 0
    for recipe_data in recipes_data:
        recipe_id = recipe_data.pop('id')
        
        # Verificar si ya existe por nombre
        if Recipe.objects.filter(name=recipe_data['name']).exists():
            continue
        
        Recipe.objects.create(**recipe_data)
        created += 1
    
    print(f"   ✅ {created} recetas importadas")
    print(f"   Total: {Recipe.objects.count()} recetas")


if __name__ == '__main__':
    print("=" * 50)
    print("IMPORTACIÓN DE DATOS")
    print("=" * 50)
    
    import_users()
    print()
    import_exercises()
    print()
    import_recipes()
    
    print()
    print("=" * 50)
    print("✅ IMPORTACIÓN COMPLETADA")
    print("=" * 50)
'''
    
    output_file = OUTPUT_DIR.parent / 'import_data.py'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    # También guardar en scripts
    scripts_file = Path('/srv/mykaizenfit/pro/backend/scripts/import_data.py')
    scripts_file.parent.mkdir(parents=True, exist_ok=True)
    with open(scripts_file, 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    log(f"   ✅ Script de importación generado: {output_file}")
    log(f"   ✅ Copia en: {scripts_file}")


def main():
    """Función principal"""
    print("=" * 60)
    print("MIGRACIÓN DE DATOS - REESTRUCTURACIÓN BD")
    print("=" * 60)
    print()
    
    # Exportar datos
    export_exercises()
    export_recipes()
    export_users()
    export_motivational_tips()
    
    print()
    
    # Generar scripts
    generate_import_script()
    generate_import_python_script()
    
    print()
    print("=" * 60)
    print("✅ EXPORTACIÓN COMPLETADA")
    print(f"   Archivos en: {OUTPUT_DIR}")
    print("=" * 60)
    print()
    print("PRÓXIMOS PASOS:")
    print("1. Revisar los archivos JSON exportados")
    print("2. Ejecutar migraciones en pro:")
    print("   cd /srv/mykaizenfit/pro")
    print("   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d")
    print("   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py migrate")
    print("3. Importar datos:")
    print("   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py shell < scripts/import_data.py")


if __name__ == '__main__':
    main()

