#!/bin/bash
#
# Script de Monitoreo Automático - Nex-Fit PRO
# =============================================
# Verifica servicios críticos en modo read-only.
# No reinicia, recrea, construye, detiene ni levanta contenedores.
#
# Uso: ./check-services.sh
# Crontab: */5 * * * * /srv/mykaizenfit/pro/scripts/check-services.sh

set -u

PROJECT_DIR="/srv/mykaizenfit/pro"
COMPOSE_PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.prod.yml"
LOCK_FILE="/tmp/nexfit-check.lock"
BACKEND_HEALTH_URL="http://localhost:8000/api/health/"
FRONTEND_URL="http://localhost:3000"
ALERT_LOG="/srv/mykaizenfit/pro/backups/alerts.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

alert() {
    local message=$1
    mkdir -p "$(dirname "$ALERT_LOG")"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRITICAL] $message" >> "$ALERT_LOG"
}

compose() {
    cd "$PROJECT_DIR" || exit 1
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f "$COMPOSE_FILE" "$@"
}

get_container_id() {
    local service_name=$1
    compose ps -q "$service_name" 2>/dev/null
}

container_running() {
    local container_id=$1
    [ -n "$container_id" ] && [ "$(docker inspect -f '{{.State.Running}}' "$container_id" 2>/dev/null)" = "true" ]
}

container_health() {
    local container_id=$1
    docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$container_id" 2>/dev/null || echo "missing"
}

check_service() {
    local service=$1
    local container_id
    local health_status

    container_id=$(get_container_id "$service")
    if [ -z "$container_id" ]; then
        log "🔴 CRITICAL: servicio $service no tiene contenedor asociado"
        alert "Servicio $service sin contenedor asociado"
        return 1
    fi

    if ! container_running "$container_id"; then
        log "🔴 CRITICAL: servicio $service no está corriendo"
        alert "Servicio $service no esta corriendo"
        return 1
    fi

    health_status=$(container_health "$container_id")
    if [ "$health_status" != "healthy" ] && [ "$health_status" != "no-healthcheck" ]; then
        log "🔴 CRITICAL: servicio $service health=$health_status"
        alert "Servicio $service health=$health_status"
        return 1
    fi

    if [ "$health_status" = "no-healthcheck" ]; then
        log "✅ $service está corriendo (sin healthcheck)"
    else
        log "✅ $service está corriendo y saludable"
    fi
    return 0
}

backend_http_ok() {
    curl -fsS --max-time 8 "$BACKEND_HEALTH_URL" > /dev/null 2>&1
}

frontend_http_ok() {
    curl -fsS --max-time 8 "$FRONTEND_URL" > /dev/null 2>&1
}

mkdir -p "$(dirname "$ALERT_LOG")"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    log "ℹ️  Verificación ya en ejecución, omitiendo esta corrida"
    exit 0
fi

log "🔍 Iniciando verificación read-only de servicios..."

if check_service "backend" && backend_http_ok; then
    log "✅ backend HTTP responde correctamente"
else
    log "🔴 CRITICAL: backend con fallo detectado (estado/health/http). No se ejecuta autorecovery."
    alert "Backend con fallo detectado; autorecovery deshabilitado"
fi

if check_service "frontend" && frontend_http_ok; then
    log "✅ frontend HTTP responde correctamente"
else
    log "🔴 CRITICAL: frontend con fallo detectado (estado/health/http). No se ejecuta autorecovery."
    alert "Frontend con fallo detectado; autorecovery deshabilitado"
fi

for service in db redis celery_worker; do
    check_service "$service" || log "ℹ️  Acción recomendada: revisar manualmente $service"
done

if docker ps --format '{{.Names}}' | grep -Eq '^pro-(db|db-backup|celery_worker)-1$'; then
    log "⚠️  Stack Docker legacy 'pro' activo — riesgo split-brain en PostgreSQL"
    log "   Acción recomendada: revisar scripts/deployment/disable-legacy-pro-stack.sh"
fi

log "📊 Uso de recursos:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep nexfit-pro || true

log "✅ Verificación read-only completada"

exit 0
