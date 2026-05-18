#!/usr/bin/env python
"""
Script para verificar y corregir el estado de los usuarios admin
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.models import CustomUser

print("\n" + "="*60)
print("DIAGNÓSTICO DE USUARIOS")
print("="*60 + "\n")

# Listar todos los usuarios
users = CustomUser.objects.all().order_by('date_joined')
print(f"Total de usuarios: {users.count()}\n")

for user in users:
    print(f"Email: {user.email}")
    print(f"  - Nombre: {user.first_name} {user.last_name}")
    print(f"  - Rol: {user.role}")
    print(f"  - is_staff: {user.is_staff}")
    print(f"  - is_superuser: {user.is_superuser}")
    print(f"  - is_active: {user.is_active}")
    print()

# Contar por rol
print("\nRESUMEN POR ROL:")
print("-" * 60)
role_counts = {}
for role_code, role_name in CustomUser._meta.get_field('role').choices:
    count = CustomUser.objects.filter(role=role_code).count()
    role_counts[role_code] = count
    print(f"  {role_name} ({role_code}): {count}")

# Verificar usuarios admin
print("\nVERIFICACIÓN DE ADMINS:")
print("-" * 60)
admin_users = CustomUser.objects.filter(role='admin')
staff_users = CustomUser.objects.filter(is_staff=True)
superusers = CustomUser.objects.filter(is_superuser=True)

print(f"  Usuarios con role='admin': {admin_users.count()}")
for user in admin_users:
    print(f"    - {user.email}: is_staff={user.is_staff}, is_superuser={user.is_superuser}")

print(f"\n  Usuarios con is_staff=True: {staff_users.count()}")
for user in staff_users:
    print(f"    - {user.email}: role={user.role}")

print(f"\n  Usuarios superusers: {superusers.count()}")
for user in superusers:
    print(f"    - {user.email}: role={user.role}")

# Corregir si es necesario
print("\n" + "="*60)
print("CORRECCIÓN AUTOMÁTICA")
print("="*60 + "\n")

# Para todos los usuarios con role='admin', asegurar que tengan is_staff=True
admin_users_to_fix = CustomUser.objects.filter(role='admin').exclude(is_staff=True)
if admin_users_to_fix.exists():
    print(f"Actualizando {admin_users_to_fix.count()} usuario(s) admin para seteaer is_staff=True...\n")
    for user in admin_users_to_fix:
        user.is_staff = True
        user.save()
        print(f"  ✓ Actualizado: {user.email}")
    print()

# Para todos los usuarios con role='trainer', asegurar que tengan is_staff=True
trainer_users_to_fix = CustomUser.objects.filter(role='trainer').exclude(is_staff=True)
if trainer_users_to_fix.exists():
    print(f"Actualizando {trainer_users_to_fix.count()} usuario(s) trainer para seteaer is_staff=True...\n")
    for user in trainer_users_to_fix:
        user.is_staff = True
        user.save()
        print(f"  ✓ Actualizado: {user.email}")
    print()

if not admin_users_to_fix.exists() and not trainer_users_to_fix.exists():
    print("✓ Todos los usuarios admin y trainer ya tienen is_staff=True\n")

print("\n" + "="*60)
print("VERIFICACIÓN FINAL")
print("="*60 + "\n")

# Verificación final
admin_users = CustomUser.objects.filter(role='admin')
trainer_users = CustomUser.objects.filter(role='trainer')

print("Usuarios admin (después de corrección):")
for user in admin_users:
    status = "✓ OK" if user.is_staff else "✗ PROBLEMA"
    print(f"  {user.email}: is_staff={user.is_staff}, is_superuser={user.is_superuser} {status}")

print("\nUsuarios trainer (después de corrección):")
for user in trainer_users:
    status = "✓ OK" if user.is_staff else "✗ PROBLEMA"
    print(f"  {user.email}: is_staff={user.is_staff}, is_superuser={user.is_superuser} {status}")

print("\n" + "="*60)
