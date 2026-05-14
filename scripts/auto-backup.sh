#!/bin/bash
# auto-backup.sh — Backup diario con retención inteligente:
#   · Últimos 7 días       → siempre conservar
#   · Domingos 4 semanas   → backup semanal
#   · Día 1 de cada mes    → backup mensual (indefinido)

set -Eeuo pipefail

BACKUP_DIR="/srv/mykaizenfit/pro/backups"
LOG_FILE="$BACKUP_DIR/backup.log"
LOCK_FILE="$BACKUP_DIR/.auto-backup.lock"
DB_CONTAINER="${DB_CONTAINER:-nexfit-pro-db-1}"
DB_NAME="${DB_NAME:-mykaizenfit}"
DB_USER="${DB_USER:-postgres}"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BASE_NAME="mykaizenfit_${TIMESTAMP}"
DUMP_TMP="$BACKUP_DIR/${BASE_NAME}.dump.tmp"
DUMP_FILE="$BACKUP_DIR/${BASE_NAME}.dump"
SHA_FILE="$DUMP_FILE.sha256"
META_FILE="$DUMP_FILE.meta"
GLOBALS_FILE="$BACKUP_DIR/${BASE_NAME}_globals.sql"

mkdir -p "$BACKUP_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*" >> "$LOG_FILE"
}

cleanup_tmp() {
    rm -f "$DUMP_TMP"
}

trap cleanup_tmp EXIT

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    log "ERROR: Ya hay una ejecucion de backup en curso"
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    log "ERROR: El contenedor $DB_CONTAINER no esta en ejecucion"
    exit 1
fi

log "====== INICIANDO BACKUP DE BASE DE DATOS ======"

docker exec "$DB_CONTAINER" pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges > "$DUMP_TMP"

mv "$DUMP_TMP" "$DUMP_FILE"

docker exec "$DB_CONTAINER" pg_dumpall -U "$DB_USER" --globals-only > "$GLOBALS_FILE"

sha256sum "$DUMP_FILE" > "$SHA_FILE"

docker exec -i "$DB_CONTAINER" pg_restore --list < "$DUMP_FILE" > /dev/null

{
    echo "timestamp=$TIMESTAMP"
    echo "database=$DB_NAME"
    echo "container=$DB_CONTAINER"
    echo "dump_file=$(basename "$DUMP_FILE")"
    echo "globals_file=$(basename "$GLOBALS_FILE")"
    echo "size_bytes=$(stat -c%s "$DUMP_FILE")"
    echo "sha256=$(cut -d' ' -f1 "$SHA_FILE")"
} > "$META_FILE"

ln -sfn "$(basename "$DUMP_FILE")" "$BACKUP_DIR/latest.dump"
ln -sfn "$(basename "$SHA_FILE")" "$BACKUP_DIR/latest.dump.sha256"
ln -sfn "$(basename "$META_FILE")" "$BACKUP_DIR/latest.dump.meta"
ln -sfn "$(basename "$GLOBALS_FILE")" "$BACKUP_DIR/latest_globals.sql"

# ──────────────────────────────────────────────────────────────
# RETENCIÓN INTELIGENTE
# Reglas (se aplican en orden, la primera que coincide → KEEP):
#   1. Archivo de hoy o últimos 7 días → KEEP (diario)
#   2. Fue creado en domingo y tiene ≤28 días → KEEP (semanal)
#   3. Fue creado el día 1 del mes → KEEP (mensual)
#   4. En cualquier otro caso → DELETE
# ──────────────────────────────────────────────────────────────
apply_retention() {
    local now_epoch
    now_epoch=$(date '+%s')
    local kept=0 deleted=0

    while IFS= read -r -d '' dumpfile; do
        # Extraer fecha del nombre: mykaizenfit_YYYYMMDD_HHMMSS.dump
        local bname
        bname=$(basename "$dumpfile")
        local filedate
        filedate=$(echo "$bname" | grep -oP '(?<=mykaizenfit_)\d{8}' || true)
        [[ -z "$filedate" ]] && continue

        local year="${filedate:0:4}"
        local month="${filedate:4:2}"
        local day="${filedate:6:2}"
        local file_epoch
        file_epoch=$(date -d "${year}-${month}-${day}" '+%s' 2>/dev/null || date -j -f '%Y%m%d' "$filedate" '+%s' 2>/dev/null || echo 0)
        [[ "$file_epoch" -eq 0 ]] && { kept=$((kept+1)); continue; }

        local age_days=$(( (now_epoch - file_epoch) / 86400 ))

        # Regla 1: últimos 7 días → KEEP
        if [[ $age_days -le 7 ]]; then
            kept=$((kept+1))
            continue
        fi

        # Regla 2: domingo + ≤28 días → KEEP
        local dow
        dow=$(date -d "${year}-${month}-${day}" '+%u' 2>/dev/null || date -j -f '%Y-%m-%d' "${year}-${month}-${day}" '+%u' 2>/dev/null || echo 0)
        if [[ "$dow" -eq 7 && $age_days -le 28 ]]; then
            kept=$((kept+1))
            continue
        fi

        # Regla 3: día 1 del mes → KEEP mensual
        if [[ "$day" -eq 1 ]]; then
            kept=$((kept+1))
            continue
        fi

        # Eliminar dump + archivos asociados (.sha256 .meta _globals.sql)
        local stem="${bname%.dump}"
        rm -f "$dumpfile" \
              "$BACKUP_DIR/${stem}.dump.sha256" \
              "$BACKUP_DIR/${stem}.dump.meta" \
              "$BACKUP_DIR/${stem}_globals.sql"
        deleted=$((deleted+1))
    done < <(find "$BACKUP_DIR" -maxdepth 1 -name 'mykaizenfit_*.dump' -not -type l -print0 | sort -z)

    log "INFO: Retencion inteligente — conservados=$kept eliminados=$deleted"
}

apply_retention

log "OK: Backup creado $(basename "$DUMP_FILE") size=$(du -h "$DUMP_FILE" | cut -f1)"
log "====== BACKUP FINALIZADO EXITOSAMENTE ======"
log ""
