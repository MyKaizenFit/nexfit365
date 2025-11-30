#!/usr/bin/env python
"""
Script para crear un usuario administrador para pruebas
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def create_admin_user():
    """Crear usuario administrador"""
    try:
        # Verificar si ya existe
        if User.objects.filter(email='admin@example.invalid').exists():
            admin_user = User.objects.get(email='admin@example.invalid')
            print("✅ Usuario administrador ya existe:")
            print(f"  Email: {admin_user.email}")
            print(f"  Nombre: {admin_user.first_name} {admin_user.last_name}")
            print(f"  is_superuser: {admin_user.is_superuser}")
            print(f"  is_staff: {admin_user.is_staff}")
            print(f"  is_active: {admin_user.is_active}")
            return True
        
        # Crear nuevo usuario administrador
        admin_user = User.objects.create_superuser(
            email='admin@example.invalid',
            password='AdminNex-Fit123!',
            first_name='Administrador',
            last_name='Nex-Fit',
            role='admin'
        )
        
        print("✅ Usuario administrador creado exitosamente:")
        print(f"  Email: {admin_user.email}")
        print(f"  Contraseña: AdminNex-Fit123!")
        print(f"  Nombre: {admin_user.first_name} {admin_user.last_name}")
        print(f"  is_superuser: {admin_user.is_superuser}")
        print(f"  is_staff: {admin_user.is_staff}")
        print(f"  is_active: {admin_user.is_active}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creando usuario administrador: {e}")
        return False

if __name__ == "__main__":
    success = create_admin_user()
    sys.exit(0 if success else 1)





















