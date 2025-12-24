#!/bin/bash

# ============================================
# Script Maestro de Deployment Completo
# ============================================
# Este script ejecuta el proceso completo de deployment:
# 1. Exporta la base de datos de desarrollo
# 2. La importa en producción
# 3. Despliega la aplicación
#
# Uso:
#   ./scripts/deployment/deploy-full.sh [--skip-export] [--skip-import] [--help]
#
# Opciones:
#   --skip-export       Omitir exportación de BD de desarrollo
#   --skip-import       Omitir importación de BD en producción
#   --backup-file FILE  Usar un archivo de backup específico (requiere --skip-export)
#   --help              Mostrar esta ayuda

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Flags
SKIP_EXPORT=false
SKIP_IMPORT=false
BACKUP_FILE=""

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

# Función de ayuda
show_help() {
    echo "Uso: $0 [OPCIONES]"
    echo ""
    echo "Este script ejecuta el proceso completo de deployment:"
    echo "  1. Exporta la base de datos de desarrollo"
    echo "  2. La importa en producción"
    echo "  3. Despliega la aplicación"
    echo ""
    echo "Opciones:"
    echo "  --skip-export       Omitir exportación de BD de desarrollo"
    echo "  --skip-import       Omitir importación de BD en producción"
    echo "  --backup-file FILE  Usar un archivo de backup específico (requiere --skip-export)"
    echo "  --help              Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0                                    # Proceso completo"
    echo "  $0 --skip-export --backup-file FILE   # Usar backup existente"
    echo "  $0 --skip-import                      # Solo exportar y desplegar"
}

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-export)
            SKIP_EXPORT=true
            shift
            ;;
        --skip-import)
            SKIP_IMPORT=true
            shift
            ;;
        --backup-file)
            BACKUP_FILE="$2"
            SKIP_EXPORT=true
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            print_error "Opción desconocida: $1"
            show_help
            exit 1
            ;;
    esac
done

echo ""
echo "========================================="
echo -e "${CYAN}🚀 DEPLOYMENT COMPLETO A PRODUCCIÓN${NC}"
echo "========================================="
echo ""

# Cambiar al directorio del proyecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_DIR"

# 1. Exportar base de datos de desarrollo
if [ "$SKIP_EXPORT" = false ]; then
    print_info "Paso 1/3: Exportando base de datos de desarrollo..."
    if [ -f "scripts/deployment/export-dev-db.sh" ]; then
        chmod +x scripts/deployment/export-dev-db.sh
        if ./scripts/deployment/export-dev-db.sh; then
            # Obtener el archivo más reciente
            BACKUP_FILE=$(ls -t backups/dev_database_export_*.sql.gz 2>/dev/null | head -1)
            if [ -n "$BACKUP_FILE" ]; then
                print_success "Backup exportado: $BACKUP_FILE"
            else
                print_error "No se pudo encontrar el archivo de backup exportado"
                exit 1
            fi
        else
            print_error "Error al exportar la base de datos"
            exit 1
        fi
    else
        print_error "Script de exportación no encontrado: scripts/deployment/export-dev-db.sh"
        exit 1
    fi
else
    if [ -z "$BACKUP_FILE" ]; then
        # Buscar el archivo más reciente
        BACKUP_FILE=$(ls -t backups/dev_database_export_*.sql.gz 2>/dev/null | head -1)
        if [ -z "$BACKUP_FILE" ]; then
            print_error "No se encontró ningún archivo de backup. Especifica uno con --backup-file"
            exit 1
        fi
        print_info "Usando backup más reciente: $BACKUP_FILE"
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "El archivo de backup no existe: $BACKUP_FILE"
        exit 1
    fi
    
    print_info "Omitiendo exportación (--skip-export)"
    print_info "Usando backup: $BACKUP_FILE"
fi

# 2. Importar base de datos en producción
if [ "$SKIP_IMPORT" = false ]; then
    print_info "Paso 2/3: Importando base de datos en producción..."
    if [ -f "scripts/deployment/import-to-prod.sh" ]; then
        chmod +x scripts/deployment/import-to-prod.sh
        if ./scripts/deployment/import-to-prod.sh -f "$BACKUP_FILE" -y; then
            print_success "Base de datos importada en producción"
        else
            print_error "Error al importar la base de datos"
            exit 1
        fi
    else
        print_error "Script de importación no encontrado: scripts/deployment/import-to-prod.sh"
        exit 1
    fi
else
    print_info "Omitiendo importación (--skip-import)"
fi

# 3. Desplegar aplicación
print_info "Paso 3/3: Desplegando aplicación..."
if [ -f "deploy.sh" ]; then
    chmod +x deploy.sh
    if ./deploy.sh; then
        print_success "Aplicación desplegada"
    else
        print_error "Error al desplegar la aplicación"
        exit 1
    fi
else
    print_error "Script de deployment no encontrado: deploy.sh"
    exit 1
fi

echo ""
echo "========================================="
echo -e "${GREEN}✅ DEPLOYMENT COMPLETO FINALIZADO${NC}"
echo "========================================="
echo ""
print_success "Todo el proceso de deployment se ha completado exitosamente"
echo ""
print_info "La aplicación está disponible en:"
echo -e "${YELLOW}  - Backend:  http://localhost:8000${NC}"
echo -e "${YELLOW}  - Frontend: http://localhost:3000${NC}"
echo ""

