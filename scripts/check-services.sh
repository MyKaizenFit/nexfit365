#!/bin/bash
#
# Script de Monitoreo Automático - Nex-Fit PRO
# =============================================
# Este script verifica que todos los servicios críticos estén corriendo
# y los reinicia automáticamente si se detecta algún problema.
#
# Uso: ./check-services.sh
# Crontab: */5 * * * * /srv/mykaizenfit/pro/scripts/check-services.sh

set -u

# Configuración
PROJECT_DIR="/srv/mykaizenfit/pro"
LOG_FILE="/var/log/nexfit-check.log"
COMPOSE_PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.prod.yml"
LOCK_FILE="/tmp/nexfit-check.lock"
BACKEND_HEALTH_URL="http://localhost:8000/api/health/"

# Función para logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

compose() {
    cd "$PROJECT_DIR" || exit 1
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f "$COMPOSE_FILE" "$@"
}

get_container_id() {
    local service_name=$1
    compose ps -q "$service_name" 2>/dev/null
}

is_container_running() {
    local container_id=$1
    [ -n "$container_id" ] && [ "$(docker inspect -f '{{.State.Running}}' "$container_id" 2>/dev/null)" = "true" ]
}

is_container_healthy_or_nohc() {
    local container_id=$1
    local has_health
    local health_status

    has_health=$(docker inspect -f '{{if .State.Health}}yes{{else}}no{{end}}' "$container_id" 2>/dev/null)
    if [ "$has_health" = "no" ]; then
        return 0
    fi

    health_status=$(docker inspect -f '{{.State.Health.Status}}' "$container_id" 2>/dev/null)
    [ "$health_status" = "healthy" ]
}

backend_http_ok() {
    curl -fsS --max-time 8 "$BACKEND_HEALTH_URL" > /dev/null 2>&1
}

# Función para verificar si un servicio está corriendo
# Función para reiniciar un servicio
restart_service() {
    local service_name=$1
    log "⚠️  Reiniciando servicio: $service_name"
    compose up -d "$service_name" 2>&1 | tee -a "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        log "✅ Servicio $service_name reiniciado correctamente"
        return 0
    else
        log "❌ ERROR: No se pudo reiniciar $service_name"
        return 1
    fi
}

rebuild_backend() {
    log "🛠️  Backend sigue inestable, iniciando rebuild + recreate automático"
    if compose build backend 2>&1 | tee -a "$LOG_FILE"; then
        if compose up -d --force-recreate backend 2>&1 | tee -a "$LOG_FILE"; then
            log "✅ Backend reconstruido y recreado"
            return 0
        fi
    fi

    log "❌ ERROR: Falló rebuild/recreate del backend"
    return 1
}

check_backend_and_heal() {
    local container_id
    container_id=$(get_container_id "backend")

    if [ -n "$container_id" ] && is_container_running "$container_id" && is_container_healthy_or_nohc "$container_id" && backend_http_ok; then
        log "✅ backend está corriendo y saludable"
        return 0
    fi

    log "⚠️  backend con fallo detectado (estado/health/http), intentando restart"
    restart_service "backend"
    sleep 12

    container_id=$(get_container_id "backend")
    if [ -n "$container_id" ] && is_container_running "$container_id" && is_container_healthy_or_nohc "$container_id" && backend_http_ok; then
        log "✅ backend recuperado tras restart"
        return 0
    fi

    if rebuild_backend; then
        sleep 18
        container_id=$(get_container_id "backend")
        if [ -n "$container_id" ] && is_container_running "$container_id" && is_container_healthy_or_nohc "$container_id" && backend_http_ok; then
            log "✅ backend recuperado tras rebuild+recreate"
            return 0
        fi
    fi

    log "❌ CRÍTICO: backend no se recuperó automáticamente"
    return 1
}

# =============================================
# INICIO DEL MONITOREO
# =============================================

mkdir -p "$(dirname "$LOG_FILE")"
if ! touch "$LOG_FILE" 2>/dev/null; then
    LOG_FILE="/srv/mykaizenfit/pro/backups/nexfit-check.log"
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    log "ℹ️  Verificación ya en ejecución, omitiendo esta corrida"
    exit 0
fi

log "🔍 Iniciando verificación de servicios..."

# Backend con auto-heal avanzado
check_backend_and_heal || true

# Lista de servicios restantes
SERVICES=("frontend" "db" "redis")

for service in "${SERVICES[@]}"; do
    container_id=$(get_container_id "$service")
    if [ -z "$container_id" ] || ! is_container_running "$container_id"; then
        log "❌ $service no está corriendo, intentando restart"
        restart_service "$service" || true
        continue
    fi

    if ! is_container_healthy_or_nohc "$container_id"; then
        log "⚠️  $service está running pero unhealthy, intentando restart"
        restart_service "$service" || true
        continue
    fi

    log "✅ $service está corriendo y saludable"
done

# Verificar uso de recursos
log "📊 Uso de recursos:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep nexfit-pro | tee -a "$LOG_FILE"

log "✅ Verificación completada\n"

exit 0
