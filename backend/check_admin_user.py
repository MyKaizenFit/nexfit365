#!/usr/bin/env python
"""
Script para verificar que el usuario administrador tiene los permisos correctos
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def check_admin_user():
    """Verificar el usuario administrador"""
    try:
        admin_user = User.objects.get(email='iagoadmin@gmail.com')
        
        print("🔍 Verificando usuario administrador:")
        print(f"  Email: {admin_user.email}")
        print(f"  Nombre: {admin_user.first_name} {admin_user.last_name}")
        print(f"  is_superuser: {admin_user.is_superuser}")
        print(f"  is_staff: {admin_user.is_staff}")
        print(f"  is_active: {admin_user.is_active}")
        print(f"  role: {admin_user.role}")
        print(f"  date_joined: {admin_user.date_joined}")
        print(f"  last_login: {admin_user.last_login}")
        
        # Verificar permisos
        if admin_user.is_superuser and admin_user.is_staff:
            print("✅ Usuario administrador configurado correctamente")
            return True
        else:
            print("❌ Usuario administrador NO tiene permisos correctos")
            return False
            
    except User.DoesNotExist:
        print("❌ Usuario administrador no encontrado")
        return False
    except Exception as e:
        print(f"❌ Error verificando usuario administrador: {e}")
        return False

if __name__ == "__main__":
    success = check_admin_user()
    sys.exit(0 if success else 1)



























