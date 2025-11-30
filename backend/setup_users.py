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
        print("🔧 Configurando usuarios de prueba...")
        
        # Crear usuario administrador
        admin_email = 'admin@example.invalid'
        admin_password = 'AdminNex-Fit123!'
        
        if User.objects.filter(email=admin_email).exists():
            admin_user = User.objects.get(email=admin_email)
            print(f"✅ Usuario administrador ya existe: {admin_user.email}")
        else:
            admin_user = User.objects.create_superuser(
                email=admin_email,
                password=admin_password,
                first_name='Administrador',
                last_name='Nex-Fit',
                role='admin'
            )
            print(f"✅ Usuario administrador creado: {admin_user.email}")
        
        # Crear usuario normal
        user_email = 'user@example.invalid'
        user_password = 'UsuarioTest123!'
        
        if User.objects.filter(email=user_email).exists():
            normal_user = User.objects.get(email=user_email)
            print(f"✅ Usuario normal ya existe: {normal_user.email}")
        else:
            normal_user = User.objects.create_user(
                email=user_email,
                password=user_password,
                first_name='Usuario',
                last_name='Prueba',
                role='user'
            )
            print(f"✅ Usuario normal creado: {normal_user.email}")
        
        print("\n" + "="*60)
        print("📋 CREDENCIALES DE PRUEBA:")
        print("="*60)
        print(f"👑 ADMINISTRADOR:")
        print(f"   Email: {admin_email}")
        print(f"   Contraseña: {admin_password}")
        print(f"   Redirección: /admin")
        print()
        print(f"👤 USUARIO NORMAL:")
        print(f"   Email: {user_email}")
        print(f"   Contraseña: {user_password}")
        print(f"   Redirección: /dashboard")
        print("="*60)
        
        return True
        
    except Exception as e:
        print(f"❌ Error configurando usuarios: {e}")
        return False

if __name__ == "__main__":
    success = setup_users()
    sys.exit(0 if success else 1)





















