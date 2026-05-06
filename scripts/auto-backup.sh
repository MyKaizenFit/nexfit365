#!/bin/bash

set -Eeuo pipefail

BACKUP_DIR="/srv/mykaizenfit/pro/backups"
LOG_FILE="$BACKUP_DIR/backup.log"
LOCK_FILE="$BACKUP_DIR/.auto-backup.lock"
DB_CONTAINER="${DB_CONTAINER:-nexfit-pro-db-1}"
DB_NAME="${DB_NAME:-mykaizenfit}"
DB_USER="${DB_USER:-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
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

find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'mykaizenfit_*.dump' -o -name 'mykaizenfit_*.dump.sha256' -o -name 'mykaizenfit_*.dump.meta' -o -name 'mykaizenfit_*_globals.sql' \) -mtime +"$RETENTION_DAYS" -delete

log "OK: Backup creado $(basename "$DUMP_FILE") size=$(du -h "$DUMP_FILE" | cut -f1)"
log "====== BACKUP FINALIZADO EXITOSAMENTE ======"
log ""
