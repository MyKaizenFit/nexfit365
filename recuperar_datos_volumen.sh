#!/bin/bash
# Script para recuperar datos del volumen Docker original
# ⚠️ SOLO ejecutar si perdiste datos y el volumen Docker todavía existe

set -e

echo "=========================================="
echo "  RECUPERAR DATOS DEL VOLUMEN DOCKER"
echo "=========================================="
echo ""
echo "⚠️  ADVERTENCIA: Este script sobrescribirá el directorio actual"
echo "   Asegúrate de haber hecho backup si es necesario"
echo ""
read -p "¿Continuar? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Operación cancelada"
    exit 1
fi

PROJECT_NAME="nexfit-pro"
VOLUME_NAME="${PROJECT_NAME}_postgres_data_dev"
TARGET_DIR="/srv/mykaizenfit/pro/data/postgres"

echo ""
echo "1. Verificando si el volumen Docker existe..."
if ! sudo docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
    echo "❌ El volumen Docker '$VOLUME_NAME' NO existe"
    echo "   Los datos no se pueden recuperar desde el volumen"
    echo ""
    echo "   Opciones:"
    echo "   1. Si tienes un backup SQL, restáuralo:"
    echo "      sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev < backup.sql"
    echo ""
    echo "   2. Verificar si hay otros backups en:"
    echo "      ls -la /srv/mykaizenfit/pro/backups/"
    exit 1
fi

echo "   ✓ Volumen encontrado: $VOLUME_NAME"
echo ""

echo "2. Deteniendo servicios..."
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f docker-compose.prod.yml down

echo ""
echo "3. Haciendo backup del directorio actual (por si acaso)..."
if [ -d "$TARGET_DIR" ] && [ "$(ls -A $TARGET_DIR 2>/dev/null)" ]; then
    BACKUP_DIR="${TARGET_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    echo "   → Moviendo directorio actual a: $BACKUP_DIR"
    sudo mv "$TARGET_DIR" "$BACKUP_DIR"
    echo "   ✓ Backup creado"
else
    echo "   → El directorio está vacío o no existe, no se necesita backup"
fi

echo ""
echo "4. Creando directorio destino..."
sudo mkdir -p "$TARGET_DIR"

echo ""
echo "5. Copiando datos del volumen Docker..."
sudo docker run --rm \
    -v "$VOLUME_NAME:/source:ro" \
    -v "$(dirname $TARGET_DIR):/target" \
    alpine sh -c "cp -a /source/. /target/$(basename $TARGET_DIR)/ && chown -R 999:999 /target/$(basename $TARGET_DIR)"

echo "   ✓ Datos copiados"

echo ""
echo "6. Configurando permisos..."
sudo chown -R 999:999 "$TARGET_DIR" 2>/dev/null || true
sudo chmod 700 "$TARGET_DIR"

echo ""
echo "7. Reiniciando servicios..."
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f docker-compose.prod.yml up -d

echo ""
echo "8. Esperando que la base de datos inicie..."
sleep 10

echo ""
echo "9. Verificando que los datos se recuperaron..."
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -c "SELECT COUNT(*) as total_usuarios FROM accounts_user;" 2>&1 | grep -E "total_usuarios|[0-9]+" | head -2

echo ""
echo "=========================================="
echo "  ✅ RECUPERACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "📋 Próximos pasos:"
echo "   1. Verifica que puedes hacer login con tus credenciales"
echo "   2. Si el backup del directorio anterior existe, puedes eliminarlo después de verificar:"
echo "      sudo rm -rf ${TARGET_DIR}_backup_*"
echo "   3. Los datos ahora están en: $TARGET_DIR"
echo ""

