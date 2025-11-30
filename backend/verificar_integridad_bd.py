#!/usr/bin/env python
"""
Script para verificar la integridad de la base de datos de desarrollo
Especialmente enfocado en problemas relacionados con menús
"""
import os
import sys
import django

# Configurar Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
from nutrition.models import DefaultNutritionPlan, DefaultMeal, Recipe, DailyMealSelection

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def check_connection():
    """Verifica la conexión a la base de datos"""
    print_section("VERIFICACIÓN DE CONEXIÓN")
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"✅ Conexión exitosa a PostgreSQL")
            print(f"   Versión: {version[0][:50]}...")
            return True
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return False

def check_orphan_meals():
    """Verifica menús huérfanos (sin plan asociado)"""
    print_section("VERIFICANDO MENÚS HUÉRFANOS")
    
    try:
        with connection.cursor() as cursor:
            # Menús sin plan válido
            cursor.execute("""
                SELECT dm.id, dm.name, dm.plan_id 
                FROM nutrition_defaultmeal dm
                LEFT JOIN nutrition_defaultnutritionplan dnp ON dm.plan_id = dnp.id
                WHERE dnp.id IS NULL;
            """)
            orphan_meals = cursor.fetchall()
            
            if orphan_meals:
                print(f"❌ PROBLEMA: Encontrados {len(orphan_meals)} menús huérfanos")
                print("\n   Primeros 10 menús huérfanos:")
                for meal in orphan_meals[:10]:
                    meal_id, name, plan_id = meal
                    print(f"      - ID: {meal_id}, Nombre: {name}, Plan ID: {plan_id}")
                if len(orphan_meals) > 10:
                    print(f"      ... y {len(orphan_meals) - 10} más")
                return False
            else:
                print("✅ No hay menús huérfanos")
                return True
    except Exception as e:
        print(f"❌ Error al verificar menús huérfanos: {e}")
        return False

def check_invalid_selections():
    """Verifica selecciones diarias con menús inválidos"""
    print_section("VERIFICANDO SELECCIONES DIARIAS INVÁLIDAS")
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT dms.id, dms.selected_meal_id 
                FROM nutrition_dailymealselection dms
                LEFT JOIN nutrition_defaultmeal dm ON dms.selected_meal_id = dm.id
                WHERE dm.id IS NULL;
            """)
            invalid_selections = cursor.fetchall()
            
            if invalid_selections:
                print(f"❌ PROBLEMA: Encontradas {len(invalid_selections)} selecciones inválidas")
                return False
            else:
                print("✅ No hay selecciones diarias inválidas")
                return True
    except Exception as e:
        print(f"❌ Error al verificar selecciones: {e}")
        return False

def check_data_counts():
    """Verifica los conteos de datos"""
    print_section("CONTEO DE DATOS")
    
    try:
        plan_count = DefaultNutritionPlan.objects.count()
        meal_count = DefaultMeal.objects.count()
        recipe_count = Recipe.objects.count()
        selection_count = DailyMealSelection.objects.count()
        
        print(f"   Planes nutricionales: {plan_count}")
        print(f"   Menús (DefaultMeal): {meal_count}")
        print(f"   Recetas: {recipe_count}")
        print(f"   Selecciones diarias: {selection_count}")
        
        # Verificar planes sin menús
        plans_without_meals = DefaultNutritionPlan.objects.filter(meals__isnull=True).count()
        if plans_without_meals > 0:
            print(f"\n   ⚠️  Planes sin menús: {plans_without_meals}")
        else:
            print(f"\n   ✅ Todos los planes tienen menús")
        
        return True
    except Exception as e:
        print(f"❌ Error al contar datos: {e}")
        return False

def check_null_fields():
    """Verifica campos NULL en campos requeridos"""
    print_section("VERIFICANDO CAMPOS NULL INVÁLIDOS")
    
    problems = []
    
    try:
        # Menús sin nombre
        null_names = DefaultMeal.objects.filter(name__isnull=True).count()
        empty_names = DefaultMeal.objects.filter(name='').count()
        if null_names > 0 or empty_names > 0:
            problems.append(f"   - Menús sin nombre: {null_names + empty_names}")
        
        # Menús sin plan_id
        null_plans = DefaultMeal.objects.filter(plan__isnull=True).count()
        if null_plans > 0:
            problems.append(f"   - Menús sin plan_id: {null_plans} (¡CRÍTICO!)")
        
        if problems:
            print("❌ PROBLEMAS ENCONTRADOS:")
            for problem in problems:
                print(problem)
            return False
        else:
            print("✅ Todos los campos requeridos están completos")
            return True
    except Exception as e:
        print(f"❌ Error al verificar campos NULL: {e}")
        return False

def check_foreign_key_integrity():
    """Verifica la integridad de foreign keys"""
    print_section("VERIFICANDO INTEGRIDAD DE FOREIGN KEYS")
    
    problems = []
    
    try:
        # Verificar que todos los plan_id en DefaultMeal existen
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM nutrition_defaultmeal dm
                WHERE NOT EXISTS (
                    SELECT 1 FROM nutrition_defaultnutritionplan dnp 
                    WHERE dnp.id = dm.plan_id
                );
            """)
            invalid_plans = cursor.fetchone()[0]
            if invalid_plans > 0:
                problems.append(f"   - Menús con plan_id inválido: {invalid_plans}")
        
        # Verificar que todas las selecciones diarias tienen menús válidos
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM nutrition_dailymealselection dms
                WHERE NOT EXISTS (
                    SELECT 1 FROM nutrition_defaultmeal dm 
                    WHERE dm.id = dms.selected_meal_id
                );
            """)
            invalid_selections = cursor.fetchone()[0]
            if invalid_selections > 0:
                problems.append(f"   - Selecciones con meal_id inválido: {invalid_selections}")
        
        if problems:
            print("❌ PROBLEMAS DE INTEGRIDAD:")
            for problem in problems:
                print(problem)
            return False
        else:
            print("✅ Todas las foreign keys son válidas")
            return True
    except Exception as e:
        print(f"❌ Error al verificar integridad: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("  VERIFICACIÓN DE INTEGRIDAD - BASE DE DATOS DEV")
    print("="*60)
    
    # Verificar conexión
    if not check_connection():
        print("\n❌ No se pudo conectar a la base de datos")
        sys.exit(1)
    
    all_checks_passed = True
    
    # Verificar conteos
    check_data_counts()
    
    # Verificar integridad
    if not check_orphan_meals():
        all_checks_passed = False
    
    if not check_invalid_selections():
        all_checks_passed = False
    
    if not check_null_fields():
        all_checks_passed = False
    
    if not check_foreign_key_integrity():
        all_checks_passed = False
    
    # Resumen final
    print_section("RESUMEN")
    
    if all_checks_passed:
        print("✅ Todos los checks pasaron. La base de datos parece estar en buen estado.")
    else:
        print("❌ Se encontraron problemas de integridad en la base de datos.")
        print("\n💡 RECOMENDACIONES:")
        print("   1. Restaurar desde un backup anterior a la carga de menús")
        print("   2. O eliminar los datos corruptos manualmente")
        print("   3. Ejecutar: ./diagnosticar_y_recuperar_bd.sh para opciones de recuperación")
        sys.exit(1)

if __name__ == '__main__':
    main()
