#!/usr/bin/env python
"""
Script de pruebas para verificar que la base de datos ddbb_nextfit
está funcionando correctamente y que Django la está utilizando
"""
import os
import sys
import django
from pathlib import Path

# Configurar Django
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
from django.conf import settings
from django.core.management import execute_from_command_line

def print_section(title):
    """Imprimir un título de sección"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def test_1_env_configuration():
    """Prueba 1: Verificar configuración del .env"""
    print_section("PRUEBA 1: Configuración del .env")
    
    db_config = settings.DATABASES['default']
    print(f"[OK] DB_NAME: {db_config['NAME']}")
    print(f"[OK] DB_USER: {db_config['USER']}")
    print(f"[OK] DB_HOST: {db_config['HOST']}")
    print(f"[OK] DB_PORT: {db_config['PORT']}")
    print(f"[OK] DB_SSLMODE: {db_config['OPTIONS'].get('sslmode', 'N/A')}")
    
    expected_name = 'ddbb_nextfit'
    expected_user = 'nexfit_app'
    
    if db_config['NAME'] == expected_name and db_config['USER'] == expected_user:
        print(f"\n[OK] Configuracion correcta: usando {expected_name} con usuario {expected_user}")
        return True
    else:
        print(f"\n[ERROR] Configuracion incorrecta: esperado {expected_name}/{expected_user}")
        return False

def test_2_database_connection():
    """Prueba 2: Verificar conexión a la base de datos"""
    print_section("PRUEBA 2: Conexión a la base de datos")
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            print(f"[OK] PostgreSQL version: {version.split(',')[0]}")
            
            cursor.execute("SELECT current_database(), current_user;")
            db_name, db_user = cursor.fetchone()
            print(f"[OK] Base de datos actual: {db_name}")
            print(f"[OK] Usuario actual: {db_user}")
            
            if db_name == 'ddbb_nextfit' and db_user == 'nexfit_app':
                print("\n[OK] Conexion exitosa con las credenciales correctas")
                return True
            else:
                print(f"\n[WARNING] Conexion exitosa pero con credenciales diferentes")
                return False
    except Exception as e:
        print(f"\n[ERROR] Error de conexion: {e}")
        return False

def test_3_tables_exist():
    """Prueba 3: Verificar que las tablas existen"""
    print_section("PRUEBA 3: Verificación de tablas")
    
    try:
        with connection.cursor() as cursor:
            # Contar tablas
            cursor.execute("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE';
            """)
            table_count = cursor.fetchone()[0]
            print(f"[OK] Total de tablas: {table_count}")
            
            # Listar algunas tablas importantes
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
                LIMIT 10;
            """)
            tables = cursor.fetchall()
            print("\n[OK] Primeras 10 tablas encontradas:")
            for table in tables:
                print(f"  - {table[0]}")
            
            # Verificar tablas principales de Django
            important_tables = [
                'django_migrations',
                'accounts_customuser',
                'auth_user',
                'django_content_type'
            ]
            
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = ANY(%s);
            """, [important_tables])
            
            found_tables = [row[0] for row in cursor.fetchall()]
            print(f"\n[OK] Tablas importantes de Django encontradas: {len(found_tables)}/{len(important_tables)}")
            for table in found_tables:
                print(f"  [OK] {table}")
            
            if table_count > 0:
                print(f"\n[OK] Base de datos tiene {table_count} tablas")
                return True
            else:
                print("\n[ERROR] No se encontraron tablas en la base de datos")
                return False
                
    except Exception as e:
        print(f"\n[ERROR] Error verificando tablas: {e}")
        return False

def test_4_data_integrity():
    """Prueba 4: Verificar integridad de datos"""
    print_section("PRUEBA 4: Integridad de datos")
    
    try:
        with connection.cursor() as cursor:
            # Verificar que hay datos en algunas tablas clave
            tables_to_check = [
                ('django_migrations', 'migraciones de Django'),
                ('accounts_customuser', 'usuarios'),
            ]
            
            all_have_data = True
            for table_name, description in tables_to_check:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
                    count = cursor.fetchone()[0]
                    print(f"[OK] {description.capitalize()}: {count} registros")
                    if count == 0:
                        all_have_data = False
                except Exception as e:
                    print(f"[WARNING]  No se pudo verificar {table_name}: {e}")
                    all_have_data = False
            
            if all_have_data:
                print("\n[OK] Las tablas principales tienen datos")
            else:
                print("\n[WARNING]  Algunas tablas están vacías (puede ser normal si es una BD nueva)")
            
            return True
            
    except Exception as e:
        print(f"\n[ERROR] Error verificando datos: {e}")
        return False

def test_5_django_models():
    """Prueba 5: Verificar que Django puede acceder a los modelos"""
    print_section("PRUEBA 5: Acceso a modelos de Django")
    
    try:
        from accounts.models import CustomUser
        from django.contrib.contenttypes.models import ContentType
        
        # Contar usuarios
        user_count = CustomUser.objects.count()
        print(f"[OK] Total de usuarios: {user_count}")
        
        # Contar content types
        content_type_count = ContentType.objects.count()
        print(f"[OK] Content types: {content_type_count}")
        
        # Intentar obtener el primer usuario si existe
        if user_count > 0:
            first_user = CustomUser.objects.first()
            print(f"[OK] Primer usuario: {first_user.email if hasattr(first_user, 'email') else 'N/A'}")
        
        print("\n[OK] Django puede acceder correctamente a los modelos")
        return True
        
    except Exception as e:
        print(f"\n[ERROR] Error accediendo a modelos: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_6_write_operation():
    """Prueba 6: Verificar operaciones de escritura"""
    print_section("PRUEBA 6: Operaciones de escritura")
    
    try:
        with connection.cursor() as cursor:
            # Crear una tabla temporal de prueba
            cursor.execute("""
                CREATE TEMP TABLE test_write_operation (
                    id SERIAL PRIMARY KEY,
                    test_data TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Insertar un registro de prueba
            cursor.execute("""
                INSERT INTO test_write_operation (test_data) 
                VALUES ('Test de escritura desde Django');
            """)
            
            # Leer el registro
            cursor.execute("SELECT test_data FROM test_write_operation WHERE id = 1;")
            result = cursor.fetchone()[0]
            
            if result == 'Test de escritura desde Django':
                print("[OK] Escritura: OK")
                print("[OK] Lectura: OK")
                print("\n[OK] Operaciones de escritura/lectura funcionan correctamente")
                return True
            else:
                print("\n[ERROR] Error en operaciones de escritura/lectura")
                return False
                
    except Exception as e:
        print(f"\n[ERROR] Error en operaciones de escritura: {e}")
        return False

def test_7_migrations_status():
    """Prueba 7: Verificar estado de migraciones"""
    print_section("PRUEBA 7: Estado de migraciones")
    
    try:
        from django.db.migrations.recorder import MigrationRecorder
        from django.apps import apps
        
        recorder = MigrationRecorder(connection)
        applied_migrations = recorder.applied_migrations()
        
        print(f"[OK] Migraciones aplicadas: {len(applied_migrations)}")
        
        # Contar migraciones por app
        apps_with_migrations = {}
        for app, migration in applied_migrations:
            if app not in apps_with_migrations:
                apps_with_migrations[app] = 0
            apps_with_migrations[app] += 1
        
        print("\n[OK] Migraciones por aplicación:")
        for app, count in sorted(apps_with_migrations.items()):
            print(f"  - {app}: {count} migraciones")
        
        if len(applied_migrations) > 0:
            print("\n[OK] Hay migraciones aplicadas en la base de datos")
            return True
        else:
            print("\n[WARNING]  No hay migraciones aplicadas (puede ser normal si se restauró desde backup)")
            return True  # No es un error crítico
            
    except Exception as e:
        print(f"\n[ERROR] Error verificando migraciones: {e}")
        return False

def main():
    """Ejecutar todas las pruebas"""
    print("\n" + "=" * 60)
    print("  TEST DE CONEXIÓN Y FUNCIONAMIENTO DE BASE DE DATOS")
    print("=" * 60)
    print("\nVerificando que ddbb_nextfit está funcionando correctamente...")
    
    results = []
    
    # Ejecutar todas las pruebas
    results.append(("Configuración .env", test_1_env_configuration()))
    results.append(("Conexión a BD", test_2_database_connection()))
    results.append(("Tablas existentes", test_3_tables_exist()))
    results.append(("Integridad de datos", test_4_data_integrity()))
    results.append(("Modelos Django", test_5_django_models()))
    results.append(("Operaciones escritura", test_6_write_operation()))
    results.append(("Estado migraciones", test_7_migrations_status()))
    
    # Resumen final
    print_section("RESUMEN DE PRUEBAS")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "[OK] PASS" if result else "[ERROR] FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\n{'=' * 60}")
    print(f"  Resultado: {passed}/{total} pruebas pasadas")
    print(f"{'=' * 60}\n")
    
    if passed == total:
        print("[SUCCESS] ¡Todas las pruebas pasaron! La base de datos está funcionando correctamente.")
        return 0
    elif passed >= total * 0.7:
        print("[WARNING]  La mayoría de las pruebas pasaron. Revisa las que fallaron.")
        return 1
    else:
        print("[ERROR] Varias pruebas fallaron. Revisa la configuración.")
        return 2

if __name__ == '__main__':
    sys.exit(main())

