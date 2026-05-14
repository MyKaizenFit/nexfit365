#!/bin/bash

set -Eeuo pipefail

BACKUP_DIR="/srv/mykaizenfit/pro/backups"
LOG_FILE="$BACKUP_DIR/backup-verify.log"
DB_CONTAINER="${DB_CONTAINER:-nexfit-pro-db-1}"
DB_USER="${DB_USER:-postgres}"
DUMP_FILE="${1:-$BACKUP_DIR/latest.dump}"
TMP_DB="backup_verify_$(date '+%Y%m%d_%H%M%S')"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*" >> "$LOG_FILE"
}

cleanup() {
    docker exec "$DB_CONTAINER" dropdb -U "$DB_USER" --if-exists "$TMP_DB" > /dev/null 2>&1 || true
}

trap cleanup EXIT

if [[ ! -f "$DUMP_FILE" ]]; then
    log "ERROR: No existe el backup $DUMP_FILE"
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    log "ERROR: El contenedor $DB_CONTAINER no esta en ejecucion"
    exit 1
fi

log "====== INICIANDO VERIFICACION DE BACKUP ======"
log "Archivo: $DUMP_FILE"

docker exec "$DB_CONTAINER" createdb -U "$DB_USER" "$TMP_DB"
docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$TMP_DB" --no-owner --no-privileges < "$DUMP_FILE"

SUMMARY=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$TMP_DB" -At -F '|' -c "
SELECT 'workouts_exercise',           COUNT(*) FROM workouts_exercise
UNION ALL
SELECT 'workouts_workoutprogram',     COUNT(*) FROM workouts_workoutprogram
UNION ALL
SELECT 'nutrition_food',              COUNT(*) FROM nutrition_food
UNION ALL
SELECT 'nutrition_recipe',            COUNT(*) FROM nutrition_recipe
UNION ALL
SELECT 'nutrition_nutritionplan',     COUNT(*) FROM nutrition_nutritionplan
UNION ALL
SELECT 'users_customuser',            COUNT(*) FROM users_customuser
UNION ALL
SELECT 'nutrition_planmeal',          COUNT(*) FROM nutrition_planmeal
UNION ALL
SELECT 'nutrition_weeklymealselection', COUNT(*) FROM nutrition_weeklymealselection;
" 2>/dev/null || echo "")

while IFS='|' read -r table_name table_count; do
    [[ -z "$table_name" ]] && continue
    log "OK: $table_name=$table_count"
done <<< "$SUMMARY"

log "====== VERIFICACION FINALIZADA EXITOSAMENTE ======"
log ""