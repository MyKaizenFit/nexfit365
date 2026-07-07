#!/bin/bash
#
# Asegura que el celery worker de producción esté en ejecución.
#
# Uso: ./scripts/ensure-celery-worker.sh
# Cron: 30 6 * * * iago /srv/mykaizenfit/pro/scripts/ensure-celery-worker.sh ...

set -Eeuo pipefail

PROJECT_DIR="/srv/mykaizenfit/pro"
COMPOSE_PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.prod.yml"
SERVICE_NAME="celery_worker"
LOG_FILE="/srv/mykaizenfit/pro/backups/cron_celery.log"
LOCK_FILE="/tmp/nexfit-celery-check.lock"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

compose() {
  cd "$PROJECT_DIR" || exit 1
  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f "$COMPOSE_FILE" "$@"
}

get_container_id() {
  compose ps -q "$SERVICE_NAME" 2>/dev/null
}

is_worker_running() {
  local container_id
  container_id=$(get_container_id)
  [ -n "$container_id" ] && [ "$(docker inspect -f '{{.State.Running}}' "$container_id" 2>/dev/null)" = "true" ]
}

start_worker() {
  log "Levantando $SERVICE_NAME..."
  if compose up -d --no-deps "$SERVICE_NAME" 2>&1 | tee -a "$LOG_FILE"; then
    sleep 5
    if is_worker_running; then
      log "OK: $SERVICE_NAME en ejecución"
      return 0
    fi
  fi

  log "ERROR: no se pudo levantar $SERVICE_NAME"
  return 1
}

mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Verificación celery ya en curso, omitiendo"
  exit 0
fi

if is_worker_running; then
  log "OK: $SERVICE_NAME ya está corriendo"
  exit 0
fi

log "AVISO: $SERVICE_NAME caído o ausente"
start_worker
