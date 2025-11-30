#!/usr/bin/env python
"""
Script para crear un usuario normal para pruebas
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def create_test_user():
    """Crear usuario normal para pruebas"""
    try:
        # Verificar si ya existe
        if User.objects.filter(email='usuario@test.com').exists():
            test_user = User.objects.get(email='usuario@test.com')
            print("✅ Usuario de prueba ya existe:")
            print(f"  Email: {test_user.email}")
            print(f"  Nombre: {test_user.first_name} {test_user.last_name}")
            print(f"  is_superuser: {test_user.is_superuser}")
            print(f"  is_staff: {test_user.is_staff}")
            print(f"  is_active: {test_user.is_active}")
            return True
        
        # Crear nuevo usuario normal
        test_user = User.objects.create_user(
            email='usuario@test.com',
            password='UsuarioTest123!',
            first_name='Usuario',
            last_name='Prueba',
            role='user'
        )
        
        print("✅ Usuario de prueba creado exitosamente:")
        print(f"  Email: {test_user.email}")
        print(f"  Contraseña: UsuarioTest123!")
        print(f"  Nombre: {test_user.first_name} {test_user.last_name}")
        print(f"  is_superuser: {test_user.is_superuser}")
        print(f"  is_staff: {test_user.is_staff}")
        print(f"  is_active: {test_user.is_active}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creando usuario de prueba: {e}")
        return False

if __name__ == "__main__":
    success = create_test_user()
    sys.exit(0 if success else 1)





















