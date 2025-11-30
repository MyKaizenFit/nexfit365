#!/bin/bash
# Script para copiar los datos de desarrollo a producción
# ⚠️ ADVERTENCIA: Esto reemplazará todos los datos de producción con los de desarrollo

set -e

echo "=========================================="
echo "  COPIAR DATOS DE DESARROLLO A PRODUCCIÓN"
echo "=========================================="
echo ""
echo "⚠️  ADVERTENCIA CRÍTICA:"
echo "   Este proceso REEMPLAZARÁ todos los datos de la base de datos"
echo "   de PRODUCCIÓN con los datos de desarrollo."
echo ""
echo "   ⚠️⚠️⚠️  ESTO ES DESTRUCTIVO  ⚠️⚠️⚠️"
echo ""
echo "   - BD Origen (Desarrollo): mykaizenfit_dev"
echo "   - BD Destino (Producción): mykaizenfit"
echo ""
echo "   Se creará un backup automático de producción antes de continuar."
echo ""

# Confirmación doble
read -p "¿Estás ABSOLUTAMENTE seguro? Escribe 'CONFIRMAR' en mayúsculas: " confirm1
if [ "$confirm1" != "CONFIRMAR" ]; then
    echo "Operación cancelada."
    exit 0
fi

echo ""
read -p "Escribe de nuevo 'CONFIRMAR' para continuar: " confirm2
if [ "$confirm2" != "CONFIRMAR" ]; then
    echo "Operación cancelada."
    exit 0
fi

echo ""
echo "Iniciando proceso de actualización de producción..."
echo ""

# Ir al directorio de desarrollo
cd /srv/mykaizenfit/pro

# Verificar que desarrollo esté corriendo
if ! COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps db | grep -q "Up"; then
    echo "❌ Error: El contenedor de base de datos de desarrollo NO está corriendo"
    exit 1
fi

# Verificar que producción esté corriendo
cd /srv/mykaizenfit/app
if ! sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml ps db | grep -q "Up"; then
    echo "❌ Error: El contenedor de base de datos de producción NO está corriendo"
    exit 1
fi

echo "✓ Contenedores verificados"
echo ""

# Detener backend de producción
echo "1. Deteniendo backend de producción..."
cd /srv/mykaizenfit/app
sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml stop backend

# Crear backup de seguridad de producción
echo ""
echo "2. Creando backup de seguridad de producción..."
BACKUP_DIR="/srv/mykaizenfit/app/backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/mykaizenfit_prod_backup_antes_de_actualizar_$(date +%Y%m%d_%H%M%S).dump"

sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres -F c -b -v -f /tmp/prod_backup_seguridad.dump mykaizenfit
sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml cp db:/tmp/prod_backup_seguridad.dump "$BACKUP_FILE"
sudo chmod 644 "$BACKUP_FILE"

echo "✓ Backup de seguridad creado: $BACKUP_FILE"
echo "   (Guárdalo por si necesitas restaurar producción)"
echo ""

# Crear backup de desarrollo
echo "3. Creando backup de la base de datos de desarrollo..."
cd /srv/mykaizenfit/pro
DEV_BACKUP="/tmp/mykaizenfit_dev_backup_$(date +%Y%m%d_%H%M%S).dump"

COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres -F c -b -v -f /tmp/dev_backup.dump mykaizenfit_dev
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml cp db:/tmp/dev_backup.dump "$DEV_BACKUP"

echo "✓ Backup de desarrollo creado: $DEV_BACKUP"
echo ""

# Eliminar base de datos de producción (⚠️ DESTRUCTIVO)
echo "4. Eliminando base de datos de producción actual..."
cd /srv/mykaizenfit/app
sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS mykaizenfit;" 2>/dev/null || true

# Crear nueva base de datos de producción
echo ""
echo "5. Creando nueva base de datos de producción..."
sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -c "CREATE DATABASE mykaizenfit;" 2>/dev/null || {
    echo "⚠️  La base de datos ya existe, continuando..."
}

# Copiar backup de dev al contenedor de producción
echo ""
echo "6. Copiando datos de desarrollo a producción..."
sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml cp "$DEV_BACKUP" db:/tmp/dev_backup.dump

# Restaurar backup en producción
echo ""
echo "7. Restaurando datos en la base de datos de producción..."
echo "   ⏳ Esto puede tardar varios minutos..."
sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml exec -T db pg_restore -U postgres -d mykaizenfit -v --no-owner --no-acl /tmp/dev_backup.dump 2>&1 | grep -v "ERROR:" || {
    echo "⚠️  Algunos errores durante la restauración (puede ser normal)"
}

# Limpiar backups temporales
echo ""
echo "8. Limpiando archivos temporales..."
sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml exec -T db rm -f /tmp/dev_backup.dump /tmp/prod_backup_seguridad.dump 2>/dev/null || true
rm -f "$DEV_BACKUP"

# Verificar datos copiados
echo ""
echo "9. Verificando datos en producción..."
USERS=$(sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit -t -c "SELECT COUNT(*) FROM accounts_customuser;" 2>/dev/null | tr -d ' ')
EXERCISES=$(sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit -t -c "SELECT COUNT(*) FROM workouts_exercise;" 2>/dev/null | tr -d ' ')
RECIPES=$(sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit -t -c "SELECT COUNT(*) FROM nutrition_recipe;" 2>/dev/null | tr -d ' ')

echo "   👥 Usuarios: $USERS"
echo "   💪 Ejercicios: $EXERCISES"
echo "   🍽️  Recetas: $RECIPES"
echo ""

# Reiniciar backend de producción
echo "10. Reiniciando backend de producción..."
sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml restart backend

echo ""
echo "=========================================="
echo "  ✅ ACTUALIZACIÓN DE PRODUCCIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Los datos de desarrollo han sido copiados a producción."
echo ""
echo "📦 Backup de seguridad de producción guardado en:"
echo "   $BACKUP_FILE"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - Guarda el backup por si necesitas restaurar"
echo "   - Verifica que la aplicación funcione correctamente"
echo "   - Los usuarios deberán hacer login de nuevo si cambió algo"

