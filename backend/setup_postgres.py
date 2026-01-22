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
    
    # Comando SQL para cambiar contraseña
    sql_command = f"ALTER USER postgres WITH PASSWORD '{new_password}';"
    
    current_password = input("Contraseña actual de postgres (o Enter si no tiene): ").strip()
    
    success, stdout, stderr = run_psql_command(sql_command, password=current_password)
    
    if success:
        return new_password
    else:
        return None

def create_new_user_and_db(username, password, dbname):
    """Crear un nuevo usuario y base de datos"""
    
    commands = [
        f"CREATE USER {username} WITH PASSWORD '{password}';",
        f"CREATE DATABASE {dbname} OWNER {username};",
        f"GRANT ALL PRIVILEGES ON DATABASE {dbname} TO {username};",
    ]
    
    admin_password = input("Contraseña del administrador postgres: ").strip()
    
    for cmd in commands:
        success, stdout, stderr = run_psql_command(cmd, password=admin_password)
        if not success:
            if 'already exists' in stderr.lower():
            else:
                return False
    
    return True

def update_env_file(db_name, db_user, db_password, db_host='localhost', db_port='5432'):
    """Actualizar el archivo .env con las nuevas credenciales"""
    env_path = Path(__file__).parent / '.env'
    
    if not env_path.exists():
        return False
    
    
    # Leer el archivo actual
    try:
        with open(env_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
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
        return True
    except Exception as e:
        return False

def main():
    
    choice = input("\nSelecciona una opción (1/2/3): ").strip()
    
    if choice == '1':
        new_password = input("\nNueva contraseña para 'postgres': ").strip()
        if new_password:
            password = change_postgres_password(new_password)
            if password:
                update_env_file('mykaizenfit_dev', 'postgres', password)
        else:
    
    elif choice == '2':
        username = input("\nNombre del nuevo usuario (ej: nexfit_user): ").strip()
        password = input("Contraseña para el nuevo usuario: ").strip()
        dbname = input("Nombre de la base de datos (ej: mykaizenfit_dev): ").strip()
        
        if username and password and dbname:
            if create_new_user_and_db(username, password, dbname):
                update_env_file(dbname, username, password)
        else:
    
    elif choice == '3':
        db_name = input("DB_NAME: ").strip() or 'mykaizenfit_dev'
        db_user = input("DB_USER: ").strip() or 'postgres'
        db_password = input("DB_PASSWORD: ").strip()
        db_host = input("DB_HOST [localhost]: ").strip() or 'localhost'
        db_port = input("DB_PORT [5432]: ").strip() or '5432'
        
        if db_password:
            update_env_file(db_name, db_user, db_password, db_host, db_port)
        else:
    
    else:
    

if __name__ == '__main__':
    main()




