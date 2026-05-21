#!/bin/bash

# ============================================
# Script para Corregir Encoding UTF-8 en Base de Datos
# ============================================
# Este script corrige problemas de encoding en la base de datos existente
#
# Uso:
#   ./scripts/deployment/fix-db-encoding.sh [--prod|--dev]
#
# Requisitos:
#   - Docker corriendo
#   - Contenedor de base de datos activo
#   - Backup de la base de datos (se crea automáticamente)

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

# Determinar entorno
ENV="prod"
if [[ "$1" == "--dev" ]]; then
    ENV="dev"
    COMPOSE_PROJECT_NAME="mykaizenfit-dev"
    COMPOSE_FILE="docker-compose.dev.yml"
    DB_NAME="mykaizenfit_dev"
elif [[ "$1" == "--prod" ]] || [[ -z "$1" ]]; then
    ENV="prod"
    COMPOSE_PROJECT_NAME="nexfit-pro"
    COMPOSE_FILE="docker-compose.prod.yml"
    DB_NAME="mykaizenfit"
else
    print_error "Opción desconocida: $1"
    echo "Uso: $0 [--prod|--dev]"
    exit 1
fi

echo ""
echo "========================================="
echo -e "${CYAN}🔧 CORREGIR ENCODING UTF-8 EN BASE DE DATOS${NC}"
echo "========================================="
echo ""
print_info "Entorno: $ENV"
print_info "Base de datos: $DB_NAME"
echo ""

# 1. Verificar que Docker esté corriendo
print_info "Verificando Docker..."
if ! docker ps > /dev/null 2>&1; then
    print_error "Docker no está corriendo. Por favor inicia Docker."
    exit 1
fi
print_success "Docker está corriendo"

# 2. Verificar que el contenedor de BD esté corriendo
print_info "Verificando contenedor de base de datos..."
DB_CONTAINER=$(COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE ps -q db 2>/dev/null || echo "")

if [ -z "$DB_CONTAINER" ]; then
    print_error "No se encontró contenedor de base de datos."
    print_info "Asegúrate de que los servicios estén corriendo:"
    echo -e "${YELLOW}  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE up -d db${NC}"
    exit 1
fi

print_success "Contenedor encontrado: $DB_CONTAINER"

# 3. Obtener variables de entorno
DB_USER="postgres"
if [ -f "docker/backend.env.production" ] && [ "$ENV" == "prod" ]; then
    if grep -q "^POSTGRES_USER=" docker/backend.env.production; then
        DB_USER=$(grep "^POSTGRES_USER=" docker/backend.env.production | cut -d'=' -f2 | tr -d ' ')
    fi
fi

print_info "Usuario: $DB_USER"

# 4. Crear backup antes de modificar
print_info "Creando backup de seguridad..."
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/encoding_fix_backup_${ENV}_${TIMESTAMP}.sql.gz"

if docker exec -e PGCLIENTENCODING=UTF8 "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-acl --encoding=UTF8 | gzip > "$BACKUP_FILE" 2>&1; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_success "Backup creado: $BACKUP_FILE ($BACKUP_SIZE)"
else
    print_error "Error al crear backup. Abortando por seguridad."
    exit 1
fi

# 5. Verificar encoding actual de la base de datos
print_info "Verificando encoding actual de la base de datos..."
CURRENT_ENCODING=$(docker exec -e PGCLIENTENCODING=UTF8 "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = '$DB_NAME';" 2>/dev/null | tr -d ' ' || echo "unknown")

print_info "Encoding actual: $CURRENT_ENCODING"

if [ "$CURRENT_ENCODING" != "UTF8" ] && [ "$CURRENT_ENCODING" != "utf8" ]; then
    print_warning "La base de datos NO está usando UTF8"
    print_warning "Se recomienda recrear la base de datos con UTF8"
    echo ""
    read -p "¿Deseas continuar con la corrección de datos existentes? (s/N): " confirm
    if [[ ! "$confirm" =~ ^[Ss]$ ]]; then
        print_info "Operación cancelada."
        exit 0
    fi
else
    print_success "La base de datos está usando UTF8"
fi

# 6. Verificar y establecer client_encoding
print_info "Verificando client_encoding..."
CURRENT_CLIENT_ENCODING=$(docker exec -e PGCLIENTENCODING=UTF8 "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SHOW client_encoding;" 2>/dev/null | tr -d ' ' || echo "unknown")

print_info "Client encoding actual: $CURRENT_CLIENT_ENCODING"

if [ "$CURRENT_CLIENT_ENCODING" != "UTF8" ] && [ "$CURRENT_CLIENT_ENCODING" != "utf8" ]; then
    print_info "Estableciendo client_encoding a UTF8..."
    if docker exec -e PGCLIENTENCODING=UTF8 "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "SET client_encoding TO 'UTF8';" > /dev/null 2>&1; then
        print_success "Client encoding establecido a UTF8"
    else
        print_warning "No se pudo establecer client_encoding automáticamente"
    fi
else
    print_success "Client encoding ya está en UTF8"
fi

# 7. Ejecutar script de corrección de Django (si existe)
print_info "Ejecutando corrección de datos con Django..."
if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T backend python manage.py fix_users_utf8 --no-color > /dev/null 2>&1; then
    print_success "Corrección de usuarios completada"
else
    print_warning "No se pudo ejecutar fix_users_utf8 (puede que no exista el comando)"
fi

# 8. Verificar encoding después de la corrección
print_info "Verificando encoding después de la corrección..."
FINAL_ENCODING=$(docker exec -e PGCLIENTENCODING=UTF8 "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = '$DB_NAME';" 2>/dev/null | tr -d ' ' || echo "unknown")
FINAL_CLIENT_ENCODING=$(docker exec -e PGCLIENTENCODING=UTF8 "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SHOW client_encoding;" 2>/dev/null | tr -d ' ' || echo "unknown")

echo ""
echo "========================================="
echo -e "${GREEN}✅ CORRECCIÓN COMPLETADA${NC}"
echo "========================================="
echo ""
print_info "Encoding de la base de datos: $FINAL_ENCODING"
print_info "Client encoding: $FINAL_CLIENT_ENCODING"
echo ""
print_success "Backup guardado en: $BACKUP_FILE"
echo ""
print_info "Próximos pasos:"
echo "  1. Verifica que los datos se muestren correctamente"
echo "  2. Si hay problemas, puedes restaurar el backup:"
echo -e "${YELLOW}     gunzip < $BACKUP_FILE | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME${NC}"
echo ""
print_warning "NOTA: Si la base de datos no estaba en UTF8, considera recrearla con UTF8"
echo "      para evitar problemas futuros."
echo ""
