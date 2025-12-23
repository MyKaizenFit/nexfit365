#!/bin/bash

# ============================================
# Script para Importar Base de Datos desde ZIP
# ============================================
# Este script importa una base de datos desde un archivo ZIP
#
# Uso:
#   ./scripts/deployment/import-from-zip.sh backups/dev_database_export_20251221_020512.sql.zip
#
# ⚠️ ADVERTENCIA: Este script reemplazará completamente la base de datos de producción

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

# Parsear argumentos
ZIP_FILE=""
COMPOSE_PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.prod.yml"
AUTO_CONFIRM=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            ZIP_FILE="$2"
            shift 2
            ;;
        -p|--project)
            COMPOSE_PROJECT_NAME="$2"
            shift 2
            ;;
        -c|--compose)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        -y|--yes)
            AUTO_CONFIRM=true
            shift
            ;;
        *)
            if [ -z "$ZIP_FILE" ]; then
                ZIP_FILE="$1"
            else
                print_error "Opción desconocida: $1"
                echo "Uso: $0 [-f] <archivo_zip> [-p <project_name>] [-c <compose_file>] [-y]"
                exit 1
            fi
            shift
            ;;
    esac
done

if [ -z "$ZIP_FILE" ]; then
    print_error "Debes especificar el archivo ZIP con -f o como argumento"
    echo "Uso: $0 [-f] <archivo_zip>"
    exit 1
fi

echo ""
echo "========================================="
echo -e "${RED}⚠️  IMPORTAR BASE DE DATOS DESDE ZIP${NC}"
echo "========================================="
echo ""
print_warning "ADVERTENCIA: Este proceso reemplazará completamente la base de datos de producción."
echo ""

# Confirmación
if [ "$AUTO_CONFIRM" = false ]; then
    read -p "¿Estás seguro de que deseas continuar? (escribe 'SI' para confirmar): " confirmation
    if [ "$confirmation" != "SI" ]; then
        print_info "Operación cancelada."
        exit 0
    fi
else
    print_info "Confirmación automática activada (-y)"
fi

# 1. Verificar que el archivo existe
print_info "Verificando archivo ZIP..."
if [ ! -f "$ZIP_FILE" ]; then
    print_error "El archivo ZIP no existe: $ZIP_FILE"
    exit 1
fi
print_success "Archivo encontrado: $ZIP_FILE"

# 2. Verificar que Docker esté corriendo
print_info "Verificando Docker..."
if ! docker ps > /dev/null 2>&1; then
    print_error "Docker no está corriendo. Por favor inicia Docker."
    exit 1
fi
print_success "Docker está corriendo"

# 3. Verificar que el contenedor de BD de producción esté corriendo
print_info "Verificando contenedor de base de datos de producción..."
DB_CONTAINER=$(COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE ps -q db 2>/dev/null || echo "")

if [ -z "$DB_CONTAINER" ]; then
    print_error "No se encontró contenedor de base de datos de producción."
    print_info "Asegúrate de que los servicios de producción estén corriendo:"
    echo -e "${YELLOW}  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE up -d db${NC}"
    exit 1
fi

print_success "Contenedor encontrado: $DB_CONTAINER"

# 4. Obtener variables de entorno de producción
print_info "Obteniendo configuración de base de datos de producción..."

DB_NAME="mykaizenfit"
DB_USER="postgres"

if [ -f "docker/backend.env.production" ]; then
    if grep -q "^POSTGRES_DB=" docker/backend.env.production; then
        DB_NAME=$(grep "^POSTGRES_DB=" docker/backend.env.production | cut -d'=' -f2 | tr -d ' ')
    fi
    if grep -q "^POSTGRES_USER=" docker/backend.env.production; then
        DB_USER=$(grep "^POSTGRES_USER=" docker/backend.env.production | cut -d'=' -f2 | tr -d ' ')
    fi
    print_success "Configuración leída desde backend.env.production"
else
    print_warning "No se encontró backend.env.production, usando valores por defecto"
fi

print_info "Base de datos: $DB_NAME"
print_info "Usuario: $DB_USER"

# 5. Crear backup de la BD actual de producción
print_info "Creando backup de la base de datos actual de producción..."
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PROD_BACKUP_FILE="${BACKUP_DIR}/prod_backup_before_import_${TIMESTAMP}.sql"

if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists > "$PROD_BACKUP_FILE" 2>&1; then
    print_success "Backup de producción creado: $PROD_BACKUP_FILE"
else
    print_warning "No se pudo crear backup de producción, pero continuando..."
fi

# 6. Detener servicios que usan la BD
print_info "Deteniendo servicios que usan la base de datos..."
COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE stop backend 2>/dev/null || true
print_success "Servicios detenidos"

# 7. Descomprimir archivo ZIP
print_info "Descomprimiendo archivo ZIP..."
EXTRACT_DIR="${BACKUP_DIR}/extracted_${TIMESTAMP}"
mkdir -p "$EXTRACT_DIR"

if unzip -q "$ZIP_FILE" -d "$EXTRACT_DIR"; then
    print_success "Archivo descomprimido en: $EXTRACT_DIR"
    
    # Buscar el archivo SQL dentro del directorio extraído
    SQL_FILE=$(find "$EXTRACT_DIR" -name "*.sql" -type f | head -1)
    
    if [ -z "$SQL_FILE" ]; then
        print_error "No se encontró archivo .sql dentro del ZIP"
        exit 1
    fi
    
    print_info "Archivo SQL encontrado: $SQL_FILE"
else
    print_error "Error al descomprimir el archivo ZIP"
    exit 1
fi

# 8. Verificar si el archivo SQL está comprimido con gzip
if [[ "$SQL_FILE" == *.gz ]] || file "$SQL_FILE" | grep -q "gzip"; then
    print_info "El archivo SQL está comprimido con gzip, descomprimiendo..."
    TEMP_SQL="${SQL_FILE%.gz}"
    if gunzip -c "$SQL_FILE" > "$TEMP_SQL" 2>/dev/null; then
        SQL_FILE="$TEMP_SQL"
        print_success "Archivo descomprimido: $SQL_FILE"
    else
        print_error "Error al descomprimir el archivo SQL"
        exit 1
    fi
fi

# 9. Eliminar y recrear la base de datos
print_info "Eliminando base de datos existente..."
if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" > /dev/null 2>&1; then
    print_success "Base de datos eliminada"
    
    print_info "Creando nueva base de datos..."
    if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" > /dev/null 2>&1; then
        print_success "Base de datos creada"
    else
        print_error "Error al crear la base de datos"
        exit 1
    fi
else
    print_error "Error al eliminar la base de datos"
    exit 1
fi

# 10. Importar datos
print_info "Importando datos..."
print_info "Esto puede tomar varios minutos dependiendo del tamaño de la BD..."

if cat "$SQL_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
    print_success "Importación completada"
else
    print_error "Error durante la importación"
    print_info "Verifica los logs del contenedor: docker logs $DB_CONTAINER"
    # Limpiar archivos temporales
    if [ -d "$EXTRACT_DIR" ]; then
        rm -rf "$EXTRACT_DIR"
    fi
    exit 1
fi

# 11. Limpiar archivos temporales
print_info "Limpiando archivos temporales..."
if [ -d "$EXTRACT_DIR" ]; then
    rm -rf "$EXTRACT_DIR"
    print_success "Archivos temporales eliminados"
fi

# 12. Reiniciar servicios
print_info "Reiniciando servicios..."
COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE up -d backend 2>&1 | grep -v "is up-to-date" || true
print_success "Servicios reiniciados"

# 13. Esperar a que el backend esté listo
print_info "Esperando a que el backend esté listo..."
sleep 10

# 14. Ejecutar migraciones
print_info "Ejecutando migraciones..."
if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T backend python manage.py migrate --noinput > /dev/null 2>&1; then
    print_success "Migraciones aplicadas"
else
    print_warning "No se pudieron ejecutar las migraciones automáticamente"
    print_info "Ejecuta manualmente: COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE exec backend python manage.py migrate --noinput"
fi

echo ""
echo "========================================="
echo -e "${GREEN}✅ IMPORTACIÓN COMPLETADA${NC}"
echo "========================================="
echo ""
print_success "La base de datos ha sido importada desde el archivo ZIP"
echo ""
print_info "Backup de producción guardado en: $PROD_BACKUP_FILE"
echo ""
print_info "Verifica que todo funcione correctamente:"
echo -e "${YELLOW}  - Backend: http://localhost:8000/api/health/${NC}"
echo -e "${YELLOW}  - Frontend: http://localhost:3000${NC}"
echo ""


