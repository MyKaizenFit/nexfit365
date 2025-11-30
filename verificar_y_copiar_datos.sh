#!/bin/bash
# Script para verificar datos en dev y copiar de producción si es necesario
# ⚠️ Sin detener servicios (o mínimamente necesario)

set -e

echo "=========================================="
echo "  VERIFICAR Y COPIAR DATOS DEV"
echo "=========================================="
echo ""

cd /srv/mykaizenfit/pro

# Verificar si el contenedor de dev está corriendo
if ! sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps db 2>/dev/null | grep -q "Up"; then
    echo "⚠️  El contenedor de base de datos de desarrollo NO está corriendo"
    echo "   Levantando contenedor de desarrollo..."
    sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d db
    echo "   Esperando 10 segundos para que inicie..."
    sleep 10
fi

echo "✓ Base de datos de desarrollo está corriendo"
echo ""

# Verificar si la base de datos existe
echo "1. Verificando si la base de datos 'mykaizenfit_dev' existe..."
DB_EXISTS=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw mykaizenfit_dev && echo "yes" || echo "no")

if [ "$DB_EXISTS" != "yes" ]; then
    echo "⚠️  La base de datos 'mykaizenfit_dev' NO existe"
    echo "   Creando base de datos y ejecutando migraciones..."
    sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -c "CREATE DATABASE mykaizenfit_dev;" 2>/dev/null || true
    echo "   Ejecutando migraciones..."
    sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py migrate || {
        echo "⚠️  Error al ejecutar migraciones. Verifica que el backend esté corriendo."
        exit 1
    }
    echo "✓ Base de datos creada y migraciones aplicadas"
else
    echo "✓ Base de datos 'mykaizenfit_dev' existe"
fi

echo ""

# Contar registros en tablas principales
echo "2. Verificando datos existentes..."
echo "=========================================="

USERS=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT COUNT(*) FROM accounts_customuser;" 2>/dev/null | tr -d ' ' || echo "0")
EXERCISES=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT COUNT(*) FROM workouts_exercise;" 2>/dev/null | tr -d ' ' || echo "0")
RECIPES=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT COUNT(*) FROM nutrition_recipe;" 2>/dev/null | tr -d ' ' || echo "0")

echo "   👥 Usuarios: $USERS"
echo "   💪 Ejercicios: $EXERCISES"
echo "   🍽️  Recetas: $RECIPES"
echo ""

TOTAL=$((USERS + EXERCISES + RECIPES))

if [ "$TOTAL" -gt 0 ]; then
    echo "✅ La base de datos de desarrollo YA tiene datos"
    echo "   Total de registros principales: $TOTAL"
    echo ""
    echo "   No es necesario copiar datos de producción."
    exit 0
fi

echo "⚠️  La base de datos de desarrollo está vacía"
echo ""
echo "=========================================="
echo "  COPIANDO DATOS DE PRODUCCIÓN A DESARROLLO"
echo "=========================================="
echo ""
echo "⚠️  ADVERTENCIA:"
echo "   Este proceso reemplazará la base de datos de desarrollo"
echo "   con los datos de producción."
echo ""
echo "   - Origen (Producción): mykaizenfit"
echo "   - Destino (Desarrollo): mykaizenfit_dev"
echo ""

# Confirmación
read -p "¿Continuar con la copia de datos? (escribe 'SI' en mayúsculas): " confirm
if [ "$confirm" != "SI" ]; then
    echo "Operación cancelada."
    exit 0
fi

echo ""
echo "Iniciando copia de datos..."
echo ""

# Verificar que producción esté corriendo
cd /srv/mykaizenfit/app
if ! sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml ps db 2>/dev/null | grep -q "Up"; then
    echo "❌ Error: El contenedor de base de datos de producción NO está corriendo"
    echo "   Levanta producción primero con:"
    echo "   cd /srv/mykaizenfit/app && sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml up -d"
    exit 1
fi

echo "✓ Producción está corriendo"
echo ""

# Detener solo el backend de desarrollo TEMPORALMENTE (para evitar conexiones activas)
echo "3. Deteniendo backend de desarrollo temporalmente (evita bloqueos)..."
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml stop backend 2>/dev/null || true
echo "   ✓ Backend detenido temporalmente"
echo ""

# Crear backup de producción (sin detener producción)
echo "4. Creando backup de la base de datos de producción..."
cd /srv/mykaizenfit/app
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/mykaizenfit_prod_backup_${BACKUP_TIMESTAMP}.dump"

echo "   Exportando base de datos de producción..."
sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres -F c -b -v -f /tmp/prod_backup.dump mykaizenfit

# Copiar el backup del contenedor al host
echo "   Copiando backup al sistema..."
sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml cp db:/tmp/prod_backup.dump "$BACKUP_FILE"

# Limpiar el backup del contenedor de producción
sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml exec -T db rm -f /tmp/prod_backup.dump 2>/dev/null || true

echo "✓ Backup creado: $BACKUP_FILE"
echo ""

# Eliminar base de datos de desarrollo (si existe)
echo "5. Preparando base de datos de desarrollo..."
cd /srv/mykaizenfit/pro

# Cerrar todas las conexiones activas antes de eliminar
echo "   Cerrando conexiones activas..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'mykaizenfit_dev' AND pid <> pg_backend_pid();" 2>/dev/null || true

# Eliminar y recrear la base de datos
echo "   Eliminando base de datos actual..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS mykaizenfit_dev;" 2>/dev/null || true

echo "   Creando nueva base de datos..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -c "CREATE DATABASE mykaizenfit_dev;" || {
    echo "⚠️  Error al crear base de datos. Verificando si ya existe..."
}

# Copiar el backup al contenedor de desarrollo
echo ""
echo "6. Copiando backup al contenedor de desarrollo..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml cp "$BACKUP_FILE" db:/tmp/prod_backup.dump

# Restaurar backup en desarrollo
echo ""
echo "7. Restaurando datos en la base de datos de desarrollo..."
echo "   ⏳ Esto puede tardar varios minutos según el tamaño de los datos..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db pg_restore -U postgres -d mykaizenfit_dev -v --no-owner --no-acl /tmp/prod_backup.dump 2>&1 | grep -v "^ERROR:" | grep -v "does not exist" | grep -v "already exists" || {
    echo "⚠️  Algunas advertencias durante la restauración (puede ser normal)"
}

# Limpiar backups temporales
echo ""
echo "8. Limpiando archivos temporales..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db rm -f /tmp/prod_backup.dump 2>/dev/null || true
sudo rm -f "$BACKUP_FILE"

# Verificar datos copiados
echo ""
echo "9. Verificando datos copiados..."
USERS_NEW=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT COUNT(*) FROM accounts_customuser;" 2>/dev/null | tr -d ' ' || echo "0")
EXERCISES_NEW=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT COUNT(*) FROM workouts_exercise;" 2>/dev/null | tr -d ' ' || echo "0")
RECIPES_NEW=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT COUNT(*) FROM nutrition_recipe;" 2>/dev/null | tr -d ' ' || echo "0")

echo "   👥 Usuarios: $USERS_NEW"
echo "   💪 Ejercicios: $EXERCISES_NEW"
echo "   🍽️  Recetas: $RECIPES_NEW"
echo ""

# Reiniciar backend de desarrollo
echo "10. Reiniciando backend de desarrollo..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d backend
echo "   Esperando 5 segundos para que el backend se inicie completamente..."
sleep 5

echo ""
echo "=========================================="
echo "  ✅ COPIA COMPLETADA"
echo "=========================================="
echo ""
echo "Los datos de producción han sido copiados a desarrollo."
echo "Puedes ahora trabajar en desarrollo con datos reales."
echo ""
echo "📍 URLs de Desarrollo:"
echo "   Frontend: http://45.136.19.91:3001"
echo "   Backend:  http://45.136.19.91:8001"
echo ""
echo "⚠️  RECUERDA:"
echo "   - Los cambios en desarrollo NO afectan a producción"
echo "   - Para actualizar producción con cambios de dev, usa:"
echo "     sudo bash /srv/mykaizenfit/pro/copiar_dev_a_produccion.sh"
echo ""

