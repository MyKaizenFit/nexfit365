#!/usr/bin/env python
"""
Script para verificar el estado de la base de datos:
- Conexión a la base de datos
- Tablas existentes
- Migraciones aplicadas
- Conteo de registros por tabla
- Estado de la base de datos
"""
import os
import sys
import django

# Configurar Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
from django.core.management import call_command
from django.apps import apps
from django.db import models
from django.conf import settings

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def check_database_connection():
    """Verifica la conexión a la base de datos"""
    print_section("VERIFICACIÓN DE CONEXIÓN")
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"✅ Conexión exitosa a PostgreSQL")
            print(f"   Versión: {version[0]}")
            
            # Verificar configuración de la base de datos
            db_config = settings.DATABASES['default']
            print(f"\n📋 Configuración de la base de datos:")
            print(f"   Nombre: {db_config['NAME']}")
            print(f"   Usuario: {db_config['USER']}")
            print(f"   Host: {db_config['HOST']}")
            print(f"   Puerto: {db_config['PORT']}")
            return True
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return False

def list_tables():
    """Lista todas las tablas en la base de datos"""
    print_section("TABLAS EN LA BASE DE DATOS")
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = cursor.fetchall()
            print(f"Total de tablas: {len(tables)}")
            for table in tables:
                print(f"  - {table[0]}")
            return [t[0] for t in tables]
    except Exception as e:
        print(f"❌ Error al listar tablas: {e}")
        return []

def check_migrations():
    """Verifica el estado de las migraciones"""
    print_section("ESTADO DE MIGRACIONES")
    try:
        from django.db.migrations.recorder import MigrationRecorder
        recorder = MigrationRecorder(connection)
        applied = recorder.applied_migrations()
        
        print(f"Total de migraciones aplicadas: {len(applied)}")
        
        # Agrupar por app
        by_app = {}
        for migration in applied:
            app = migration[0]
            if app not in by_app:
                by_app[app] = []
            by_app[app].append(migration[1])
        
        for app in sorted(by_app.keys()):
            print(f"\n  {app}: {len(by_app[app])} migraciones")
            for mig in sorted(by_app[app])[-5:]:  # Mostrar últimas 5
                print(f"    - {mig}")
            if len(by_app[app]) > 5:
                print(f"    ... y {len(by_app[app]) - 5} más")
        
        return applied
    except Exception as e:
        print(f"❌ Error al verificar migraciones: {e}")
        return []

def count_records():
    """Cuenta registros en cada tabla de modelos Django"""
    print_section("CONTEO DE REGISTROS POR TABLA")
    
    models_list = []
    for app_config in apps.get_app_configs():
        for model in app_config.get_models():
            if not model._meta.abstract:
                models_list.append(model)
    
    total_records = 0
    for model in sorted(models_list, key=lambda x: x._meta.label):
        try:
            count = model.objects.count()
            total_records += count
            if count > 0:
                print(f"  {model._meta.label:50} {count:>6} registros")
        except Exception as e:
            print(f"  {model._meta.label:50} ERROR: {e}")
    
    print(f"\n  Total de registros en todas las tablas: {total_records}")

def check_database_size():
    """Verifica el tamaño de la base de datos"""
    print_section("TAMAÑO DE LA BASE DE DATOS")
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    pg_size_pretty(pg_database_size(current_database())) as size,
                    pg_database_size(current_database()) as size_bytes;
            """)
            result = cursor.fetchone()
            print(f"Tamaño de la base de datos: {result[0]} ({result[1]} bytes)")
            
            # Tamaño por tabla
            cursor.execute("""
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
                    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
                FROM pg_tables
                WHERE schemaname = 'public'
                ORDER BY size_bytes DESC
                LIMIT 10;
            """)
            tables = cursor.fetchall()
            print("\nTop 10 tablas por tamaño:")
            for table in tables:
                print(f"  {table[1]:40} {table[2]:>10}")
    except Exception as e:
        print(f"❌ Error al verificar tamaño: {e}")

def check_indexes():
    """Verifica índices en la base de datos"""
    print_section("ÍNDICES EN LA BASE DE DATOS")
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    tablename,
                    indexname,
                    indexdef
                FROM pg_indexes
                WHERE schemaname = 'public'
                ORDER BY tablename, indexname
                LIMIT 20;
            """)
            indexes = cursor.fetchall()
            print(f"Total de índices (mostrando primeros 20):")
            for idx in indexes:
                print(f"  {idx[0]}.{idx[1]}")
    except Exception as e:
        print(f"❌ Error al verificar índices: {e}")

def check_pending_migrations():
    """Verifica si hay migraciones pendientes"""
    print_section("MIGRACIONES PENDIENTES")
    try:
        from io import StringIO
        from django.core.management import call_command
        
        out = StringIO()
        call_command('showmigrations', '--plan', stdout=out)
        output = out.getvalue()
        
        pending = [line for line in output.split('\n') if '[ ]' in line]
        if pending:
            print(f"⚠️  Hay {len(pending)} migraciones pendientes:")
            for line in pending[:10]:
                print(f"  {line}")
            if len(pending) > 10:
                print(f"  ... y {len(pending) - 10} más")
        else:
            print("✅ Todas las migraciones están aplicadas")
    except Exception as e:
        print(f"❌ Error al verificar migraciones pendientes: {e}")

def main():
    print("\n" + "="*60)
    print("  VERIFICACIÓN DE BASE DE DATOS - Nex-Fit")
    print("="*60)
    
    # Verificar conexión
    if not check_database_connection():
        print("\n❌ No se pudo conectar a la base de datos. Verifica la configuración.")
        sys.exit(1)
    
    # Listar tablas
    tables = list_tables()
    
    # Verificar migraciones
    applied_migrations = check_migrations()
    
    # Verificar migraciones pendientes
    check_pending_migrations()
    
    # Contar registros
    count_records()
    
    # Verificar tamaño
    check_database_size()
    
    # Verificar índices
    check_indexes()
    
    print_section("RESUMEN")
    print(f"✅ Base de datos: {settings.DATABASES['default']['NAME']}")
    print(f"✅ Tablas encontradas: {len(tables)}")
    print(f"✅ Migraciones aplicadas: {len(applied_migrations)}")
    print("\n" + "="*60)

if __name__ == '__main__':
    main()

