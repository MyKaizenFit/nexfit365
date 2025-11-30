#!/usr/bin/env python
"""
Script para verificar usuarios en la base de datos
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def check_users():
    """Verificar usuarios en la base de datos"""
    try:
        users = User.objects.all()
        
        print(f"📊 Total de usuarios en la base de datos: {users.count()}")
        print("\n" + "="*60)
        
        for user in users:
            print(f"👤 Usuario ID: {user.id}")
            print(f"   Email: {user.email}")
            print(f"   Nombre: {user.first_name} {user.last_name}")
            print(f"   is_superuser: {user.is_superuser}")
            print(f"   is_staff: {user.is_staff}")
            print(f"   is_active: {user.is_active}")
            print(f"   role: {user.role}")
            print(f"   date_joined: {user.date_joined}")
            print(f"   last_login: {user.last_login}")
            print("-" * 40)
        
        return True
        
    except Exception as e:
        print(f"❌ Error verificando usuarios: {e}")
        return False

if __name__ == "__main__":
    success = check_users()
    sys.exit(0 if success else 1)





















