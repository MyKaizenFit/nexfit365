#!/bin/bash
# Optimización semanal de PostgreSQL — sin REINDEX DATABASE completo.
# Ejecutar domingo 04:30 (después del backup del contenedor db-backup a las 03:00).

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-integrity-check.sh
source "$SCRIPT_DIR/db-integrity-check.sh"

COMPOSE_FILE="/srv/mykaizenfit/pro/docker-compose.prod.yml"
PROJECT="nexfit-pro"
LOG_FILE="/srv/mykaizenfit/pro/backups/optimization.log"
ALERT_LOG="/srv/mykaizenfit/pro/backups/alerts.log"

log() {
  echo "[$(date)] $*" >> "$LOG_FILE"
}

fail() {
  log "ERROR: $*"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [CRITICAL] optimize-database: $*" >> "$ALERT_LOG"
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

log "========== INICIANDO OPTIMIZACIÓN DE BD =========="

integrity_msg=""
integrity_rc=0
integrity_msg=$(check_db_integrity) || integrity_rc=$?
log "Precheck integridad: $integrity_msg"
if [ "$integrity_rc" -eq 1 ]; then
  fail "Abortado — corrupción detectada: $integrity_msg"
elif [ "$integrity_rc" -eq 2 ]; then
  fail "Abortado — BD no accesible: $integrity_msg"
fi

log "VACUUM ANALYZE..."
run_psql "VACUUM ANALYZE" -c "VACUUM ANALYZE;"
log "VACUUM ANALYZE completado"

log "Creando índices (solo tablas existentes)..."
run_psql "CREATE INDEX" <<'SQL'
CREATE INDEX IF NOT EXISTS idx_customuser_email ON accounts_customuser(email);
CREATE INDEX IF NOT EXISTS idx_customuser_is_active ON accounts_customuser(is_active);
CREATE INDEX IF NOT EXISTS idx_recipe_name ON nutrition_recipe(name);
CREATE INDEX IF NOT EXISTS idx_recipe_created ON nutrition_recipe(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workoutprogram_user ON workouts_workoutprogram(user_id);
CREATE INDEX IF NOT EXISTS idx_workoutprogram_active ON workouts_workoutprogram(is_active);
SQL
log "Índices verificados"

log "REINDEX TABLE (tablas críticas, sin REINDEX DATABASE)..."
for table in token_blacklist_outstandingtoken workouts_workoutdayexercise workouts_workoutprogram; do
  log "REINDEX TABLE ${table}..."
  run_psql "REINDEX TABLE ${table}" -c "REINDEX TABLE ${table};"
done
log "REINDEX TABLE completado"

log "Estadísticas de BD:"
run_psql "Estadísticas" <<'SQL'
SELECT pg_size_pretty(pg_database_size('mykaizenfit')) AS db_size;

SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 10;

SELECT schemaname, relname AS tablename, indexrelname AS indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC
LIMIT 10;
SQL

log "========== OPTIMIZACIÓN COMPLETADA =========="
echo "" >> "$LOG_FILE"
