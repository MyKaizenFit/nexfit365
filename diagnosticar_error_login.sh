#!/bin/bash
# Script para diagnosticar el error de login "No active account found"

echo "=========================================="
echo "  DIAGNÓSTICO: ERROR DE LOGIN"
echo "=========================================="
echo ""
echo "Error: 'No active account found with the given credentials'"
echo ""

cd /srv/mykaizenfit/pro

# Verificar que el backend esté corriendo
if ! sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps backend 2>/dev/null | grep -q "Up"; then
    echo "❌ El backend NO está corriendo"
    exit 1
fi

echo "✓ Backend está corriendo"
echo ""

# Verificar conexión a la base de datos
echo "1. Verificando conexión a la base de datos..."
DB_CHECK=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -c "SELECT 1;" 2>&1)
if [ $? -eq 0 ]; then
    echo "✓ Conexión a base de datos OK"
else
    echo "❌ Error de conexión a la base de datos"
    echo "$DB_CHECK"
    exit 1
fi

echo ""

# Verificar si existe el usuario
echo "2. Verificando si existe el usuario admin@mykaizenfit.com..."
USER_EXISTS=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT COUNT(*) FROM accounts_customuser WHERE email = 'admin@mykaizenfit.com';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$USER_EXISTS" = "0" ] || [ -z "$USER_EXISTS" ]; then
    echo "❌ PROBLEMA ENCONTRADO: El usuario NO existe en la base de datos"
    echo ""
    echo "SOLUCIÓN: Crear el usuario administrador"
    echo ""
    echo "   sudo bash /srv/mykaizenfit/pro/crear_usuario_admin.sh"
    echo ""
    exit 1
fi

echo "✓ Usuario existe en la base de datos"
echo ""

# Verificar detalles del usuario
echo "3. Verificando detalles del usuario..."
echo "=========================================="
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -c "
SELECT 
    email,
    is_active,
    is_staff,
    is_superuser,
    role,
    date_joined,
    last_login,
    CASE WHEN password LIKE 'pbkdf2%' THEN 'Password hash válido' ELSE 'Password hash inválido' END as password_status
FROM accounts_customuser 
WHERE email = 'admin@mykaizenfit.com';
" 2>/dev/null

echo ""

# Verificar estado is_active
echo "4. Verificando si el usuario está activo..."
IS_ACTIVE=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT is_active FROM accounts_customuser WHERE email = 'admin@mykaizenfit.com';" 2>/dev/null | tr -d ' ')

if [ "$IS_ACTIVE" = "f" ] || [ "$IS_ACTIVE" = "False" ] || [ -z "$IS_ACTIVE" ]; then
    echo "❌ PROBLEMA ENCONTRADO: El usuario está INACTIVO (is_active = false)"
    echo ""
    echo "SOLUCIÓN: Activar el usuario"
    echo ""
    read -p "¿Activar el usuario ahora? (s/n): " activar
    if [ "$activar" = "s" ] || [ "$activar" = "S" ]; then
        sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T backend python manage.py shell << 'EOF'
from accounts.models import CustomUser
try:
    admin = CustomUser.objects.get(email='admin@mykaizenfit.com')
    admin.is_active = True
    admin.save()
    print("✅ Usuario activado correctamente")
except Exception as e:
    print(f"❌ Error: {e}")
EOF
    fi
    exit 1
fi

echo "✓ Usuario está activo"
echo ""

# Verificar si la contraseña está configurada
echo "5. Verificando hash de contraseña..."
HAS_PASSWORD=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT password FROM accounts_customuser WHERE email = 'admin@mykaizenfit.com';" 2>/dev/null | tr -d ' ')

if [ -z "$HAS_PASSWORD" ] || [ "$HAS_PASSWORD" = "" ]; then
    echo "❌ PROBLEMA ENCONTRADO: El usuario NO tiene contraseña configurada"
    echo ""
    echo "SOLUCIÓN: Configurar la contraseña"
    echo ""
    read -p "¿Configurar contraseña ahora? (s/n): " configurar
    if [ "$configurar" = "s" ] || [ "$configurar" = "S" ]; then
        sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T backend python manage.py shell << 'EOF'
from accounts.models import CustomUser
try:
    admin = CustomUser.objects.get(email='admin@mykaizenfit.com')
    admin.set_password('AdminMyKaizenFit123!')
    admin.save()
    print("✅ Contraseña configurada correctamente")
    print("   Contraseña: AdminMyKaizenFit123!")
except Exception as e:
    print(f"❌ Error: {e}")
EOF
    fi
    exit 1
fi

echo "✓ Usuario tiene contraseña configurada"
echo ""

# Intentar verificar la contraseña programáticamente
echo "6. Verificando si la contraseña es correcta..."
echo "   (Probando con Django check_password)..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T backend python manage.py shell << 'EOF'
from accounts.models import CustomUser

try:
    admin = CustomUser.objects.get(email='admin@mykaizenfit.com')
    
    # Verificar contraseña
    if admin.check_password('AdminMyKaizenFit123!'):
        print("✅ Contraseña es CORRECTA")
    else:
        print("❌ PROBLEMA: La contraseña NO coincide")
        print("")
        print("SOLUCIÓN: Resetear la contraseña")
        admin.set_password('AdminMyKaizenFit123!')
        admin.save()
        print("✅ Contraseña reseteada a: AdminMyKaizenFit123!")
    
    # Verificar otros campos importantes
    print("")
    print("Estado del usuario:")
    print(f"  - Email: {admin.email}")
    print(f"  - is_active: {admin.is_active}")
    print(f"  - is_staff: {admin.is_staff}")
    print(f"  - is_superuser: {admin.is_superuser}")
    print(f"  - role: {admin.role}")
    
except CustomUser.DoesNotExist:
    print("❌ Usuario no encontrado")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
EOF

echo ""
echo "=========================================="
echo "  VERIFICAR LOGS DEL BACKEND"
echo "=========================================="
echo ""
echo "7. Últimas líneas de los logs del backend (puede contener más información sobre el error):"
echo ""

sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs --tail=50 backend | grep -i -E "(error|exception|login|auth|401|unauthorized)" | tail -20 || echo "No se encontraron errores relevantes en los logs"

echo ""
echo "=========================================="
echo "  RESUMEN DEL DIAGNÓSTICO"
echo "=========================================="
echo ""
echo "Este error puede ser causado por:"
echo ""
echo "1. ❌ Usuario no existe en la base de datos"
echo "   → Solución: Crear el usuario con crear_usuario_admin.sh"
echo ""
echo "2. ❌ Usuario inactivo (is_active = False)"
echo "   → Solución: Activar el usuario"
echo ""
echo "3. ❌ Contraseña incorrecta"
echo "   → Solución: Resetear la contraseña"
echo ""
echo "4. ❌ Usuario no tiene contraseña configurada"
echo "   → Solución: Configurar la contraseña"
echo ""
echo "5. ❌ Base de datos no conectada correctamente"
echo "   → Solución: Verificar conexión a la base de datos"
echo ""
echo "6. ❌ Error en el serializer de autenticación"
echo "   → Solución: Revisar logs del backend"
echo ""
echo "=========================================="
echo ""

