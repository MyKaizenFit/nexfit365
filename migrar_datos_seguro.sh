#!/bin/bash
# Script SEGURO para migrar datos de volúmenes Docker a /srv/mykaizenfit/pro/data/
# ⚠️ PRESERVA los datos existentes - NO elimina nada
# Ejecutar con permisos de administrador si es necesario

set -e

echo "=========================================="
echo "  MIGRACIÓN SEGURA DE DATOS DEV A /srv"
echo "  ⚠️  PRESERVA DATOS EXISTENTES"
echo "=========================================="
echo ""

PROJECT_NAME="nexfit-pro"
DATA_DIR="/srv/mykaizenfit/pro/data"

# Verificar si el directorio de destino ya tiene datos
verificar_datos_existentes() {
    local TARGET_DIR=$1
    local VOLUME_NAME=$2
    
    if [ -d "$TARGET_DIR" ] && [ "$(ls -A $TARGET_DIR 2>/dev/null)" ]; then
        echo "   ⚠️  ADVERTENCIA: El directorio $TARGET_DIR ya contiene datos"
        echo "   → Los datos existentes se PRESERVARÁN"
        echo "   → Si el volumen Docker existe, se COPIARÁN los datos del volumen"
        echo "   → Si el volumen no existe, se MANTENDRÁN los datos actuales"
        return 0
    else
        return 1
    fi
}

# Función SEGURA para migrar un volumen Docker a un directorio
migrar_volumen_seguro() {
    local VOLUME_NAME=$1
    local TARGET_DIR=$2
    
    echo ""
    echo "   Procesando: ${VOLUME_NAME} → ${TARGET_DIR}"
    
    # Verificar si el directorio destino ya tiene datos
    if verificar_datos_existentes "$TARGET_DIR" "$VOLUME_NAME"; then
        echo "   → Datos existentes detectados - se preservarán"
    fi
    
    # Verificar si existe el volumen Docker
    if sudo docker volume inspect "${PROJECT_NAME}_${VOLUME_NAME}" >/dev/null 2>&1; then
        echo "   ✓ Volumen Docker encontrado: ${PROJECT_NAME}_${VOLUME_NAME}"
        
        # Crear directorio si no existe
        mkdir -p "${TARGET_DIR}"
        
        # Si el directorio destino está vacío, copiar del volumen
        if [ ! "$(ls -A $TARGET_DIR 2>/dev/null)" ]; then
            echo "   → Copiando datos del volumen Docker al directorio..."
            sudo docker run --rm \
                -v "${PROJECT_NAME}_${VOLUME_NAME}:/source:ro" \
                -v "${TARGET_DIR}:/target" \
                alpine sh -c "cp -a /source/. /target/ && chown -R $(id -u):$(id -g) /target"
            echo "   ✓ Datos copiados del volumen Docker"
        else
            echo "   → El directorio destino ya tiene datos - NO se sobrescriben"
            echo "   → Si quieres usar los datos del volumen, elimina primero el directorio:"
            echo "     rm -rf ${TARGET_DIR}"
        fi
    else
        echo "   - Volumen Docker no encontrado: ${PROJECT_NAME}_${VOLUME_NAME}"
        if [ -d "$TARGET_DIR" ] && [ "$(ls -A $TARGET_DIR 2>/dev/null)" ]; then
            echo "   → Se mantendrán los datos existentes en ${TARGET_DIR}"
        else
            echo "   → Creando directorio vacío: ${TARGET_DIR}"
            mkdir -p "${TARGET_DIR}"
        fi
    fi
}

echo "1. Verificando y migrando volúmenes Docker..."

# Migrar cada volumen de forma segura
migrar_volumen_seguro "postgres_data_dev" "${DATA_DIR}/postgres"
migrar_volumen_seguro "backend_static_dev" "${DATA_DIR}/staticfiles"
migrar_volumen_seguro "backend_media_dev" "${DATA_DIR}/media"

# Redis no tiene volumen persistente normalmente en dev
echo ""
echo "   Redis: No requiere migración (sin datos persistentes críticos)"

echo ""
echo "2. Configurando permisos..."

# Asegurar permisos correctos
sudo chown -R iago:iago "${DATA_DIR}" 2>/dev/null || true
sudo chmod -R 755 "${DATA_DIR}"

# Permisos especiales para Postgres (necesita escribir)
sudo chmod 700 "${DATA_DIR}/postgres" 2>/dev/null || true

echo "   ✓ Permisos configurados"
echo ""
echo "=========================================="
echo "  ✅ MIGRACIÓN SEGURA COMPLETADA"
echo "=========================================="
echo ""
echo "📋 IMPORTANTE:"
echo "   - Los datos existentes se han PRESERVADO"
echo "   - Los volúmenes Docker originales NO se han eliminado"
echo "   - Puedes verificar los datos en: ${DATA_DIR}/"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Verifica que los datos estén correctos:"
echo "      ls -la ${DATA_DIR}/postgres/"
echo ""
echo "   2. Reinicia los servicios (esto NO eliminará datos):"
echo "      cd /srv/mykaizenfit/pro"
echo "      sudo COMPOSE_PROJECT_NAME=${PROJECT_NAME} docker compose -f docker-compose.prod.yml down"
echo "      sudo COMPOSE_PROJECT_NAME=${PROJECT_NAME} docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "   3. Verifica que la base de datos funcione correctamente"
echo ""
echo "   4. (Opcional) Solo después de verificar que todo funciona, puedes:"
echo "      - Mantener los volúmenes Docker como backup"
echo "      - O eliminarlos si estás seguro: docker volume rm ${PROJECT_NAME}_postgres_data_dev"
echo ""

