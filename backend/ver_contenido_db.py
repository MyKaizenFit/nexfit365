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
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)

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
        print(f"Total de usuarios: {total}")
        
        if total > 0:
            print("\nUsuarios (primeros 10):")
            print("-" * 70)
            users = CustomUser.objects.all()[:10]
            for user in users:
                print(f"  ID: {user.id}")
                print(f"  Email: {user.email}")
                print(f"  Nombre: {user.first_name} {user.last_name}")
                print(f"  Rol: {user.role}")
                print(f"  Admin: {user.is_superuser}, Staff: {user.is_staff}")
                print(f"  Verificado: {user.is_verified}")
                print(f"  Creado: {user.date_joined}")
                print("-" * 70)
    except Exception as e:
        print(f"Error: {e}")

def show_exercises():
    """Muestra información de ejercicios"""
    print_section("EJERCICIOS (workouts_exercise)")
    try:
        from workouts.models import Exercise
        
        total = Exercise.objects.count()
        print(f"Total de ejercicios: {total}")
        
        if total > 0:
            print("\nEjercicios (primeros 10):")
            print("-" * 70)
            exercises = Exercise.objects.all()[:10]
            for ex in exercises:
                print(f"  ID: {ex.id}")
                print(f"  Nombre: {ex.name}")
                print(f"  Categoría: {ex.category}")
                print(f"  Grupos musculares: {ex.muscle_groups}")
                print(f"  Video: {'Sí' if ex.has_video else 'No'}")
                print("-" * 70)
    except Exception as e:
        print(f"Error: {e}")

def show_nutrition_plans():
    """Muestra información de planes nutricionales"""
    print_section("PLANES NUTRICIONALES (nutrition_defaultnutritionplan)")
    try:
        from nutrition.models import DefaultNutritionPlan
        
        total = DefaultNutritionPlan.objects.count()
        print(f"Total de planes nutricionales: {total}")
        
        if total > 0:
            print("\nPlanes (primeros 10):")
            print("-" * 70)
            plans = DefaultNutritionPlan.objects.all()[:10]
            for plan in plans:
                print(f"  ID: {plan.id}")
                print(f"  Nombre: {plan.name}")
                print(f"  Rol mínimo: {plan.min_role_required}")
                print(f"  Es por defecto: {plan.is_default}")
                print(f"  Descripción: {plan.description[:50]}..." if len(plan.description) > 50 else f"  Descripción: {plan.description}")
                print("-" * 70)
    except Exception as e:
        print(f"Error: {e}")

def show_workout_programs():
    """Muestra información de programas de entrenamiento"""
    print_section("PROGRAMAS DE ENTRENAMIENTO")
    try:
        from workouts.models import DefaultWorkoutProgram, WorkoutProgram
        
        default_total = DefaultWorkoutProgram.objects.count()
        user_total = WorkoutProgram.objects.count()
        
        print(f"Programas por defecto: {default_total}")
        print(f"Programas de usuarios: {user_total}")
        
        if default_total > 0:
            print("\nProgramas por defecto (primeros 5):")
            print("-" * 70)
            programs = DefaultWorkoutProgram.objects.all()[:5]
            for prog in programs:
                print(f"  Nombre: {prog.name}")
                print(f"  Nivel: {prog.level}")
                print(f"  Objetivo: {prog.goal}")
                print(f"  Días por semana: {prog.days_per_week}")
                print("-" * 70)
    except Exception as e:
        print(f"Error: {e}")

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
            
            print(f"Total de tablas: {len(tables)}\n")
            
            for table in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table};")
                    count = cursor.fetchone()[0]
                    if count > 0:
                        print(f"  {table:50} {count:>6} registros")
                except Exception as e:
                    print(f"  {table:50} ERROR: {str(e)[:30]}")
    except Exception as e:
        print(f"Error: {e}")

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
                print(f"\n{table}:")
                print(f"  Registros: {count}")
                if columns_info:
                    print(f"  Columnas: {len(columns_info)}")
                    # Mostrar algunas columnas principales
                    main_cols = [col[0] for col in columns_info[:5]]
                    print(f"  Principales: {', '.join(main_cols)}")
        except Exception as e:
            pass

def main():
    print("\n" + "="*70)
    print("  CONTENIDO DE LA BASE DE DATOS - Nex-Fit")
    print("="*70)
    
    # Verificar conexión
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"\n✅ Conectado a: {settings.DATABASES['default']['NAME']}")
            print(f"   PostgreSQL: {version[0][:50]}...")
    except Exception as e:
        print(f"\n❌ Error de conexión: {e}")
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
    print("\nPara más detalles, ejecuta consultas SQL directamente o usa:")
    print("  docker compose exec db psql -U postgres -d mykaizenfit")

if __name__ == '__main__':
    main()

