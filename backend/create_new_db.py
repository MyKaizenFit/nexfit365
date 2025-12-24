#!/usr/bin/env python
"""
Script simple para crear nuevo usuario y base de datos PostgreSQL
Usa la contraseña proporcionada para crear un nuevo usuario
"""
import subprocess
import sys
from pathlib import Path

def run_psql_command(sql_command, user='postgres', password=None, database='postgres'):
    """Ejecutar comando SQL"""
    env = {}
    if password:
        env['PGPASSWORD'] = password
    
    # Intentar con psql
    cmd = ['psql', '-U', user, '-d', database, '-c', sql_command]
    
    try:
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True,
            input=password if password else ''
        )
        return result.returncode == 0, result.stdout, result.stderr
    except FileNotFoundError:
        return False, None, "psql no está instalado o no está en el PATH"

def update_env_file(db_name, db_user, db_password):
    """Actualizar .env con nuevas credenciales"""
    env_path = Path(__file__).parent / '.env'
    
    # Crear contenido mínimo del .env
    content = f"""DB_NAME={db_name}
DB_USER={db_user}
DB_PASSWORD={db_password}
DB_HOST=localhost
DB_PORT=5432
DB_SSLMODE=disable
"""
    
    try:
        with open(env_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Archivo .env actualizado")
        return True
    except Exception as e:
        print(f"❌ Error escribiendo .env: {e}")
        return False

def main():
    print("=" * 60)
    print("🔧 CREAR NUEVO USUARIO Y BASE DE DATOS")
    print("=" * 60)
    print()
    
    # Credenciales del nuevo usuario
    new_username = 'nexfit_user'
    new_password = 'piaPL.1.1'
    new_dbname = 'mykaizenfit_dev'
    
    print(f"📋 Configuración:")
    print(f"   Usuario: {new_username}")
    print(f"   Contraseña: {new_password}")
    print(f"   Base de datos: {new_dbname}")
    print()
    
    # Intentar crear sin contraseña de admin primero
    print("🔍 Intentando crear usuario y base de datos...")
    print("   (Intentando sin contraseña de admin primero)")
    
    # Crear usuario
    create_user_sql = f"CREATE USER {new_username} WITH PASSWORD '{new_password}';"
    success, stdout, stderr = run_psql_command(create_user_sql)
    
    if not success:
        if 'already exists' in stderr.lower():
            print(f"⚠️  Usuario {new_username} ya existe, continuando...")
        else:
            print(f"⚠️  No se pudo crear usuario sin contraseña: {stderr}")
            print()
            print("💡 Necesitas ejecutar estos comandos manualmente en psql:")
            print()
            print("   1. Conecta a PostgreSQL:")
            print("      psql -U postgres")
            print()
            print("   2. Ejecuta estos comandos SQL:")
            print(f"      CREATE USER {new_username} WITH PASSWORD '{new_password}';")
            print(f"      CREATE DATABASE {new_dbname} OWNER {new_username};")
            print(f"      GRANT ALL PRIVILEGES ON DATABASE {new_dbname} TO {new_username};")
            print()
            print("   3. Luego ejecuta este script de nuevo para actualizar .env")
            return
    
    # Crear base de datos
    create_db_sql = f"CREATE DATABASE {new_dbname} OWNER {new_username};"
    success, stdout, stderr = run_psql_command(create_db_sql)
    
    if not success:
        if 'already exists' in stderr.lower():
            print(f"⚠️  Base de datos {new_dbname} ya existe")
        else:
            print(f"❌ Error creando base de datos: {stderr}")
            return
    
    # Dar permisos
    grant_sql = f"GRANT ALL PRIVILEGES ON DATABASE {new_dbname} TO {new_username};"
    success, stdout, stderr = run_psql_command(grant_sql)
    
    if success or 'already exists' in stderr.lower():
        print("✅ Usuario y base de datos configurados")
    else:
        print(f"⚠️  Error dando permisos: {stderr}")
    
    # Actualizar .env
    print()
    print("📝 Actualizando archivo .env...")
    update_env_file(new_dbname, new_username, new_password)
    
    print()
    print("=" * 60)
    print("✅ CONFIGURACIÓN COMPLETADA")
    print("=" * 60)
    print()
    print("💡 Próximos pasos:")
    print("   1. Si tenías datos en la base de datos anterior, necesitarás migrarlos")
    print("   2. Ejecuta las migraciones:")
    print("      python manage.py migrate")
    print("   3. Si necesitas migrar datos de la BD anterior, usa:")
    print("      python migrate_database.py")
    print()

if __name__ == '__main__':
    main()



