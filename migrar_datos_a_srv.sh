#!/bin/bash
# Script para migrar datos de volúmenes Docker a /srv/mykaizenfit/pro/data/
# Ejecutar con permisos de administrador si es necesario

set -e

echo "=========================================="
echo "  MIGRACIÓN DE DATOS DEV A /srv"
echo "=========================================="
echo ""

PROJECT_NAME="nexfit-pro"
DATA_DIR="/srv/mykaizenfit/pro/data"

# Verificar si existen volúmenes Docker con datos
echo "1. Verificando volúmenes Docker existentes..."

# Función para migrar un volumen Docker a un directorio
migrar_volumen() {
    local VOLUME_NAME=$1
    local TARGET_DIR=$2
    
    if docker volume inspect "${PROJECT_NAME}_${VOLUME_NAME}" >/dev/null 2>&1; then
        echo "   ✓ Encontrado volumen: ${PROJECT_NAME}_${VOLUME_NAME}"
        echo "   → Migrando a: ${TARGET_DIR}"
        
        # Crear directorio si no existe
        mkdir -p "${TARGET_DIR}"
        
        # Crear contenedor temporal para copiar datos
        docker run --rm \
            -v "${PROJECT_NAME}_${VOLUME_NAME}:/source:ro" \
            -v "${TARGET_DIR}:/target" \
            alpine sh -c "cp -a /source/. /target/ && chown -R $(id -u):$(id -g) /target"
        
        echo "   ✓ Migración completada"
    else
        echo "   - Volumen ${PROJECT_NAME}_${VOLUME_NAME} no encontrado (puede ser normal si es la primera vez)"
    fi
}

# Migrar cada volumen
migrar_volumen "postgres_data_dev" "${DATA_DIR}/postgres"
migrar_volumen "redis_data_dev" "${DATA_DIR}/redis" 2>/dev/null || echo "   - Redis no tiene volumen persistente (normal)"
migrar_volumen "backend_static_dev" "${DATA_DIR}/staticfiles"
migrar_volumen "backend_media_dev" "${DATA_DIR}/media"

echo ""
echo "2. Configurando permisos..."

# Asegurar permisos correctos
chown -R iago:iago "${DATA_DIR}" 2>/dev/null || true
chmod -R 755 "${DATA_DIR}"

# Permisos especiales para Postgres (necesita escribir)
chmod 700 "${DATA_DIR}/postgres" 2>/dev/null || true

echo "   ✓ Permisos configurados"
echo ""
echo "=========================================="
echo "  ✅ MIGRACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "📋 Próximos pasos:"
echo "   1. Reinicia los servicios:"
echo "      cd /srv/mykaizenfit/pro"
echo "      COMPOSE_PROJECT_NAME=${PROJECT_NAME} docker compose -f docker-compose.prod.yml down"
echo "      COMPOSE_PROJECT_NAME=${PROJECT_NAME} docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "   2. Verifica que los datos estén accesibles:"
echo "      ls -la ${DATA_DIR}/"
echo ""
echo "   3. (Opcional) Si todo funciona, puedes eliminar los volúmenes antiguos:"
echo "      docker volume ls | grep ${PROJECT_NAME}"
echo "      # Revisa antes de eliminar!"
echo ""

