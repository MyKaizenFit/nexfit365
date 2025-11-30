#!/usr/bin/env python
"""
Script para verificar y corregir el usuario administrador
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate

User = get_user_model()

def check_and_fix_admin_user():
    print("=== VERIFICANDO Y CORRIGIENDO USUARIO ADMINISTRADOR ===")
    
    try:
        # Buscar el usuario administrador
        admin_user = User.objects.get(email='admin@mykaizenfit.com')
        
        print(f"✅ Usuario encontrado: {admin_user.email}")
        print(f"   ID: {admin_user.id}")
        print(f"   Nombre: {admin_user.first_name} {admin_user.last_name}")
        print(f"   is_superuser: {admin_user.is_superuser}")
        print(f"   is_staff: {admin_user.is_staff}")
        print(f"   is_active: {admin_user.is_active}")
        print(f"   role: {getattr(admin_user, 'role', 'No definido')}")
        
        # Verificar y corregir campos
        needs_update = False
        
        if not admin_user.is_superuser:
            admin_user.is_superuser = True
            needs_update = True
            print("🔧 Marcando como superusuario")
            
        if not admin_user.is_staff:
            admin_user.is_staff = True
            needs_update = True
            print("🔧 Marcando como staff")
            
        if getattr(admin_user, 'role', None) != 'admin':
            admin_user.role = 'admin'
            needs_update = True
            print("🔧 Estableciendo rol como admin")
            
        if needs_update:
            admin_user.save()
            print("✅ Usuario actualizado correctamente")
        else:
            print("✅ Usuario ya está configurado correctamente")
            
        # Verificar autenticación
        print("\n=== VERIFICANDO AUTENTICACIÓN ===")
        authenticated_user = authenticate(
            email='admin@mykaizenfit.com', 
            password='AdminNex-Fit123!'
        )
        
        if authenticated_user:
            print("✅ Autenticación exitosa")
            print(f"   Usuario autenticado: {authenticated_user.email}")
            print(f"   Es admin: {authenticated_user.is_superuser or authenticated_user.is_staff or authenticated_user.role == 'admin'}")
        else:
            print("❌ Error de autenticación")
            
        # Verificar token JWT
        print("\n=== VERIFICANDO TOKEN JWT ===")
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh = RefreshToken.for_user(admin_user)
        access_token = refresh.access_token
        
        # Decodificar el token para verificar el payload
        import jwt
        from django.conf import settings
        
        decoded_token = jwt.decode(
            str(access_token), 
            settings.SECRET_KEY, 
            algorithms=['HS256']
        )
        
        print("📋 Payload del token JWT:")
        print(f"   user_id: {decoded_token.get('user_id')}")
        print(f"   email: {decoded_token.get('email')}")
        print(f"   is_staff: {decoded_token.get('is_staff')}")
        print(f"   is_superuser: {decoded_token.get('is_superuser')}")
        print(f"   role: {decoded_token.get('role')}")
        
    except User.DoesNotExist:
        print("❌ Usuario administrador no encontrado")
        print("Creando usuario administrador...")
        
        try:
            admin_user = User.objects.create_superuser(
                email='admin@mykaizenfit.com',
                password='AdminNex-Fit123!',
                first_name='Admin',
                last_name='User',
                role='admin'
            )
            print("✅ Usuario administrador creado exitosamente")
        except Exception as e:
            print(f"❌ Error al crear usuario: {e}")
    except Exception as e:
        print(f"❌ Error inesperado: {e}")

if __name__ == '__main__':
    check_and_fix_admin_user()





















