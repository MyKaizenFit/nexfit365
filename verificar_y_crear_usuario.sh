#!/bin/bash
# Script para verificar y crear usuario administrador en DEV

set -e

echo "=========================================="
echo "  VERIFICAR Y CREAR USUARIO ADMINISTRADOR"
echo "=========================================="
echo ""

cd /srv/mykaizenfit/pro

PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.prod.yml"

# Verificar usuarios existentes
echo "1. Verificando usuarios en la base de datos..."
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T backend python manage.py shell << 'PYTHON_EOF'
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

print("=" * 60)
print("USUARIOS EXISTENTES:")
print("=" * 60)
users = User.objects.all()
print(f"Total de usuarios: {users.count()}")
print()

if users.exists():
    for user in users:
        print(f"Email: {user.email}")
        print(f"  Nombre: {user.first_name} {user.last_name}")
        print(f"  is_active: {user.is_active}")
        print(f"  is_staff: {user.is_staff}")
        print(f"  is_superuser: {user.is_superuser}")
        role = getattr(user, 'role', 'N/A')
        print(f"  role: {role}")
        print("-" * 60)
else:
    print("No hay usuarios en la base de datos")
    print()

# Verificar si existe el admin
admin_email = 'admin@mykaizenfit.com'
if User.objects.filter(email=admin_email).exists():
    admin_user = User.objects.get(email=admin_email)
    print(f"\n✅ Usuario admin encontrado: {admin_user.email}")
    print(f"   is_active: {admin_user.is_active}")
    print(f"   is_staff: {admin_user.is_staff}")
    print(f"   is_superuser: {admin_user.is_superuser}")
    
    if not admin_user.is_active:
        print("\n⚠️  El usuario está INACTIVO. Activándolo...")
        admin_user.is_active = True
        admin_user.save()
        print("✅ Usuario activado")
else:
    print(f"\n❌ Usuario admin NO encontrado: {admin_email}")
    print("   Se creará en el siguiente paso")
PYTHON_EOF

echo ""
echo "2. Creando/Actualizando usuario administrador..."
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T backend python manage.py shell << 'PYTHON_EOF'
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

admin_email = 'admin@mykaizenfit.com'
admin_password = 'AdminNex-Fit123!'

try:
    if User.objects.filter(email=admin_email).exists():
        admin_user = User.objects.get(email=admin_email)
        print(f"✅ Usuario admin ya existe: {admin_user.email}")
        
        # Actualizar contraseña y asegurar que esté activo
        admin_user.set_password(admin_password)
        admin_user.is_active = True
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()
        print("✅ Contraseña actualizada y usuario activado")
    else:
        admin_user = User.objects.create_superuser(
            email=admin_email,
            password=admin_password,
            first_name='Administrador',
            last_name='Nex-Fit'
        )
        print(f"✅ Usuario admin creado: {admin_user.email}")
    
    print("\n" + "=" * 60)
    print("📋 CREDENCIALES DE ACCESO:")
    print("=" * 60)
    print(f"Email: {admin_email}")
    print(f"Contraseña: {admin_password}")
    print("=" * 60)
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
PYTHON_EOF

echo ""
echo "=========================================="
echo "  ✅ PROCESO COMPLETADO"
echo "=========================================="
echo ""
echo "Ahora puedes hacer login con:"
echo "  Email: admin@mykaizenfit.com"
echo "  Contraseña: AdminNex-Fit123!"
echo ""

