#!/bin/bash
# Mantenimiento diario de tablas JWT (refresh / blacklist).
# Evita errores "unexpected data beyond EOF" en token_blacklist_outstandingtoken.
#
# Uso: ./scripts/reindex-jwt-blacklist.sh

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-integrity-check.sh
source "$SCRIPT_DIR/db-integrity-check.sh"

COMPOSE_FILE="/srv/mykaizenfit/pro/docker-compose.prod.yml"
PROJECT="nexfit-pro"
LOG_FILE="/srv/mykaizenfit/pro/backups/jwt-maintenance.log"
ALERT_LOG="/srv/mykaizenfit/pro/backups/alerts.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

fail() {
  log "ERROR: $*"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRITICAL] reindex-jwt-blacklist: $*" >> "$ALERT_LOG"
  exit 1
}

run_psql() {
  local label=$1
  shift
  local tmp
  tmp=$(mktemp)
  if ! COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" exec -T db \
    psql -U postgres -d mykaizenfit -v ON_ERROR_STOP=1 "$@" >"$tmp" 2>&1; then
    cat "$tmp" >> "$LOG_FILE"
    if grep -qiE "$CORRUPTION_PATTERN" "$tmp"; then
      rm -f "$tmp"
      fail "Corrupción detectada durante: $label"
    fi
    rm -f "$tmp"
    fail "Falló: $label"
  fi
  cat "$tmp" >> "$LOG_FILE"
  rm -f "$tmp"
}

mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE" "$ALERT_LOG"

log "========== INICIANDO MANTENIMIENTO JWT =========="

integrity_msg=""
integrity_rc=0
integrity_msg=$(check_db_integrity) || integrity_rc=$?
log "Precheck integridad: $integrity_msg"
if [ "$integrity_rc" -eq 1 ]; then
  fail "Abortado — corrupción detectada: $integrity_msg"
elif [ "$integrity_rc" -eq 2 ]; then
  fail "Abortado — BD no accesible: $integrity_msg"
fi

log "REINDEX TABLE token_blacklist_outstandingtoken..."
run_psql "REINDEX outstandingtoken" -c "REINDEX TABLE token_blacklist_outstandingtoken;"

log "VACUUM ANALYZE tablas JWT..."
run_psql "VACUUM outstandingtoken" -c "VACUUM ANALYZE token_blacklist_outstandingtoken;"
run_psql "VACUUM blacklistedtoken" -c "VACUUM ANALYZE token_blacklist_blacklistedtoken;"

probe_msg=""
probe_rc=0
probe_msg=$(probe_jwt_blacklist_writable) || probe_rc=$?
log "Probe escritura JWT: $probe_msg"
if [ "$probe_rc" -ne 0 ]; then
  fail "Probe JWT falló: $probe_msg"
fi

log "========== MANTENIMIENTO JWT COMPLETADO =========="
