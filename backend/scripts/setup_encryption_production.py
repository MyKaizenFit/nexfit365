#!/usr/bin/env python
"""
Setup Production Encryption
============================
Script para:
1. Generar ENCRYPTION_KEY permanente
2. Guardarlo en .env
3. Encriptar todos los datos sensibles de usuarios existentes
4. Verificar integridad de datos encriptados
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.models import CustomUser
from utils.encryption import SensitiveDataEncryption
from cryptography.fernet import Fernet
import json
from datetime import datetime

# Colores para output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def print_success(text):
    print(f"{GREEN}✅ {text}{RESET}")

def print_error(text):
    print(f"{RED}❌ {text}{RESET}")

def print_warning(text):
    print(f"{YELLOW}⚠️  {text}{RESET}")

def print_info(text):
    print(f"{BLUE}ℹ️  {text}{RESET}")

def generate_encryption_key():
    """Generar una nueva clave de encriptación"""
    print_info("Generando nueva ENCRYPTION_KEY...")
    key = Fernet.generate_key().decode('utf-8')
    print_success(f"Clave generada: {key[:20]}...{key[-10:]}")
    return key

def save_encryption_key_to_env(key):
    """Guardar la clave en .env"""
    env_path = Path('/srv/mykaizenfit/pro/backend/.env')
    
    if not env_path.exists():
        print_error(f".env no existe en {env_path}")
        return False
    
    # Leer .env actual
    with open(env_path, 'r') as f:
        lines = f.readlines()
    
    # Eliminar línea ENCRYPTION_KEY existente si la hay
    lines = [line for line in lines if not line.startswith('ENCRYPTION_KEY=')]
    
    # Agregar nueva clave
    lines.append(f"ENCRYPTION_KEY={key}\n")
    
    # Guardar
    with open(env_path, 'w') as f:
        f.writelines(lines)
    
    print_success(f"ENCRYPTION_KEY guardada en {env_path}")
    return True

def encrypt_user_data(user, cipher):
    """Encriptar datos sensibles de un usuario"""
    changes = {}
    
    # Encriptar teléfono
    if user.phone_number and not user.phone_number.startswith('fernet:'):
        try:
            encrypted = cipher.encrypt(user.phone_number)
            user.phone_number = encrypted
            changes['phone_number'] = 'encrypted'
        except Exception as e:
            print_error(f"  Error encriptando teléfono: {e}")
            return False
    
    # Encriptar lesiones
    if user.injuries_or_medical_issues and not user.injuries_or_medical_issues.startswith('fernet:'):
        try:
            encrypted = cipher.encrypt(user.injuries_or_medical_issues)
            user.injuries_or_medical_issues = encrypted
            changes['injuries_or_medical_issues'] = 'encrypted'
        except Exception as e:
            print_error(f"  Error encriptando lesiones: {e}")
            return False
    
    # Encriptar comidas desagradables
    if user.disliked_foods and not user.disliked_foods.startswith('fernet:'):
        try:
            encrypted = cipher.encrypt(user.disliked_foods)
            user.disliked_foods = encrypted
            changes['disliked_foods'] = 'encrypted'
        except Exception as e:
            print_error(f"  Error encriptando alimentos: {e}")
            return False
    
    return changes if changes else None

def main():
    print_header("🔐 SETUP PRODUCTION ENCRYPTION")
    
    # PASO 1: Generar y guardar clave
    print_header("PASO 1: Generar y guardar ENCRYPTION_KEY")
    key = generate_encryption_key()
    
    if not save_encryption_key_to_env(key):
        print_error("No se pudo guardar la clave en .env")
        sys.exit(1)
    
    # PASO 2: Inicializar cipher (ahora con clave persistente)
    print_header("PASO 2: Cargar cipher con clave persistente")
    cipher = SensitiveDataEncryption()
    print_success("Cipher inicializado correctamente")
    
    # PASO 3: Obtener usuarios
    print_header("PASO 3: Procesar usuarios")
    users = CustomUser.objects.all()
    print_info(f"Total de usuarios a procesar: {users.count()}")
    
    # PASO 4: Encriptar datos
    print_header("PASO 4: Encriptar datos sensibles")
    
    encrypted_count = 0
    skipped_count = 0
    error_count = 0
    
    for user in users:
        print(f"\nProcesando usuario ID {user.id} ({user.email}):")
        
        result = encrypt_user_data(user, cipher)
        
        if result is False:
            print_error(f"  Error al procesar usuario {user.id}")
            error_count += 1
            continue
        
        if result:
            # Guardar cambios
            try:
                user.save(update_fields=list(result.keys()))
                print_success(f"  Encriptado: {', '.join(result.keys())}")
                encrypted_count += 1
            except Exception as e:
                print_error(f"  Error guardando usuario: {e}")
                error_count += 1
        else:
            print_warning(f"  Sin datos sensibles o ya encriptados")
            skipped_count += 1
    
    # PASO 5: Resumen
    print_header("PASO 5: Resumen y verificación")
    
    print(f"\n{BLUE}Estadísticas de encriptación:{RESET}")
    print(f"  {GREEN}Usuarios encriptados: {encrypted_count}{RESET}")
    print(f"  {YELLOW}Usuarios sin cambios: {skipped_count}{RESET}")
    print(f"  {RED}Errores: {error_count}{RESET}")
    print(f"  {BLUE}Total procesado: {encrypted_count + skipped_count + error_count}{RESET}")
    
    # Verificar que se puede leer
    print(f"\n{BLUE}Verificando integridad de datos encriptados:{RESET}")
    
    test_user = CustomUser.objects.filter(phone_number__startswith='fernet:').first()
    if test_user:
        try:
            decrypted = cipher.decrypt(test_user.phone_number)
            print_success(f"✅ Desencriptación funciona correctamente")
            print_info(f"   Teléfono desencriptado: {decrypted[:3]}***{decrypted[-3:]} (largo: {len(decrypted)})")
        except Exception as e:
            print_error(f"❌ Error desencriptando: {e}")
    else:
        print_warning("No hay usuarios con teléfono encriptado para verificar")
    
    # PASO 6: Guardar log
    log_entry = {
        'timestamp': datetime.now().isoformat(),
        'encryption_key_hash': cipher.key[:20].decode('utf-8') + '...',
        'encrypted_users': encrypted_count,
        'skipped_users': skipped_count,
        'error_count': error_count,
        'total_processed': encrypted_count + skipped_count + error_count
    }
    
    log_path = Path('/srv/mykaizenfit/pro/backups/encryption_setup.log')
    log_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(log_path, 'a') as f:
        f.write(json.dumps(log_entry, indent=2) + '\n')
    
    print_success(f"Log guardado en {log_path}")
    
    print_header("✅ SETUP ENCRYPTION COMPLETADO")
    print(f"\n{GREEN}Sistema listo para producción.{RESET}")
    print(f"{BLUE}Próximos pasos:{RESET}")
    print(f"  1. Verificar que .env tiene ENCRYPTION_KEY")
    print(f"  2. Reiniciar servicios: docker compose restart backend")
    print(f"  3. Monitorear logs para errores de desencriptación")
    print(f"  4. Backup de .env en lugar seguro (CRITICAL!)")

if __name__ == '__main__':
    main()
