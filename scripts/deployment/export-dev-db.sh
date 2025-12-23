#!/bin/bash

# ============================================
# Script para Exportar Base de Datos de Desarrollo
# ============================================
# Este script exporta la base de datos de desarrollo para importarla en producción
#
# Uso:
#   ./scripts/deployment/export-dev-db.sh
#
# Requisitos:
#   - Docker corriendo
#   - Contenedor de desarrollo activo
#   - Espacio suficiente en disco

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funciones de output
print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo ""
echo "========================================="
echo -e "${CYAN}📦 EXPORTAR BASE DE DATOS DE DESARROLLO${NC}"
echo "========================================="
echo ""

# 1. Verificar que Docker esté corriendo
print_info "Verificando Docker..."
if ! docker ps > /dev/null 2>&1; then
    print_error "Docker no está corriendo. Por favor inicia Docker."
    exit 1
fi
print_success "Docker está corriendo"

# 2. Verificar que el contenedor de BD de desarrollo esté corriendo
print_info "Verificando contenedor de base de datos de desarrollo..."
COMPOSE_PROJECT_NAME=nexfit-dev
COMPOSE_FILE=docker-compose.dev.yml

DB_CONTAINER=$(COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE ps -q db 2>/dev/null || echo "")

if [ -z "$DB_CONTAINER" ]; then
    print_error "No se encontró contenedor de base de datos de desarrollo."
    print_info "Asegúrate de que los servicios de desarrollo estén corriendo:"
    echo -e "${YELLOW}  COMPOSE_PROJECT_NAME=nexfit-dev docker compose -f docker-compose.dev.yml up -d db${NC}"
    exit 1
fi

print_success "Contenedor encontrado: $DB_CONTAINER"

# 3. Obtener variables de entorno de desarrollo
print_info "Obteniendo configuración de base de datos..."

DB_NAME="mykaizenfit_dev"
DB_USER="postgres"

# Intentar leer desde docker-compose.dev.yml o usar valores por defecto
if [ -f "docker-compose.dev.yml" ]; then
    # Los valores por defecto de dev son mykaizenfit_dev y postgres
    print_success "Usando configuración de docker-compose.dev.yml"
else
    print_warning "No se encontró docker-compose.dev.yml, usando valores por defecto"
fi

print_info "Base de datos: $DB_NAME"
print_info "Usuario: $DB_USER"

# 4. Crear directorio de salida
OUTPUT_DIR="backups"
print_info "Creando directorio de salida..."
mkdir -p "$OUTPUT_DIR"
print_success "Directorio existe: $OUTPUT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="dev_database_export_${TIMESTAMP}.sql"
OUTPUT_PATH="${OUTPUT_DIR}/${FILENAME}"
OUTPUT_PATH_GZ="${OUTPUT_PATH}.gz"

# 5. Exportar base de datos
print_info "Exportando base de datos..."
print_info "Esto puede tomar varios minutos dependiendo del tamaño de la BD..."

if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-acl > "$OUTPUT_PATH" 2>&1; then
    print_success "Exportación completada: $OUTPUT_PATH"
    
    # Verificar tamaño del archivo
    FILE_SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)
    print_info "Tamaño del archivo: $FILE_SIZE"
    
    # 6. Comprimir archivo
    print_info "Comprimiendo archivo..."
    if gzip -f "$OUTPUT_PATH"; then
        COMPRESSED_SIZE=$(du -h "$OUTPUT_PATH_GZ" | cut -f1)
        print_success "Archivo comprimido: $OUTPUT_PATH_GZ"
        print_info "Tamaño comprimido: $COMPRESSED_SIZE"
    else
        print_warning "No se pudo comprimir el archivo, pero la exportación está completa: $OUTPUT_PATH"
    fi
    
    echo ""
    echo "========================================="
    echo -e "${GREEN}✅ EXPORTACIÓN COMPLETADA${NC}"
    echo "========================================="
    echo ""
    print_success "Archivo de exportación: $OUTPUT_PATH_GZ"
    echo ""
    print_info "Próximos pasos:"
    echo "  1. Este archivo está listo para importar en producción"
    echo "  2. Ejecuta el script de importación en producción:"
    echo -e "${YELLOW}     ./scripts/deployment/import-to-prod.sh -f '$OUTPUT_PATH_GZ'${NC}"
    echo ""
    
else
    print_error "Error al exportar la base de datos"
    print_info "Verifica los logs del contenedor: docker logs $DB_CONTAINER"
    exit 1
fi


