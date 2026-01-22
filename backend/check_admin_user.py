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
        
        
        # Verificar permisos
        if admin_user.is_superuser and admin_user.is_staff:
            return True
        else:
            return False
            
    except User.DoesNotExist:
        return False
    except Exception as e:
        return False

if __name__ == "__main__":
    success = check_admin_user()
    sys.exit(0 if success else 1)



























