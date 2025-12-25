#!/usr/bin/env python
"""
Script simple para actualizar las credenciales de BD en .env
"""
import os
from pathlib import Path

def update_env_credentials():
    """Actualizar credenciales de BD en .env"""
    env_path = Path(__file__).parent / '.env'
    
    if not env_path.exists():
        print("❌ No se encontró .env. Creando uno nuevo...")
        env_path.touch()
    
    print("=" * 60)
    print("📝 ACTUALIZAR CREDENCIALES DE BASE DE DATOS")
    print("=" * 60)
    print()
    
    # Leer valores actuales si existen
    current_values = {}
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, value = line.strip().split('=', 1)
                    if key.startswith('DB_'):
                        current_values[key] = value
    
    # Solicitar nuevos valores
    print("Ingresa las credenciales de PostgreSQL:")
    print("(Presiona Enter para usar el valor actual o el valor por defecto)")
    print()
    
    db_name = input(f"DB_NAME [{current_values.get('DB_NAME', 'mykaizenfit_dev')}]: ").strip()
    db_name = db_name or current_values.get('DB_NAME', 'mykaizenfit_dev')
    
    db_user = input(f"DB_USER [{current_values.get('DB_USER', 'postgres')}]: ").strip()
    db_user = db_user or current_values.get('DB_USER', 'postgres')
    
    db_password = input("DB_PASSWORD (requerido): ").strip()
    if not db_password:
        print("❌ La contraseña es obligatoria")
        return False
    
    db_host = input(f"DB_HOST [{current_values.get('DB_HOST', 'localhost')}]: ").strip()
    db_host = db_host or current_values.get('DB_HOST', 'localhost')
    
    db_port = input(f"DB_PORT [{current_values.get('DB_PORT', '5432')}]: ").strip()
    db_port = db_port or current_values.get('DB_PORT', '5432')
    
    # Leer archivo completo
    lines = []
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    
    # Actualizar o agregar variables
    updated_vars = {
        'DB_NAME': db_name,
        'DB_USER': db_user,
        'DB_PASSWORD': db_password,
        'DB_HOST': db_host,
        'DB_PORT': db_port,
        'DB_SSLMODE': 'disable'
    }
    
    # Buscar y actualizar líneas existentes
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
        
        print()
        print("=" * 60)
        print("✅ Archivo .env actualizado exitosamente")
        print("=" * 60)
        print()
        print("📋 Credenciales configuradas:")
        print(f"   DB_NAME: {db_name}")
        print(f"   DB_USER: {db_user}")
        print(f"   DB_HOST: {db_host}")
        print(f"   DB_PORT: {db_port}")
        print()
        print("💡 Próximos pasos:")
        print("   1. Asegúrate de que PostgreSQL esté corriendo")
        print("   2. Verifica que el usuario y contraseña sean correctos")
        print("   3. Ejecuta: python manage.py migrate accounts")
        print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error escribiendo .env: {e}")
        return False

if __name__ == '__main__':
    update_env_credentials()




