#!/usr/bin/env python
"""
Script para configurar PostgreSQL para NexFit365
Permite:
1. Cambiar contraseña del usuario postgres
2. Crear un nuevo usuario y base de datos
3. Actualizar el archivo .env con las nuevas credenciales
"""
import os
import sys
import subprocess
from pathlib import Path

def run_psql_command(command, user='postgres', password=None):
    """Ejecutar comando SQL en PostgreSQL"""
    env = os.environ.copy()
    if password:
        env['PGPASSWORD'] = password
    
    try:
        # Intentar con psql
        cmd = ['psql', '-U', user, '-d', 'postgres', '-c', command]
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

def change_postgres_password(new_password):
    """Cambiar la contraseña del usuario postgres"""
    print(f"\n🔐 Cambiando contraseña del usuario 'postgres'...")
    
    # Comando SQL para cambiar contraseña
    sql_command = f"ALTER USER postgres WITH PASSWORD '{new_password}';"
    
    print("⚠️  Necesitarás la contraseña actual de postgres (o presiona Enter si no tiene)")
    current_password = input("Contraseña actual de postgres (o Enter si no tiene): ").strip()
    
    success, stdout, stderr = run_psql_command(sql_command, password=current_password)
    
    if success:
        print("✅ Contraseña cambiada exitosamente")
        return new_password
    else:
        print(f"❌ Error: {stderr}")
        print("\n💡 Alternativa: Ejecuta manualmente en psql:")
        print(f"   psql -U postgres -d postgres")
        print(f"   ALTER USER postgres WITH PASSWORD '{new_password}';")
        return None

def create_new_user_and_db(username, password, dbname):
    """Crear un nuevo usuario y base de datos"""
    print(f"\n👤 Creando nuevo usuario '{username}' y base de datos '{dbname}'...")
    
    commands = [
        f"CREATE USER {username} WITH PASSWORD '{password}';",
        f"CREATE DATABASE {dbname} OWNER {username};",
        f"GRANT ALL PRIVILEGES ON DATABASE {dbname} TO {username};",
    ]
    
    print("⚠️  Necesitarás la contraseña de un usuario con privilegios (postgres o superusuario)")
    admin_password = input("Contraseña del administrador postgres: ").strip()
    
    for cmd in commands:
        success, stdout, stderr = run_psql_command(cmd, password=admin_password)
        if not success:
            if 'already exists' in stderr.lower():
                print(f"⚠️  {cmd.split()[1]} ya existe, continuando...")
            else:
                print(f"❌ Error ejecutando: {cmd}")
                print(f"   {stderr}")
                return False
    
    print("✅ Usuario y base de datos creados exitosamente")
    return True

def update_env_file(db_name, db_user, db_password, db_host='localhost', db_port='5432'):
    """Actualizar el archivo .env con las nuevas credenciales"""
    env_path = Path(__file__).parent / '.env'
    
    if not env_path.exists():
        print(f"❌ No se encontró el archivo .env en {env_path}")
        return False
    
    print(f"\n📝 Actualizando archivo .env...")
    
    # Leer el archivo actual
    try:
        with open(env_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"❌ Error leyendo .env: {e}")
        return False
    
    # Actualizar o agregar las variables
    updated = False
    new_lines = []
    db_vars = {
        'DB_NAME': db_name,
        'DB_USER': db_user,
        'DB_PASSWORD': db_password,
        'DB_HOST': db_host,
        'DB_PORT': db_port,
    }
    
    for line in lines:
        line_stripped = line.strip()
        updated_line = False
        
        for var_name, var_value in db_vars.items():
            if line_stripped.startswith(f'{var_name}='):
                new_lines.append(f'{var_name}={var_value}\n')
                updated = True
                updated_line = True
                break
        
        if not updated_line:
            new_lines.append(line)
    
    # Agregar variables que no existían
    for var_name, var_value in db_vars.items():
        if not any(line.strip().startswith(f'{var_name}=') for line in new_lines):
            new_lines.append(f'{var_name}={var_value}\n')
            updated = True
    
    # Escribir el archivo actualizado
    try:
        with open(env_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print("✅ Archivo .env actualizado")
        return True
    except Exception as e:
        print(f"❌ Error escribiendo .env: {e}")
        return False

def main():
    print("=" * 60)
    print("🔧 CONFIGURACIÓN DE POSTGRESQL PARA NEXFIT365")
    print("=" * 60)
    print("\nOpciones:")
    print("1. Cambiar contraseña del usuario 'postgres' existente")
    print("2. Crear nuevo usuario y base de datos")
    print("3. Solo actualizar archivo .env (sin tocar PostgreSQL)")
    
    choice = input("\nSelecciona una opción (1/2/3): ").strip()
    
    if choice == '1':
        new_password = input("\nNueva contraseña para 'postgres': ").strip()
        if new_password:
            password = change_postgres_password(new_password)
            if password:
                update_env_file('mykaizenfit_dev', 'postgres', password)
        else:
            print("❌ La contraseña no puede estar vacía")
    
    elif choice == '2':
        username = input("\nNombre del nuevo usuario (ej: nexfit_user): ").strip()
        password = input("Contraseña para el nuevo usuario: ").strip()
        dbname = input("Nombre de la base de datos (ej: mykaizenfit_dev): ").strip()
        
        if username and password and dbname:
            if create_new_user_and_db(username, password, dbname):
                update_env_file(dbname, username, password)
        else:
            print("❌ Todos los campos son requeridos")
    
    elif choice == '3':
        print("\n📝 Actualizar archivo .env manualmente:")
        db_name = input("DB_NAME: ").strip() or 'mykaizenfit_dev'
        db_user = input("DB_USER: ").strip() or 'postgres'
        db_password = input("DB_PASSWORD: ").strip()
        db_host = input("DB_HOST [localhost]: ").strip() or 'localhost'
        db_port = input("DB_PORT [5432]: ").strip() or '5432'
        
        if db_password:
            update_env_file(db_name, db_user, db_password, db_host, db_port)
        else:
            print("❌ La contraseña es requerida")
    
    else:
        print("❌ Opción inválida")
    
    print("\n" + "=" * 60)
    print("✅ Configuración completada")
    print("=" * 60)
    print("\n💡 Próximos pasos:")
    print("   1. Verifica que PostgreSQL esté corriendo")
    print("   2. Ejecuta: python manage.py migrate accounts")
    print("   3. Si hay errores, verifica las credenciales en .env")

if __name__ == '__main__':
    main()


