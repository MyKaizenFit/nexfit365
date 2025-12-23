#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de diagnóstico para identificar problemas de codificación UTF-8 en la base de datos.
Verifica la configuración de PostgreSQL y detecta datos con problemas de codificación.
"""
import os
import sys
import django
import re

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
from django.db.models import Q
from django.conf import settings

def check_database_encoding():
    """Verifica la codificación de la base de datos PostgreSQL"""
    print("=" * 70)
    print("🔍 VERIFICANDO CONFIGURACIÓN DE CODIFICACIÓN")
    print("=" * 70)
    
    try:
        with connection.cursor() as cursor:
            # Verificar codificación de la base de datos
            cursor.execute("SELECT datname, pg_encoding_to_char(encoding) as encoding FROM pg_database WHERE datname = current_database();")
            db_info = cursor.fetchone()
            
            if db_info:
                db_name, encoding = db_info
                print(f"\n📊 Base de datos: {db_name}")
                print(f"   Codificación: {encoding}")
                
                if encoding.upper() != 'UTF8':
                    print(f"   ⚠️  ADVERTENCIA: La base de datos NO está usando UTF8")
                    print(f"      Codificación actual: {encoding}")
                    print(f"      Se recomienda usar UTF8 para soportar caracteres especiales")
                else:
                    print(f"   ✅ La base de datos está usando UTF8")
            
            # Verificar codificación del cliente
            cursor.execute("SHOW client_encoding;")
            client_encoding = cursor.fetchone()[0]
            print(f"\n📊 Cliente (conexión actual):")
            print(f"   Codificación: {client_encoding}")
            
            if client_encoding.upper() != 'UTF8':
                print(f"   ⚠️  ADVERTENCIA: El cliente NO está usando UTF8")
            else:
                print(f"   ✅ El cliente está usando UTF8")
            
            # Verificar configuración de collation
            cursor.execute("SELECT datcollate, datctype FROM pg_database WHERE datname = current_database();")
            collation_info = cursor.fetchone()
            
            if collation_info:
                datcollate, datctype = collation_info
                print(f"\n📊 Collation:")
                print(f"   Datcollate: {datcollate}")
                print(f"   Datctype: {datctype}")
            
            # Verificar configuración de Django
            print(f"\n📊 Configuración Django:")
            db_options = settings.DATABASES['default'].get('OPTIONS', {})
            client_encoding_config = db_options.get('client_encoding', 'No configurado')
            print(f"   client_encoding en OPTIONS: {client_encoding_config}")
            
            if client_encoding_config.upper() != 'UTF8':
                print(f"   ⚠️  ADVERTENCIA: Django no está configurado para usar UTF8")
            else:
                print(f"   ✅ Django está configurado para usar UTF8")
                
    except Exception as e:
        print(f"❌ Error al verificar codificación: {e}")
        return False
    
    return True

def find_encoding_issues():
    """Busca problemas de codificación en los datos"""
    print("\n" + "=" * 70)
    print("🔍 BUSCANDO PROBLEMAS DE CODIFICACIÓN EN LOS DATOS")
    print("=" * 70)
    
    issues_found = {}
    
    # Patrones comunes de caracteres mal codificados
    problematic_patterns = [
        ('??', 'Caracteres reemplazados por ??'),
        ('Ã³', 'Codificación incorrecta de ó'),
        ('Ã©', 'Codificación incorrecta de é'),
        ('Ã¡', 'Codificación incorrecta de á'),
        ('Ã­', 'Codificación incorrecta de í'),
        ('Ãº', 'Codificación incorrecta de ú'),
        ('Ã±', 'Codificación incorrecta de ñ'),
        ('Ã', 'Caracteres con codificación incorrecta'),
    ]
    
    # Verificar diferentes modelos
    models_to_check = []
    
    try:
        from nutrition.models import Recipe, NutritionPlan, PlanMeal
        models_to_check.extend([
            (Recipe, ['name', 'description', 'instructions']),
            (NutritionPlan, ['name', 'description']),
            (PlanMeal, ['name', 'description']),
        ])
    except Exception as e:
        print(f"⚠️  No se pudo importar modelos de nutrition: {e}")
    
    try:
        from workouts.models import Exercise, WorkoutProgram, WorkoutDay
        models_to_check.extend([
            (Exercise, ['name', 'description', 'instructions']),
            (WorkoutProgram, ['name', 'description']),
            (WorkoutDay, ['name', 'notes']),
        ])
    except Exception as e:
        print(f"⚠️  No se pudo importar modelos de workouts: {e}")
    
    try:
        from accounts.models import CustomUser
        models_to_check.append((CustomUser, ['first_name', 'last_name']))
    except Exception as e:
        print(f"⚠️  No se pudo importar CustomUser: {e}")
    
    try:
        from dashboard.models import WellnessTip
        models_to_check.append((WellnessTip, ['title', 'summary', 'content']))
    except Exception as e:
        print(f"⚠️  No se pudo importar WellnessTip: {e}")
    
    try:
        from notifications.models import MotivationalTip, FeedbackMessage
        models_to_check.extend([
            (MotivationalTip, ['title', 'content']),
            (FeedbackMessage, ['message']),
        ])
    except Exception as e:
        print(f"⚠️  No se pudo importar modelos de notifications: {e}")
    
    total_issues = 0
    
    for model_class, fields in models_to_check:
        model_name = model_class.__name__
        print(f"\n📋 Verificando {model_name}...")
        
        model_issues = {}
        
        for pattern, description in problematic_patterns:
            query = Q()
            for field in fields:
                try:
                    query |= Q(**{f'{field}__icontains': pattern})
                except:
                    pass
            
            try:
                objects_with_issue = model_class.objects.filter(query).distinct()
                count = objects_with_issue.count()
                
                if count > 0:
                    model_issues[pattern] = {
                        'description': description,
                        'count': count,
                        'objects': list(objects_with_issue[:5])  # Primeros 5 ejemplos
                    }
                    total_issues += count
                    print(f"   ⚠️  {description}: {count} objetos encontrados")
            except Exception as e:
                print(f"   ❌ Error verificando {pattern}: {e}")
        
        if model_issues:
            issues_found[model_name] = model_issues
        else:
            print(f"   ✅ No se encontraron problemas")
    
    print(f"\n{'='*70}")
    print(f"📊 RESUMEN")
    print(f"{'='*70}")
    print(f"Total de objetos con problemas: {total_issues}")
    
    if issues_found:
        print(f"\n⚠️  PROBLEMAS ENCONTRADOS:")
        for model_name, patterns in issues_found.items():
            print(f"\n   {model_name}:")
            for pattern, info in patterns.items():
                print(f"      - {info['description']}: {info['count']} objetos")
                if info['objects']:
                    print(f"        Ejemplos:")
                    for obj in info['objects'][:3]:
                        obj_str = str(obj)[:60]
                        print(f"          • {obj_str}")
    else:
        print(f"\n✅ No se encontraron problemas de codificación en los datos")
    
    return issues_found, total_issues

def test_utf8_insertion():
    """Prueba insertar caracteres especiales para verificar que funciona"""
    print("\n" + "=" * 70)
    print("🧪 PROBANDO INSERCIÓN DE CARACTERES ESPECIALES")
    print("=" * 70)
    
    test_strings = [
        "César",
        "Atún",
        "Mediterránea",
        "Salmón",
        "Piña",
        "Español",
        "José María",
        "Niño",
        "Año",
        "Corazón",
    ]
    
    print("\nProbando caracteres especiales:")
    for test_str in test_strings:
        try:
            # Intentar codificar y decodificar
            encoded = test_str.encode('utf-8')
            decoded = encoded.decode('utf-8')
            
            if decoded == test_str:
                print(f"   ✅ {test_str}")
            else:
                print(f"   ❌ {test_str} -> {decoded}")
        except Exception as e:
            print(f"   ❌ Error con {test_str}: {e}")

def main():
    print("\n" + "=" * 70)
    print("🔍 DIAGNÓSTICO DE PROBLEMAS UTF-8")
    print("=" * 70)
    
    # Verificar configuración de la base de datos
    db_ok = check_database_encoding()
    
    # Buscar problemas en los datos
    issues, total_issues = find_encoding_issues()
    
    # Probar inserción de caracteres especiales
    test_utf8_insertion()
    
    # Resumen final
    print("\n" + "=" * 70)
    print("📋 RESUMEN FINAL")
    print("=" * 70)
    
    if db_ok and total_issues == 0:
        print("✅ Todo está correctamente configurado")
        print("   - La base de datos usa UTF8")
        print("   - No se encontraron problemas en los datos")
    else:
        print("⚠️  SE ENCONTRARON PROBLEMAS:")
        if not db_ok:
            print("   - Problemas en la configuración de la base de datos")
        if total_issues > 0:
            print(f"   - {total_issues} objetos con problemas de codificación")
        print("\n💡 RECOMENDACIONES:")
        print("   1. Ejecutar el script de corrección: python scripts/fix_all_utf8_encoding.py")
        print("   2. Verificar que la base de datos esté creada con UTF8")
        print("   3. Asegurar que todas las conexiones usen UTF8")
    
    print("=" * 70 + "\n")

if __name__ == '__main__':
    main()

