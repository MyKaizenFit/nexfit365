#!/bin/bash

# ============================================
# Script de Deployment para Produccion - NexFit365
# ============================================
# Fuente oficial para migraciones, collectstatic y actualizacion selectiva.
#
# Uso:
#   ./deploy.sh [--no-build] [--skip-migrations] [--no-cache] [--background] [--status] [--dry-run] [--bootstrap] [--help]
#
# Opciones:
#   --no-build          No reconstruir las imagenes Docker
#   --skip-migrations   No ejecutar migraciones
#   --no-cache          Fuerza build sin cache (MUY costoso en produccion)
#   --background        Ejecuta en segundo plano (recomendado desde Cursor/SSH fragil)
#   --status            Muestra si hay un deploy en curso y las ultimas lineas del log
#   --dry-run           Muestra el plan sin ejecutar cambios
#   --bootstrap         Inicializacion explicita: levanta infraestructura base antes del deploy
#   --help              Mostrar esta ayuda

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/frontend-health-path.sh
. "$SCRIPT_DIR/scripts/lib/frontend-health-path.sh"
DEPLOY_LOG_DIR="$SCRIPT_DIR/data/logs"
DEPLOY_PID_FILE="$DEPLOY_LOG_DIR/deploy.pid"
DEPLOY_LOG_FILE="$DEPLOY_LOG_DIR/deploy-latest.log"
PREDEPLOY_BACKUP_DIR="$SCRIPT_DIR/backups/predeploy"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuracion
COMPOSE_PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.prod.yml"

# Flags
NO_BUILD=false
SKIP_MIGRATIONS=false
NO_CACHE=false
DRY_RUN=false
BOOTSTRAP=false

print_info() {
    echo -e "${CYAN}INFO: $1${NC}"
}

print_success() {
    echo -e "${GREEN}OK: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}WARN: $1${NC}"
}

print_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

compose_cmd() {
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f "$COMPOSE_FILE" "$@"
}

dry_run_cmd() {
    printf '[dry-run]'
    printf ' %q' "$@"
    printf '\n'
}

run_cmd() {
    if [ "$DRY_RUN" = true ]; then
        dry_run_cmd "$@"
        return 0
    fi
    "$@"
}

run_compose() {
    if [ "$DRY_RUN" = true ]; then
        dry_run_cmd env "COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME" docker compose -f "$COMPOSE_FILE" "$@"
        return 0
    fi
    compose_cmd "$@"
}

run_low_priority() {
    if [ "$DRY_RUN" = true ]; then
        dry_run_cmd "$@"
        return 0
    fi

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

    if [ "$DRY_RUN" = true ]; then
        print_info "[dry-run] Esperaria health HTTP de $name en $url"
        return 0
    fi

    while [ "$attempt" -le "$max_retries" ]; do
        local code
        code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
        if [ "$code" = "200" ] || [ "$code" = "301" ] || [ "$code" = "302" ]; then
            print_success "$name esta saludable (HTTP $code)"
            return 0
        fi
        print_info "Esperando $name ($attempt/$max_retries, codigo actual: $code)..."
        sleep "$wait_seconds"
        attempt=$((attempt + 1))
    done

    print_error "$name no respondio correctamente tras $max_retries intentos"
    return 1
}

show_help() {
    echo "Uso: $0 [OPCIONES]"
    echo ""
    echo "Opciones:"
    echo "  --no-build          No reconstruir las imagenes Docker"
    echo "  --skip-migrations   No ejecutar migraciones"
    echo "  --no-cache          Build sin cache (mas lento y consume mas recursos)"
    echo "  --background        Lanza el deploy en segundo plano y devuelve el control"
    echo "  --status            Estado del deploy en background + ultimas lineas del log"
    echo "  --dry-run           Muestra el plan sin ejecutar cambios"
    echo "  --bootstrap         Inicializacion explicita de infraestructura base"
    echo "  --help              Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0                           # Deploy selectivo recomendado"
    echo "  $0 --dry-run                 # Validar plan sin cambios"
    echo "  $0 --background              # Recomendado desde Cursor/SSH fragil"
    echo "  $0 --status                  # Ver progreso del deploy en background"
    echo "  $0 --no-build                # Sin reconstruccion de imagenes"
    echo "  $0 --bootstrap               # Bootstrap explicito, no para uso rutinario"
    echo "  $0 --no-cache                # Rebuild total, solo si es imprescindible"
}

show_deploy_status() {
    mkdir -p "$DEPLOY_LOG_DIR"
    if [ -f "$DEPLOY_PID_FILE" ]; then
        DEPLOY_PID="$(cat "$DEPLOY_PID_FILE" 2>/dev/null || true)"
        if [ -n "$DEPLOY_PID" ] && kill -0 "$DEPLOY_PID" 2>/dev/null; then
            echo "Deploy en curso (PID $DEPLOY_PID)"
        else
            echo "No hay deploy en curso (PID antiguo: ${DEPLOY_PID:-n/a})"
        fi
    else
        echo "No hay deploy en curso"
    fi
    echo ""
    if [ -f "$DEPLOY_LOG_FILE" ]; then
        echo "Log: $DEPLOY_LOG_FILE"
        echo "----------------------------------------"
        tail -n 40 "$DEPLOY_LOG_FILE"
    else
        echo "Sin log de deploy todavia."
    fi
}

start_background_deploy() {
    mkdir -p "$DEPLOY_LOG_DIR"
    if [ -f "$DEPLOY_PID_FILE" ]; then
        EXISTING_PID="$(cat "$DEPLOY_PID_FILE" 2>/dev/null || true)"
        if [ -n "$EXISTING_PID" ] && kill -0 "$EXISTING_PID" 2>/dev/null; then
            print_error "Ya hay un deploy en curso (PID $EXISTING_PID)"
            print_info "Consulta el progreso con: $0 --status"
            exit 1
        fi
    fi

    cd "$SCRIPT_DIR"

    print_info "Iniciando deploy en segundo plano..."
    print_info "Log en vivo: $DEPLOY_LOG_FILE"

    nohup "$SCRIPT_DIR/deploy.sh" "${BACKGROUND_FORWARD_ARGS[@]}" > "$DEPLOY_LOG_FILE" 2>&1 &
    DEPLOY_PID=$!
    echo "$DEPLOY_PID" > "$DEPLOY_PID_FILE"

    print_success "Deploy lanzado (PID $DEPLOY_PID)"
    print_info "Sigue el progreso con:"
    echo -e "${YELLOW}  tail -f $DEPLOY_LOG_FILE${NC}"
    echo -e "${YELLOW}  $0 --status${NC}"
}

BACKGROUND_MODE=false
SHOW_STATUS=false
BACKGROUND_FORWARD_ARGS=()
while [[ $# -gt 0 ]]; do
    case $1 in
        --background)
            BACKGROUND_MODE=true
            shift
            ;;
        --status)
            SHOW_STATUS=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            BACKGROUND_FORWARD_ARGS+=("$1")
            shift
            ;;
    esac
done

if [ "$SHOW_STATUS" = true ]; then
    show_deploy_status
    exit 0
fi

if [ "$BACKGROUND_MODE" = true ]; then
    start_background_deploy
    exit 0
fi

set -- "${BACKGROUND_FORWARD_ARGS[@]}"

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
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --bootstrap)
            BOOTSTRAP=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            print_error "Opcion desconocida: $1"
            show_help
            exit 1
            ;;
    esac
done

cleanup_deploy_pid() {
    if [ -f "$DEPLOY_PID_FILE" ]; then
        rm -f "$DEPLOY_PID_FILE"
    fi
    if [ -f "$DEPLOY_LOG_FILE" ]; then
        cp "$DEPLOY_LOG_FILE" "$DEPLOY_LOG_DIR/deploy-$(date +%Y%m%d-%H%M%S).log" 2>/dev/null || true
    fi
}

MAINTENANCE_SCRIPT="$SCRIPT_DIR/scripts/deployment/maintenance.sh"
MAINTENANCE_ENABLED_BY_DEPLOY=false

enable_maintenance_mode() {
    if [ "$DRY_RUN" = true ]; then
        print_info "[dry-run] Activaria modo mantenimiento"
        return 0
    fi
    if [ ! -f "$MAINTENANCE_SCRIPT" ]; then
        print_warning "Script de mantenimiento no encontrado: $MAINTENANCE_SCRIPT"
        return 0
    fi
    print_info "Activando modo mantenimiento..."
    if bash "$MAINTENANCE_SCRIPT" on; then
        MAINTENANCE_ENABLED_BY_DEPLOY=true
        print_success "Modo mantenimiento activado"
    else
        print_warning "No se pudo activar mantenimiento automaticamente (sudo nginx puede ser necesario)."
        print_info "Activalo manualmente: ./scripts/deployment/maintenance.sh on && sudo systemctl reload nginx"
    fi
}

disable_maintenance_mode() {
    if [ "$MAINTENANCE_ENABLED_BY_DEPLOY" != true ]; then
        return 0
    fi
    print_info "Desactivando modo mantenimiento..."
    if bash "$MAINTENANCE_SCRIPT" off; then
        print_success "Modo mantenimiento desactivado"
    else
        print_warning "No se pudo desactivar mantenimiento automaticamente."
        print_info "Desactivalo manualmente: ./scripts/deployment/maintenance.sh off && sudo systemctl reload nginx"
    fi
}

cleanup_on_exit() {
    disable_maintenance_mode
    cleanup_deploy_pid
}

trap cleanup_on_exit EXIT

load_postgres_env() {
    if [ -f "$SCRIPT_DIR/docker/postgres.env.production" ]; then
        set -a
        # shellcheck disable=SC1091
        . "$SCRIPT_DIR/docker/postgres.env.production"
        set +a
    fi
}

record_rollback_snapshot() {
    local git_sha
    git_sha="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

    print_info "Snapshot rollback previo"
    print_info "Git SHA actual: $git_sha"
    run_compose ps

    for service in backend frontend celery_worker; do
        if [ "$DRY_RUN" = true ]; then
            print_info "[dry-run] Registraria imagen actual de $service"
            continue
        fi
        local container_id image_id
        container_id="$(compose_cmd ps -q "$service" 2>/dev/null || true)"
        if [ -n "$container_id" ]; then
            image_id="$(docker inspect -f '{{.Image}}' "$container_id" 2>/dev/null || echo unavailable)"
            print_info "Imagen actual $service: $image_id"
        else
            print_warning "No hay contenedor actual para $service"
        fi
    done
}

create_predeploy_db_backup() {
    local timestamp dump_tmp dump_file sha_file meta_file db_container db_name db_user

    load_postgres_env
    timestamp="$(date '+%Y%m%d_%H%M%S')"
    db_container="${DB_CONTAINER:-nexfit-pro-db-1}"
    db_name="${POSTGRES_DB:-${DB_NAME:-mykaizenfit}}"
    db_user="${POSTGRES_USER:-postgres}"
    dump_tmp="$PREDEPLOY_BACKUP_DIR/predeploy_${timestamp}.dump.tmp"
    dump_file="$PREDEPLOY_BACKUP_DIR/predeploy_${timestamp}.dump"
    sha_file="$dump_file.sha256"
    meta_file="$dump_file.meta"

    print_info "Creando backup predeploy verificable de PostgreSQL..."

    if [ "$DRY_RUN" = true ]; then
        dry_run_cmd mkdir -p "$PREDEPLOY_BACKUP_DIR"
        dry_run_cmd docker exec "$db_container" pg_dump -U "$db_user" -d "$db_name" --format=custom --compress=9 --no-owner --no-privileges
        dry_run_cmd docker exec -i "$db_container" pg_restore --list
        return 0
    fi

    mkdir -p "$PREDEPLOY_BACKUP_DIR"
    docker exec "$db_container" pg_dump \
        -U "$db_user" \
        -d "$db_name" \
        --format=custom \
        --compress=9 \
        --no-owner \
        --no-privileges > "$dump_tmp"

    mv "$dump_tmp" "$dump_file"
    sha256sum "$dump_file" > "$sha_file"
    docker exec -i "$db_container" pg_restore --list < "$dump_file" > /dev/null

    {
        echo "timestamp=$timestamp"
        echo "database=$db_name"
        echo "container=$db_container"
        echo "dump_file=$(basename "$dump_file")"
        echo "size_bytes=$(stat -c%s "$dump_file")"
        echo "sha256=$(cut -d' ' -f1 "$sha_file")"
        echo "git_sha=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
    } > "$meta_file"

    print_success "Backup predeploy verificado: $dump_file"
}

tag_built_images() {
    local git_sha
    git_sha="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

    print_info "Etiquetando imagenes build con SHA $git_sha para rollback operativo..."
    run_cmd docker tag nexfit-pro-backend:latest "nexfit-pro-backend:$git_sha"
    run_cmd docker tag nexfit-pro-celery_worker:latest "nexfit-pro-celery_worker:$git_sha"
    run_cmd docker tag nexfit-pro-frontend:latest "nexfit-pro-frontend:$git_sha"
}

validate_service_state() {
    local service="$1"
    local require_healthy="$2"
    local container_id state health

    if [ "$DRY_RUN" = true ]; then
        print_info "[dry-run] Validaria servicio $service (health requerido: $require_healthy)"
        return 0
    fi

    container_id="$(compose_cmd ps -q "$service" 2>/dev/null || true)"
    if [ -z "$container_id" ]; then
        print_error "Servicio $service sin contenedor"
        return 1
    fi

    state="$(docker inspect -f '{{.State.Status}}' "$container_id")"
    if [ "$state" != "running" ]; then
        print_error "Servicio $service no esta running (estado: $state)"
        return 1
    fi

    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container_id")"
    if [ "$require_healthy" = true ] && [ "$health" != "healthy" ]; then
        print_error "Servicio $service no esta healthy (health: $health)"
        return 1
    fi

    print_success "$service running, health=$health"
}

run_full_healthchecks() {
    print_info "Verificando estado Docker Compose..."
    run_compose ps

    frontend_health_url="$(frontend_local_health_url "$(read_named_env_value "$SCRIPT_DIR/frontend/docker.env.production" "NEXT_PUBLIC_BASE_PATH")")"
    wait_http_ok "Backend" "http://localhost:8000/api/health/" 20 5
    wait_http_ok "Frontend" "$frontend_health_url" 12 5

    validate_service_state backend true
    validate_service_state frontend true
    validate_service_state redis true
    validate_service_state db true
    validate_service_state db-backup true
    validate_service_state celery_worker false
}

echo ""
echo "========================================="
echo -e "${CYAN}DEPLOYMENT SELECTIVO A PRODUCCION${NC}"
echo "========================================="
echo ""

cd "$SCRIPT_DIR"

# 1. Validacion
print_info "Verificando dependencias..."
if ! command -v docker >/dev/null 2>&1; then
    print_error "Docker no esta instalado"
    exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
    print_error "Docker Compose no esta disponible"
    exit 1
fi
print_success "Dependencias verificadas"

print_info "Verificando archivos de configuracion..."
if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "Archivo $COMPOSE_FILE no encontrado"
    exit 1
fi
if [ ! -f "docker/backend.env.production" ]; then
    print_warning "Archivo docker/backend.env.production no encontrado"
fi
if [ ! -f "frontend/docker.env.production" ]; then
    print_warning "Archivo frontend/docker.env.production no encontrado"
fi
print_success "Archivos de configuracion verificados"

if command -v free >/dev/null 2>&1; then
    FREE_MEM_MB=$(free -m | awk '/^Mem:/ {print $7}')
    print_info "Memoria disponible aproximada: ${FREE_MEM_MB:-n/a}MB"
fi
LOAD_1M=$(cut -d' ' -f1 /proc/loadavg 2>/dev/null || echo "n/a")
print_info "Carga del sistema (1m): $LOAD_1M"

record_rollback_snapshot

# 2. Maintenance
enable_maintenance_mode

# Bootstrap explicito: permitido solo bajo flag y nunca usado por deploy rutinario.
if [ "$BOOTSTRAP" = true ]; then
    print_warning "Bootstrap explicito: levantando infraestructura base sin recreacion global"
    run_compose up -d db redis db-backup
fi

# 3. Backup DB antes de cualquier migracion
create_predeploy_db_backup

BUILD_FLAGS=()
if [ "$NO_CACHE" = true ]; then
    BUILD_FLAGS+=(--no-cache)
    print_warning "Build sin cache activado: mayor consumo de CPU/RAM/IO"
fi

# 4. Build backend
if [ "$NO_BUILD" = false ]; then
    print_info "Build backend y Celery (secuencial, bajo impacto)..."
    run_low_priority env COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f "$COMPOSE_FILE" build "${BUILD_FLAGS[@]}" backend
    print_success "Imagen backend construida"
    run_low_priority env COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f "$COMPOSE_FILE" build "${BUILD_FLAGS[@]}" celery_worker
    print_success "Imagen Celery construida"
else
    print_info "Omitiendo build backend/Celery/frontend (--no-build)"
fi

# 5. Actualizar backend
print_info "Actualizando backend sin tocar PostgreSQL, Redis ni db-backup..."
run_compose up -d --no-deps backend
print_success "Backend actualizado"

# 6. Esperar backend
wait_http_ok "Backend" "http://localhost:8000/api/health/" 20 5

# 7. Migraciones
if [ "$SKIP_MIGRATIONS" = false ]; then
    print_info "Ejecutando migraciones desde deploy.sh..."
    run_compose exec -T backend python manage.py migrate --noinput
    print_success "Migraciones aplicadas"
else
    print_warning "Migraciones omitidas por --skip-migrations"
fi

# 8. Collectstatic
print_info "Recolectando archivos estaticos desde deploy.sh..."
run_compose exec -T backend python manage.py collectstatic --noinput
print_success "Archivos estaticos recolectados"

# 9. Actualizar Celery tras backend/migraciones
print_info "Actualizando Celery worker con la imagen/backend vigente..."
run_compose up -d --no-deps celery_worker
print_success "Celery worker actualizado"

# 10. Build frontend
if [ "$NO_BUILD" = false ]; then
    print_info "Build frontend (secuencial, bajo impacto)..."
    run_low_priority env COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f "$COMPOSE_FILE" build "${BUILD_FLAGS[@]}" frontend
    print_success "Imagen frontend construida"
    tag_built_images
fi

# 11. Actualizar frontend
print_info "Actualizando frontend sin recreacion global..."
run_compose up -d --no-deps frontend
print_success "Frontend actualizado"

# 12. Healthchecks completos
run_full_healthchecks

echo ""
echo "========================================="
if [ "$DRY_RUN" = true ]; then
    echo -e "${GREEN}DRY RUN COMPLETADO${NC}"
else
    echo -e "${GREEN}DEPLOYMENT COMPLETADO${NC}"
fi
echo "========================================="
echo ""
if [ "$DRY_RUN" = true ]; then
    print_success "Plan de deploy validado sin aplicar cambios"
else
    print_success "La aplicacion ha sido desplegada en produccion"
fi
print_info "Comandos utiles:"
echo -e "${YELLOW}  - Ver logs:   COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE logs -f${NC}"
echo -e "${YELLOW}  - Ver estado: COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE ps${NC}"
echo -e "${YELLOW}  - Dry-run:    ./deploy.sh --dry-run${NC}"
echo -e "${YELLOW}  - Bootstrap:  ./deploy.sh --bootstrap${NC}"
echo ""
