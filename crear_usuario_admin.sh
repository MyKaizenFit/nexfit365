#!/bin/bash
# Script para crear el usuario administrador en desarrollo
# SIN detener el backend

echo "=========================================="
echo "  CREAR USUARIO ADMINISTRADOR EN DEV"
echo "=========================================="
echo ""

cd /srv/mykaizenfit/pro

# Verificar que el backend esté corriendo
if ! sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps backend 2>/dev/null | grep -q "Up"; then
    echo "⚠️  El contenedor de backend NO está corriendo"
    echo "   Levantando backend..."
    sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d backend
    echo "   Esperando 10 segundos para que inicie..."
    sleep 10
fi

echo "✓ Backend está corriendo"
echo ""

# Verificar si existe un script para crear usuarios
if [ -f "backend/create_admin_user.py" ]; then
    echo "1. Creando usuario administrador usando create_admin_user.py..."
    sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T backend python manage.py shell << 'EOF'
from accounts.models import CustomUser

admin_email = 'admin@mykaizenfit.com'
admin_password = 'AdminMyKaizenFit123!'

try:
    if CustomUser.objects.filter(email=admin_email).exists():
        admin_user = CustomUser.objects.get(email=admin_email)
        print(f"✅ Usuario administrador ya existe: {admin_user.email}")
        print(f"   Actualizando contraseña...")
        admin_user.set_password(admin_password)
        admin_user.is_active = True
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()
        print(f"✅ Contraseña actualizada y permisos verificados")
    else:
        admin_user = CustomUser.objects.create_superuser(
            email=admin_email,
            password=admin_password,
            first_name='Administrador',
            last_name='MyKaizenFit',
        )
        # Asegurar que tiene los roles correctos
        admin_user.role = 'ADMIN'
        admin_user.is_active = True
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()
        print(f"✅ Usuario administrador creado: {admin_user.email}")
    
    print(f"\n📋 Credenciales:")
    print(f"   Email: {admin_email}")
    print(f"   Contraseña: {admin_password}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
EOF

else
    echo "1. Creando usuario administrador directamente..."
    sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T backend python manage.py shell << 'EOF'
from accounts.models import CustomUser

admin_email = 'admin@mykaizenfit.com'
admin_password = 'AdminMyKaizenFit123!'

try:
    if CustomUser.objects.filter(email=admin_email).exists():
        admin_user = CustomUser.objects.get(email=admin_email)
        print(f"✅ Usuario administrador ya existe: {admin_user.email}")
        print(f"   Actualizando contraseña y permisos...")
        admin_user.set_password(admin_password)
        admin_user.is_active = True
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.role = 'ADMIN'
        admin_user.save()
        print(f"✅ Contraseña actualizada y permisos verificados")
    else:
        admin_user = CustomUser.objects.create_superuser(
            email=admin_email,
            password=admin_password,
            first_name='Administrador',
            last_name='MyKaizenFit',
        )
        admin_user.role = 'ADMIN'
        admin_user.is_active = True
        admin_user.save()
        print(f"✅ Usuario administrador creado: {admin_user.email}")
    
    print(f"\n📋 Credenciales:")
    print(f"   Email: {admin_email}")
    print(f"   Contraseña: {admin_password}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
EOF
fi

echo ""
echo "=========================================="
echo "  ✅ PROCESO COMPLETADO"
echo "=========================================="
echo ""
echo "Ahora puedes iniciar sesión con:"
echo "   Email: admin@mykaizenfit.com"
echo "   Contraseña: AdminMyKaizenFit123!"
echo ""
echo "📍 URL de desarrollo: http://45.136.19.91:3001"
echo ""

