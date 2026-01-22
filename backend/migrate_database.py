#!/usr/bin/env python
"""
Script para migrar base de datos PostgreSQL a nuevas credenciales
1. Hace dump de la base de datos actual (si existe)
2. Crea nuevo usuario y base de datos
3. Restaura el dump en la nueva base de datos
"""
import os
import subprocess
import sys
from pathlib import Path
from datetime import datetime

def run_command(cmd, description, check=True):
    """Ejecutar comando y mostrar resultado"""
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=check
        )
        if result.stdout:
        if result.stderr and result.returncode != 0:
        return result.returncode == 0
    except FileNotFoundError:
        return False
    except Exception as e:
        return False

def create_dump(db_name, db_user, db_password, output_file):
    """Crear dump de la base de datos"""
    env = os.environ.copy()
    env['PGPASSWORD'] = db_password
    
    cmd = [
        'pg_dump',
        '-U', db_user,
        '-d', db_name,
        '-F', 'c',  # formato custom
        '-f', str(output_file),
        '--no-owner',
        '--no-acl'
    ]
    
    return run_command(cmd, f"Creando dump de {db_name}", check=False)

def restore_dump(db_name, db_user, db_password, dump_file):
    """Restaurar dump en nueva base de datos"""
    env = os.environ.copy()
    env['PGPASSWORD'] = db_password
    
    cmd = [
        'pg_restore',
        '-U', db_user,
        '-d', db_name,
        '--no-owner',
        '--no-acl',
        str(dump_file)
    ]
    
    return run_command(cmd, f"Restaurando dump en {db_name}", check=False)

def create_user_and_db(username, password, dbname, admin_user='postgres', admin_password=None):
    """Crear nuevo usuario y base de datos usando psql"""
    env = os.environ.copy()
    if admin_password:
        env['PGPASSWORD'] = admin_password
    
    # Crear usuario
    create_user_sql = f"CREATE USER {username} WITH PASSWORD '{password}';"
    cmd_user = ['psql', '-U', admin_user, '-d', 'postgres', '-c', create_user_sql]
    
    # Crear base de datos
    create_db_sql = f"CREATE DATABASE {dbname} OWNER {username};"
    cmd_db = ['psql', '-U', admin_user, '-d', 'postgres', '-c', create_db_sql]
    
    # Dar permisos
    grant_sql = f"GRANT ALL PRIVILEGES ON DATABASE {dbname} TO {username};"
    cmd_grant = ['psql', '-U', admin_user, '-d', 'postgres', '-c', grant_sql]
    
    success = True
    success = run_command(cmd_user, f"Creando usuario {username}", check=False) and success
    success = run_command(cmd_db, f"Creando base de datos {dbname}", check=False) and success
    success = run_command(cmd_grant, f"Otorgando permisos a {username}", check=False) and success
    
    return success

def update_env_file(db_name, db_user, db_password, db_host='localhost', db_port='5432'):
    """Actualizar archivo .env"""
    env_path = Path(__file__).parent / '.env'
    
    # Leer archivo actual
    lines = []
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    
    # Variables a actualizar
    updated_vars = {
        'DB_NAME': db_name,
        'DB_USER': db_user,
        'DB_PASSWORD': db_password,
        'DB_HOST': db_host,
        'DB_PORT': db_port,
        'DB_SSLMODE': 'disable'
    }
    
    # Actualizar líneas existentes
    found_vars = set()
    new_lines = []
    
    for line in lines:
        line_stripped = line.strip()
        updated = False
        
        for var_name in updated_vars.keys():
            if line_stripped.startswith(f'{var_name}='):
                new_lines.append(f'{var_name}={updated_vars[var_name]}\n')
                found_vars.add(var_name)
                updated = True
                break
        
        if not updated:
            new_lines.append(line)
    
    # Agregar variables que no existían
    for var_name, var_value in updated_vars.items():
        if var_name not in found_vars:
            new_lines.append(f'{var_name}={var_value}\n')
    
    # Escribir archivo
    try:
        with open(env_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        return True
    except Exception as e:
        return False

def main():
    
    # Información de la base de datos actual
    old_db_name = input("Nombre de la BD actual [mykaizenfit_dev]: ").strip() or 'mykaizenfit_dev'
    old_db_user = input("Usuario actual [postgres]: ").strip() or 'postgres'
    old_db_password = input("Contraseña actual (o Enter si no tiene): ").strip()
    
    # Información de la nueva base de datos
    new_db_name = input("Nombre de la nueva BD [mykaizenfit_dev]: ").strip() or 'mykaizenfit_dev'
    new_db_user = input("Nuevo usuario [nexfit_user]: ").strip() or 'nexfit_user'
    new_db_password = input("Nueva contraseña: ").strip()
    
    if not new_db_password:
        return
    
    # Usuario administrador para crear la nueva BD
    admin_user = input("Usuario admin [postgres]: ").strip() or 'postgres'
    admin_password = input(f"Contraseña de {admin_user} (puede ser la nueva): ").strip()
    
    if not admin_password:
    
    # Crear directorio para backups
    backup_dir = Path(__file__).parent / 'backups'
    backup_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    dump_file = backup_dir / f'{old_db_name}_{timestamp}.dump'
    
    # Paso 1: Intentar hacer dump de la BD actual
    dump_success = False
    if old_db_password:
        dump_success = create_dump(old_db_name, old_db_user, old_db_password, dump_file)
        if dump_success:
        else:
    else:
    
    # Paso 2: Crear nuevo usuario y base de datos
    create_success = create_user_and_db(
        new_db_user,
        new_db_password,
        new_db_name,
        admin_user,
        admin_password
    )
    
    if not create_success:
    
    # Paso 3: Restaurar dump si existe
    if dump_success and dump_file.exists():
        restore_success = restore_dump(new_db_name, new_db_user, new_db_password, dump_file)
        if restore_success:
        else:
    else:
    
    # Paso 4: Actualizar .env
    update_env_file(new_db_name, new_db_user, new_db_password)
    

if __name__ == '__main__':
    main()




