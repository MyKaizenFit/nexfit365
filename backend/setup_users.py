#!/usr/bin/env python
"""
Script para crear usuarios de prueba
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def setup_users():
    """Crear usuarios de prueba"""
    try:
        
        # Crear usuario administrador
        admin_email = 'admin@example.invalid'
        admin_password = 'AdminNex-Fit123!'
        
        if User.objects.filter(email=admin_email).exists():
            admin_user = User.objects.get(email=admin_email)
        else:
            admin_user = User.objects.create_superuser(
                email=admin_email,
                password=admin_password,
                first_name='Administrador',
                last_name='Nex-Fit',
                role='admin'
            )
        
        # Crear usuario normal
        user_email = 'user@example.invalid'
        user_password = 'UsuarioTest123!'
        
        if User.objects.filter(email=user_email).exists():
            normal_user = User.objects.get(email=user_email)
        else:
            normal_user = User.objects.create_user(
                email=user_email,
                password=user_password,
                first_name='Usuario',
                last_name='Prueba',
                role='user'
            )
        
        
        return True
        
    except Exception as e:
        return False

if __name__ == "__main__":
    success = setup_users()
    sys.exit(0 if success else 1)





















