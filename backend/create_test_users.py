#!/usr/bin/env python
"""
Script para crear usuarios de prueba en Nex-Fit
Ejecutar: python create_test_users.py
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import CustomUser

User = get_user_model()

def create_test_users():
    """Crear usuarios de prueba para desarrollo"""
    
    print("🧪 Creando usuarios de prueba para Nex-Fit...")
    print("=" * 50)
    
    # Usuario de pruebas (cliente)
    test_user_data = {
        'email': 'test@mykaizenfit.com',
        'first_name': 'Usuario',
        'last_name': 'Pruebas',
        'role': 'MEMBER',
        'is_active': True,
        'is_staff': False,
        'is_superuser': False,
    }
    
    # Admin de pruebas
    test_admin_data = {
        'email': 'admin@mykaizenfit.com',
        'first_name': 'Admin',
        'last_name': 'Pruebas',
        'role': 'ADMIN',
        'is_active': True,
        'is_staff': True,
        'is_superuser': False,
    }
    
    users_created = []
    
    # Crear usuario de pruebas
    try:
        test_user, created = User.objects.get_or_create(
            email=test_user_data['email'],
            defaults=test_user_data
        )
        
        if created:
            test_user.set_password('TestUser123!')
            test_user.save()
            users_created.append(('Usuario de Pruebas', test_user_data['email'], 'TestUser123!'))
            print(f"✅ Usuario de pruebas creado: {test_user_data['email']}")
        else:
            # Actualizar contraseña si ya existe
            test_user.set_password('TestUser123!')
            test_user.save()
            print(f"🔄 Usuario de pruebas actualizado: {test_user_data['email']}")
            
    except Exception as e:
        print(f"❌ Error creando usuario de pruebas: {e}")
    
    # Crear admin de pruebas
    try:
        test_admin, created = User.objects.get_or_create(
            email=test_admin_data['email'],
            defaults=test_admin_data
        )
        
        if created:
            test_admin.set_password('AdminTest123!')
            test_admin.save()
            users_created.append(('Admin de Pruebas', test_admin_data['email'], 'AdminTest123!'))
            print(f"✅ Admin de pruebas creado: {test_admin_data['email']}")
        else:
            # Actualizar contraseña si ya existe
            test_admin.set_password('AdminTest123!')
            test_admin.save()
            print(f"🔄 Admin de pruebas actualizado: {test_admin_data['email']}")
            
    except Exception as e:
        print(f"❌ Error creando admin de pruebas: {e}")
    
    # Mostrar resumen
    print("\n" + "=" * 50)
    print("📋 RESUMEN DE USUARIOS DE PRUEBA")
    print("=" * 50)
    
    if users_created:
        for name, email, password in users_created:
            print(f"👤 {name}")
            print(f"   📧 Email: {email}")
            print(f"   🔑 Contraseña: {password}")
            print()
    
    print("🌐 CREDENCIALES PARA DESARROLLO")
    print("=" * 50)
    print("🔐 Usuario Cliente:")
    print("   Email: test@mykaizenfit.com")
    print("   Contraseña: TestUser123!")
    print()
    print("🛡️ Admin:")
    print("   Email: admin@mykaizenfit.com")
    print("   Contraseña: AdminTest123!")
    print()
    print("💡 Estos usuarios se pueden usar en el frontend")
    print("   para probar la funcionalidad sin crear cuentas reales.")
    print()
    print("✅ Script completado!")

if __name__ == '__main__':
    create_test_users()
