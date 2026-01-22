#!/usr/bin/env python
"""
Script para ver el contenido detallado de la base de datos
Muestra datos de las tablas principales
"""
import os
import sys
import django

# Configurar Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
from django.apps import apps
from django.conf import settings

def print_section(title):

def get_table_data(table_name, limit=10):
    """Obtiene datos de una tabla"""
    try:
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit};")
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            return columns, rows
    except Exception as e:
        return None, str(e)

def show_table_info(table_name):
    """Muestra información de una tabla"""
    try:
        with connection.cursor() as cursor:
            # Contar registros
            cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
            count = cursor.fetchone()[0]
            
            # Obtener columnas
            cursor.execute(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '{table_name}' 
                ORDER BY ordinal_position;
            """)
            columns_info = cursor.fetchall()
            
            return count, columns_info
    except Exception as e:
        return None, str(e)

def show_users():
    """Muestra información de usuarios"""
    print_section("USUARIOS (accounts_customuser)")
    try:
        from accounts.models import CustomUser
        
        total = CustomUser.objects.count()
        
        if total > 0:
            users = CustomUser.objects.all()[:10]
            for user in users:
    except Exception as e:

def show_exercises():
    """Muestra información de ejercicios"""
    print_section("EJERCICIOS (workouts_exercise)")
    try:
        from workouts.models import Exercise
        
        total = Exercise.objects.count()
        
        if total > 0:
            exercises = Exercise.objects.all()[:10]
            for ex in exercises:
    except Exception as e:

def show_nutrition_plans():
    """Muestra información de planes nutricionales"""
    print_section("PLANES NUTRICIONALES (nutrition_defaultnutritionplan)")
    try:
        from nutrition.models import DefaultNutritionPlan
        
        total = DefaultNutritionPlan.objects.count()
        
        if total > 0:
            plans = DefaultNutritionPlan.objects.all()[:10]
            for plan in plans:
    except Exception as e:

def show_workout_programs():
    """Muestra información de programas de entrenamiento"""
    print_section("PROGRAMAS DE ENTRENAMIENTO")
    try:
        from workouts.models import DefaultWorkoutProgram, WorkoutProgram
        
        default_total = DefaultWorkoutProgram.objects.count()
        user_total = WorkoutProgram.objects.count()
        
        
        if default_total > 0:
            programs = DefaultWorkoutProgram.objects.all()[:5]
            for prog in programs:
    except Exception as e:

def show_all_tables_summary():
    """Muestra un resumen de todas las tablas"""
    print_section("RESUMEN DE TODAS LAS TABLAS")
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = [row[0] for row in cursor.fetchall()]
            
            
            for table in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table};")
                    count = cursor.fetchone()[0]
                    if count > 0:
                except Exception as e:
    except Exception as e:

def show_recent_data():
    """Muestra datos recientes de varias tablas"""
    print_section("DATOS RECIENTES")
    
    tables_to_check = [
        'accounts_customuser',
        'workouts_exercise',
        'nutrition_defaultnutritionplan',
        'nutrition_recipe',
        'workouts_defaultworkoutprogram',
        'progress_progressentry',
        'notifications_notification',
        'achievements_achievement',
    ]
    
    for table in tables_to_check:
        try:
            count, columns_info = show_table_info(table)
            if count is not None and count > 0:
                if columns_info:
                    # Mostrar algunas columnas principales
                    main_cols = [col[0] for col in columns_info[:5]]
        except Exception as e:
            pass

def main():
    
    # Verificar conexión
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
    except Exception as e:
        sys.exit(1)
    
    # Mostrar resumen de tablas
    show_all_tables_summary()
    
    # Mostrar datos detallados
    show_users()
    show_exercises()
    show_nutrition_plans()
    show_workout_programs()
    
    # Mostrar datos recientes
    show_recent_data()
    
    print_section("FIN DEL REPORTE")

if __name__ == '__main__':
    main()

