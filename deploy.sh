#!/bin/bash

# ============================================
# Script de Deployment para Producción - NexFit365
# ============================================
# Este script despliega la aplicación en producción usando Docker Compose
#
# Uso:
#   ./deploy.sh [--no-build] [--skip-migrations] [--no-safe] [--no-cache] [--help]
#
# Opciones:
#   --no-build          No reconstruir las imágenes Docker
#   --skip-migrations   No ejecutar migraciones (útil si ya se ejecutaron)
#   --no-safe           Desactiva modo seguro (actualización agresiva)
#   --no-cache          Fuerza build sin caché (MUY costoso en producción)
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
SAFE_MODE=true
NO_CACHE=false

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

compose_cmd() {
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f "$COMPOSE_FILE" "$@"
}

run_low_priority() {
    if command -v ionice >/dev/null 2>&1; then
        ionice -c3 nice -n 19 "$@"
    else
        nice -n 19 "$@"
    fi
}

wait_http_ok() {
    local name="$1"
    local url="$2"
    local max_retries="$3"
    local wait_seconds="$4"
    local attempt=1

    while [ "$attempt" -le "$max_retries" ]; do
        local code
        code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
        if [ "$code" = "200" ] || [ "$code" = "301" ] || [ "$code" = "302" ]; then
            print_success "$name está saludable (HTTP 200)"
            return 0
        fi
        print_info "Esperando $name ($attempt/$max_retries, código actual: $code)..."
        sleep "$wait_seconds"
        attempt=$((attempt + 1))
    done

    print_warning "$name no respondió 200 tras $max_retries intentos"
    return 1
}

# Función de ayuda
show_help() {
    echo "Uso: $0 [OPCIONES]"
    echo ""
    echo "Opciones:"
    echo "  --no-build          No reconstruir las imágenes Docker"
    echo "  --skip-migrations   No ejecutar migraciones"
    echo "  --no-safe           Desactiva modo seguro (no recomendado en producción)"
    echo "  --no-cache          Build sin caché (más lento y consume más recursos)"
    echo "  --help              Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0                           # Deployment seguro recomendado"
    echo "  $0 --no-build                # Sin reconstrucción de imágenes"
    echo "  $0 --no-safe                 # Actualización clásica (más agresiva)"
    echo "  $0 --no-cache                # Rebuild total (solo si es imprescindible)"
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
        --no-safe)
            SAFE_MODE=false
            shift
            ;;
        --no-cache)
            NO_CACHE=true
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

# 1.1 Diagnóstico rápido del host
print_info "Diagnóstico rápido de recursos del host..."
if command -v free >/dev/null 2>&1; then
    FREE_MEM_MB=$(free -m | awk '/^Mem:/ {print $7}')
    print_info "Memoria disponible aproximada: ${FREE_MEM_MB}MB"
    if [ -n "$FREE_MEM_MB" ] && [ "$FREE_MEM_MB" -lt 700 ]; then
        print_warning "Memoria disponible baja (<700MB). Un rebuild puede afectar SSH/producción."
    fi
fi
LOAD_1M=$(cut -d' ' -f1 /proc/loadavg 2>/dev/null || echo "n/a")
print_info "Carga del sistema (1m): $LOAD_1M"

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
    print_info "Construyendo imágenes Docker en modo de bajo impacto..."
    print_info "Esto puede tomar varios minutos..."

    BUILD_FLAGS=()
    if [ "$NO_CACHE" = true ]; then
        BUILD_FLAGS+=(--no-cache)
        print_warning "Build sin caché activado: mayor consumo de CPU/RAM/IO"
    fi

    print_info "Build backend (secuencial)..."
    if run_low_priority env COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f "$COMPOSE_FILE" build "${BUILD_FLAGS[@]}" backend; then
        print_success "Imagen backend construida"
    else
        print_error "Error al construir imagen backend"
        exit 1
    fi

    print_info "Build frontend (secuencial)..."
    if run_low_priority env COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f "$COMPOSE_FILE" build "${BUILD_FLAGS[@]}" frontend; then
        print_success "Imagen frontend construida"
    else
        print_error "Error al construir imagen frontend"
        exit 1
    fi
else
    print_info "Omitiendo construcción de imágenes (--no-build)"
fi

# 4. Iniciar servicios
if [ "$SAFE_MODE" = true ]; then
    print_info "Modo seguro activo: actualización selectiva por servicio"

    print_info "Asegurando infraestructura base (db/redis/db-backup)..."
    if compose_cmd up -d --no-deps db redis db-backup; then
        print_success "Infraestructura base en ejecución"
    else
        print_error "Error al asegurar infraestructura base"
        exit 1
    fi

    print_info "Actualizando backend sin reiniciar toda la stack..."
    if compose_cmd up -d --no-deps backend; then
        print_success "Backend actualizado"
    else
        print_error "Error al actualizar backend"
        exit 1
    fi
else
    print_warning "Modo seguro desactivado (--no-safe): actualización agresiva"
    print_info "Iniciando servicios..."
    if compose_cmd up -d; then
        print_success "Servicios iniciados"
    else
        print_error "Error al iniciar los servicios"
        exit 1
    fi
fi

# 5. Esperar a que los servicios estén listos
print_info "Esperando a que los servicios estén listos..."
sleep 15

# 6. Verificar estado de los servicios
print_info "Verificando estado de los servicios..."
compose_cmd ps
wait_http_ok "Backend" "http://localhost:8000/api/health/" 20 5 || true

# 7. Ejecutar migraciones (si no se especifica --skip-migrations)
if [ "$SKIP_MIGRATIONS" = false ]; then
    print_info "Ejecutando migraciones..."

    # Esperar un poco más para que el backend esté completamente listo
    sleep 5

    if compose_cmd exec -T backend python manage.py migrate --noinput; then
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
if compose_cmd exec -T backend python manage.py collectstatic --noinput; then
    print_success "Archivos estáticos recolectados"
else
    print_warning "Error al recolectar archivos estáticos"
    print_info "Intenta ejecutar manualmente:"
    echo -e "${YELLOW}  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE exec backend python manage.py collectstatic --noinput${NC}"
fi

# 8.1 Actualizar frontend al final para minimizar impacto en usuarios
if [ "$SAFE_MODE" = true ]; then
    print_info "Actualizando frontend al final (modo seguro)..."
    if compose_cmd up -d --no-deps frontend; then
        print_success "Frontend actualizado"
    else
        print_error "Error al actualizar frontend"
        exit 1
    fi
fi

# 9. Verificar health checks
print_info "Verificando health checks..."
sleep 5

BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health/ || echo "000")
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "000")

if [ "$BACKEND_HEALTH" = "200" ] || [ "$BACKEND_HEALTH" = "301" ] || [ "$BACKEND_HEALTH" = "302" ]; then
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
echo -e "${YELLOW}  - Ver logs:      COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE logs -f${NC}"
echo -e "${YELLOW}  - Ver estado:    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE ps${NC}"
echo -e "${YELLOW}  - Detener:       COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE down${NC}"
echo -e "${YELLOW}  - Deploy seguro: ./deploy.sh${NC}"
echo -e "${YELLOW}  - Sin caché:     ./deploy.sh --no-cache${NC}"
echo ""
