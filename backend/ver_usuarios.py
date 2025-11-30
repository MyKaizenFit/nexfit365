#!/usr/bin/env python
"""
Script simple para ver usuarios en la base de datos
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.models import CustomUser

print("\n" + "="*70)
print("  USUARIOS EN LA BASE DE DATOS")
print("="*70 + "\n")

total = CustomUser.objects.count()
print(f"Total de usuarios: {total}\n")

if total == 0:
    print("⚠️  No hay usuarios en la base de datos")
else:
    print("-" * 70)
    for user in CustomUser.objects.all().order_by('date_joined'):
        print(f"Email: {user.email}")
        print(f"  Nombre: {user.first_name} {user.last_name}")
        print(f"  Rol: {user.role}")
        print(f"  Admin: {'Sí' if user.is_superuser else 'No'}")
        print(f"  Staff: {'Sí' if user.is_staff else 'No'}")
        print(f"  Verificado: {'Sí' if user.is_verified else 'No'}")
        print(f"  Activo: {'Sí' if user.is_active else 'No'}")
        print(f"  Fecha creación: {user.date_joined}")
        if user.last_login:
            print(f"  Último login: {user.last_login}")
        print("-" * 70)
    
    # Resumen
    print("\n" + "="*70)
    print("  RESUMEN")
    print("="*70)
    print(f"Total usuarios: {total}")
    print(f"Administradores: {CustomUser.objects.filter(is_superuser=True).count()}")
    print(f"Staff: {CustomUser.objects.filter(is_staff=True).count()}")
    print(f"Verificados: {CustomUser.objects.filter(is_verified=True).count()}")
    print(f"Activos: {CustomUser.objects.filter(is_active=True).count()}")
    
    # Por rol
    print("\nPor rol:")
    for role_code, role_name in CustomUser._meta.get_field('role').choices:
        count = CustomUser.objects.filter(role=role_code).count()
        if count > 0:
            print(f"  {role_name}: {count}")

print("\n" + "="*70)

