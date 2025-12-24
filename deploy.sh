#!/bin/bash

# ============================================
# Script de Deployment para Producción - NexFit365
# ============================================
# Este script despliega la aplicación en producción usando Docker Compose
#
# Uso:
#   ./deploy.sh [--no-build] [--skip-migrations] [--help]
#
# Opciones:
#   --no-build          No reconstruir las imágenes Docker
#   --skip-migrations   No ejecutar migraciones (útil si ya se ejecutaron)
#   --help              Mostrar esta ayuda

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuración
COMPOSE_PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.prod.yml"

# Flags
NO_BUILD=false
SKIP_MIGRATIONS=false

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
    echo "Opciones:"
    echo "  --no-build          No reconstruir las imágenes Docker"
    echo "  --skip-migrations   No ejecutar migraciones"
    echo "  --help              Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0                           # Deployment completo"
    echo "  $0 --no-build                # Solo reiniciar servicios"
    echo "  $0 --skip-migrations         # No ejecutar migraciones"
}

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-build)
            NO_BUILD=true
            shift
            ;;
        --skip-migrations)
            SKIP_MIGRATIONS=true
            shift
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
echo -e "${CYAN}🚀 DEPLOYMENT A PRODUCCIÓN${NC}"
echo "========================================="
echo ""

# 1. Verificar dependencias
print_info "Verificando dependencias..."

if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado"
    exit 1
fi

if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose no está instalado"
    exit 1
fi

print_success "Dependencias verificadas"

# 2. Verificar archivos de configuración
print_info "Verificando archivos de configuración..."

if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "Archivo $COMPOSE_FILE no encontrado"
    exit 1
fi

if [ ! -f "docker/backend.env.production" ]; then
    print_warning "Archivo docker/backend.env.production no encontrado"
    print_info "Asegúrate de que las variables de entorno estén configuradas"
fi

if [ ! -f "frontend/docker.env.production" ]; then
    print_warning "Archivo frontend/docker.env.production no encontrado"
    print_info "Asegúrate de que las variables de entorno estén configuradas"
fi

print_success "Archivos de configuración verificados"

# 3. Construir imágenes (si no se especifica --no-build)
if [ "$NO_BUILD" = false ]; then
    print_info "Construyendo imágenes Docker..."
    print_info "Esto puede tomar varios minutos..."
    
    if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE build --no-cache; then
        print_success "Imágenes construidas"
    else
        print_error "Error al construir las imágenes"
        exit 1
    fi
else
    print_info "Omitiendo construcción de imágenes (--no-build)"
fi

# 4. Iniciar servicios
print_info "Iniciando servicios..."
if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE up -d; then
    print_success "Servicios iniciados"
else
    print_error "Error al iniciar los servicios"
    exit 1
fi

# 5. Esperar a que los servicios estén listos
print_info "Esperando a que los servicios estén listos..."
sleep 15

# 6. Verificar estado de los servicios
print_info "Verificando estado de los servicios..."
COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE ps

# 7. Ejecutar migraciones (si no se especifica --skip-migrations)
if [ "$SKIP_MIGRATIONS" = false ]; then
    print_info "Ejecutando migraciones..."
    
    # Esperar un poco más para que el backend esté completamente listo
    sleep 5
    
    if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T backend python manage.py migrate --noinput; then
        print_success "Migraciones aplicadas"
    else
        print_warning "Error al ejecutar migraciones"
        print_info "Intenta ejecutar manualmente:"
        echo -e "${YELLOW}  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE exec backend python manage.py migrate --noinput${NC}"
    fi
else
    print_info "Omitiendo migraciones (--skip-migrations)"
fi

# 8. Recolectar archivos estáticos
print_info "Recolectando archivos estáticos..."
if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T backend python manage.py collectstatic --noinput; then
    print_success "Archivos estáticos recolectados"
else
    print_warning "Error al recolectar archivos estáticos"
    print_info "Intenta ejecutar manualmente:"
    echo -e "${YELLOW}  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE exec backend python manage.py collectstatic --noinput${NC}"
fi

# 9. Verificar health checks
print_info "Verificando health checks..."
sleep 5

BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health/ || echo "000")
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "000")

if [ "$BACKEND_HEALTH" = "200" ]; then
    print_success "Backend está respondiendo correctamente"
else
    print_warning "Backend no está respondiendo correctamente (código: $BACKEND_HEALTH)"
fi

if [ "$FRONTEND_HEALTH" = "200" ]; then
    print_success "Frontend está respondiendo correctamente"
else
    print_warning "Frontend no está respondiendo correctamente (código: $FRONTEND_HEALTH)"
fi

echo ""
echo "========================================="
echo -e "${GREEN}✅ DEPLOYMENT COMPLETADO${NC}"
echo "========================================="
echo ""
print_success "La aplicación ha sido desplegada en producción"
echo ""
print_info "URLs:"
echo -e "${YELLOW}  - Backend:  http://localhost:8000${NC}"
echo -e "${YELLOW}  - Frontend: http://localhost:3000${NC}"
echo ""
print_info "Comandos útiles:"
echo -e "${YELLOW}  - Ver logs:     COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE logs -f${NC}"
echo -e "${YELLOW}  - Ver estado:   COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE ps${NC}"
echo -e "${YELLOW}  - Detener:       COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE down${NC}"
echo ""
