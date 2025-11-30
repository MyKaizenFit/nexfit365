#!/bin/bash
# Script para hacer admin al usuario admin@mykaizenfit.com

set -e

echo "=========================================="
echo "  HACER ADMIN AL USUARIO"
echo "=========================================="
echo ""

cd /srv/mykaizenfit/pro

PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.prod.yml"

sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T backend python manage.py shell << 'PYTHON_EOF'
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

admin_email = 'admin@mykaizenfit.com'

try:
    if User.objects.filter(email=admin_email).exists():
        user = User.objects.get(email=admin_email)
        print(f"✅ Usuario encontrado: {user.email}")
        
        # Hacer admin
        user.is_superuser = True
        user.is_staff = True
        user.is_active = True
        
        # Asegurar que tenga rol de admin si existe el campo
        if hasattr(user, 'role'):
            user.role = 'admin' if hasattr(user, 'role') else getattr(user, 'role', 'basic')
        
        user.save()
        
        print(f"✅ Usuario actualizado como administrador:")
        print(f"   Email: {user.email}")
        print(f"   is_superuser: {user.is_superuser}")
        print(f"   is_staff: {user.is_staff}")
        print(f"   is_active: {user.is_active}")
        if hasattr(user, 'role'):
            print(f"   role: {user.role}")
    else:
        print(f"❌ Usuario {admin_email} no encontrado")
        print("   Creando usuario administrador...")
        
        user = User.objects.create_superuser(
            email=admin_email,
            password='AdminNex-Fit123!',
            first_name='Administrador',
            last_name='Nex-Fit'
        )
        
        if hasattr(user, 'role'):
            user.role = 'admin'
            user.save()
        
        print(f"✅ Usuario administrador creado:")
        print(f"   Email: {user.email}")
        print(f"   Contraseña: AdminNex-Fit123!")
        print(f"   is_superuser: {user.is_superuser}")
        print(f"   is_staff: {user.is_staff}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
PYTHON_EOF

echo ""
echo "=========================================="
echo "  ✅ PROCESO COMPLETADO"
echo "=========================================="

