#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para listar todos los usuarios de la base de datos
"""
import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.models import CustomUser

def main():
    users = CustomUser.objects.all().order_by('id')
    
    print("=" * 80)
    print("LISTA DE USUARIOS EN LA BASE DE DATOS")
    print("=" * 80)
    print(f"\nTotal de usuarios: {users.count()}\n")
    
    if users.count() == 0:
        print("No hay usuarios en la base de datos.")
        return
    
    print(f"{'ID':<5} | {'Email':<40} | {'Nombre Completo':<50}")
    print("-" * 80)
    
    for user in users:
        nombre_completo = f"{user.first_name} {user.last_name}".strip()
        if not nombre_completo:
            nombre_completo = "(sin nombre)"
        
        print(f"{user.id:<5} | {user.email:<40} | {nombre_completo:<50}")
    
    print("=" * 80)
    print("\nDetalles adicionales:")
    print("-" * 80)
    
    for user in users:
        nombre_completo = f"{user.first_name} {user.last_name}".strip()
        print(f"\nUsuario ID: {user.id}")
        print(f"  Email: {user.email}")
        print(f"  Nombre: {user.first_name}")
        print(f"  Apellido: {user.last_name}")
        print(f"  Nombre completo: {nombre_completo}")
        print(f"  Rol: {user.role}")
        print(f"  Activo: {user.is_active}")
        print(f"  Verificado: {user.is_verified}")
        if user.date_joined:
            print(f"  Fecha de registro: {user.date_joined.strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == '__main__':
    main()

