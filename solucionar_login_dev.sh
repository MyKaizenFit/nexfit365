#!/bin/bash
# Script para solucionar problemas de login en desarrollo
# Verifica datos y crea usuario admin o copia de producción

echo "=========================================="
echo "  SOLUCIONAR LOGIN EN DESARROLLO"
echo "=========================================="
echo ""

cd /srv/mykaizenfit/pro

# Verificar que el backend esté corriendo
if ! sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps backend 2>/dev/null | grep -q "Up"; then
    echo "⚠️  El contenedor de backend NO está corriendo"
    echo "   Levantando backend..."
    sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d backend
    echo "   Esperando 10 segundos..."
    sleep 10
fi

echo "✓ Backend está corriendo"
echo ""

# Verificar si hay usuarios en la base de datos
echo "1. Verificando si hay usuarios en la base de datos..."
USER_COUNT=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT COUNT(*) FROM accounts_customuser;" 2>/dev/null | tr -d ' ' || echo "0")

if [ -z "$USER_COUNT" ] || [ "$USER_COUNT" = "0" ]; then
    echo "⚠️  No hay usuarios en la base de datos de desarrollo"
    echo ""
    echo "Opciones:"
    echo "  1) Copiar TODOS los datos de producción a desarrollo (usuarios, ejercicios, recetas, etc.)"
    echo "  2) Solo crear el usuario administrador en desarrollo"
    echo ""
    read -p "¿Qué prefieres? (1 o 2): " opcion
    
    if [ "$opcion" = "1" ]; then
        echo ""
        echo "Copiando datos de producción..."
        bash /srv/mykaizenfit/pro/verificar_y_copiar_datos.sh
        exit 0
    elif [ "$opcion" = "2" ]; then
        echo ""
        echo "Creando usuario administrador..."
        bash /srv/mykaizenfit/pro/crear_usuario_admin.sh
        exit 0
    else
        echo "Opción no válida. Saliendo..."
        exit 1
    fi
else
    echo "✓ Hay $USER_COUNT usuarios en la base de datos"
    echo ""
    
    # Verificar si existe el usuario admin
    echo "2. Verificando si existe el usuario admin@mykaizenfit.com..."
    ADMIN_EXISTS=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT COUNT(*) FROM accounts_customuser WHERE email = 'admin@mykaizenfit.com';" 2>/dev/null | tr -d ' ' || echo "0")
    
    if [ "$ADMIN_EXISTS" = "0" ] || [ -z "$ADMIN_EXISTS" ]; then
        echo "⚠️  El usuario admin@mykaizenfit.com NO existe"
        echo ""
        read -p "¿Crear el usuario administrador? (s/n): " crear
        
        if [ "$crear" = "s" ] || [ "$crear" = "S" ]; then
            echo ""
            bash /srv/mykaizenfit/pro/crear_usuario_admin.sh
        else
            echo "Operación cancelada."
            exit 0
        fi
    else
        echo "✓ El usuario admin@mykaizenfit.com existe"
        echo ""
        echo "El usuario debería poder iniciar sesión."
        echo ""
        echo "Si no puede iniciar sesión, puede ser que:"
        echo "  1) La contraseña sea incorrecta"
        echo "  2) El usuario esté inactivo"
        echo ""
        read -p "¿Quieres resetear la contraseña del admin? (s/n): " resetear
        
        if [ "$resetear" = "s" ] || [ "$resetear" = "S" ]; then
            echo ""
            echo "Reseteando contraseña del usuario admin..."
            sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T backend python manage.py shell << 'EOF'
from accounts.models import CustomUser

try:
    admin = CustomUser.objects.get(email='admin@mykaizenfit.com')
    admin.set_password('AdminMyKaizenFit123!')
    admin.is_active = True
    admin.is_staff = True
    admin.is_superuser = True
    admin.save()
    print("✅ Contraseña reseteada a: AdminMyKaizenFit123!")
    print("✅ Usuario activado y permisos verificados")
except CustomUser.DoesNotExist:
    print("❌ Usuario admin@mykaizenfit.com no encontrado")
except Exception as e:
    print(f"❌ Error: {e}")
EOF
            echo ""
            echo "✅ Contraseña reseteada. Ahora puedes iniciar sesión con:"
            echo "   Email: admin@mykaizenfit.com"
            echo "   Contraseña: AdminMyKaizenFit123!"
        fi
    fi
fi

echo ""
echo "=========================================="
echo "  ✅ PROCESO COMPLETADO"
echo "=========================================="
echo ""

