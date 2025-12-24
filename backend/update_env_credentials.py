#!/usr/bin/env python
"""
Script para actualizar las credenciales de BD en .env
Actualiza con las nuevas credenciales de ddbb_nextfit
"""
import os
from pathlib import Path

def update_env_credentials():
    """Actualizar credenciales de BD en .env"""
    env_path = Path(__file__).parent / '.env'
    
    # Nuevas credenciales
    new_credentials = {
        'DB_NAME': 'ddbb_nextfit',
        'DB_USER': 'nexfit_app',
        'DB_PASSWORD': 'gFMpSumu3XrOH6S6zHkH',
        'DB_HOST': 'localhost',
        'DB_PORT': '5432',
        'DB_SSLMODE': 'disable'
    }
    
    print("=" * 60)
    print("ACTUALIZANDO CREDENCIALES DE BASE DE DATOS EN .env")
    print("=" * 60)
    print()
    
    # Leer archivo .env si existe
    lines = []
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    
    # Actualizar o agregar variables
    updated_vars = {}
    found_vars = set()
    new_lines = []
    
    for line in lines:
        line_stripped = line.strip()
        updated = False
        
        for var_name, var_value in new_credentials.items():
            if line_stripped.startswith(f'{var_name}='):
                new_lines.append(f'{var_name}={var_value}\n')
                found_vars.add(var_name)
                updated = True
                break
        
        if not updated:
            new_lines.append(line)
    
    # Agregar variables que no existían
    for var_name, var_value in new_credentials.items():
        if var_name not in found_vars:
            new_lines.append(f'{var_name}={var_value}\n')
    
    # Escribir archivo
    try:
        with open(env_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        
        print("[OK] Archivo .env actualizado exitosamente")
        print()
        print("Credenciales configuradas:")
        for var_name, var_value in new_credentials.items():
            print(f"   {var_name}={var_value}")
        print()
        print("Proximos pasos:")
        print("   1. Ejecuta el script create_new_database.ps1 para crear la BD")
        print("   2. Verifica la conexion: python manage.py migrate accounts")
        print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error escribiendo .env: {e}")
        return False

if __name__ == '__main__':
    update_env_credentials()

