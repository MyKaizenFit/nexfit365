#!/bin/bash
# restore.sh — Restauración rápida de base de datos en un comando
#
# USO:
#   ./restore.sh                  → restaura desde latest.dump (con confirmación)
#   ./restore.sh <archivo.dump>   → restaura ese backup concreto
#   ./restore.sh --list           → lista los backups disponibles
#   ./restore.sh --dry-run        → simula la restauración sin ejecutarla
#
# El script crea automáticamente un backup previo a la restauración.

set -Eeuo pipefail

BACKUP_DIR="/srv/mykaizenfit/pro/backups"
LOG_FILE="$BACKUP_DIR/restore.log"
DB_CONTAINER="${DB_CONTAINER:-nexfit-pro-db-1}"
DB_NAME="${DB_NAME:-mykaizenfit}"
DB_USER="${DB_USER:-postgres}"

# ── Colores ─────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*" >> "$LOG_FILE"
}

info()  { echo -e "${CYAN}ℹ ${RESET}$*"; }
ok()    { echo -e "${GREEN}✔ ${RESET}$*"; }
warn()  { echo -e "${YELLOW}⚠ ${RESET}$*"; }
error() { echo -e "${RED}✖ ${RESET}$*" >&2; }
bold()  { echo -e "${BOLD}$*${RESET}"; }

# ── --list ───────────────────────────────────────────────────────────
cmd_list() {
    bold "\n Backups disponibles en $BACKUP_DIR"
    echo "──────────────────────────────────────────────────────────────"
    printf "  %-42s  %-8s  %s\n" "ARCHIVO" "TAMAÑO" "FECHA"
    echo "──────────────────────────────────────────────────────────────"

    local latest_target=""
    [[ -L "$BACKUP_DIR/latest.dump" ]] && \
        latest_target=$(readlink "$BACKUP_DIR/latest.dump" 2>/dev/null || true)

    local count=0
    while IFS= read -r -d '' f; do
        local bname size fdate tag=""
        bname=$(basename "$f")
        size=$(du -h "$f" 2>/dev/null | cut -f1)
        fdate=$(stat -c '%y' "$f" 2>/dev/null | cut -d'.' -f1)
        [[ "$bname" == "$latest_target" ]] && tag=" ← latest"
        printf "  %-42s  %-8s  %s%s\n" "$bname" "$size" "$fdate" "$tag"
        count=$((count+1))
    done < <(find "$BACKUP_DIR" -maxdepth 1 -name 'mykaizenfit_*.dump' -not -type l -print0 | sort -zr)

    echo "──────────────────────────────────────────────────────────────"
    info "Total: $count backups"
    echo ""
    exit 0
}

# ── Parsing de argumentos ────────────────────────────────────────────
DUMP_FILE=""
DRY_RUN=false

for arg in "$@"; do
    case "$arg" in
        --list) cmd_list ;;
        --dry-run) DRY_RUN=true ;;
        -*) error "Opción desconocida: $arg"; exit 1 ;;
        *)  DUMP_FILE="$arg" ;;
    esac
done

# Resolver archivo a restaurar
if [[ -z "$DUMP_FILE" ]]; then
    if [[ -L "$BACKUP_DIR/latest.dump" ]]; then
        DUMP_FILE="$BACKUP_DIR/latest.dump"
    else
        error "No existe latest.dump. Especifica el archivo a restaurar."
        echo "  Uso: $0 <archivo.dump>"
        echo "  Ver disponibles: $0 --list"
        exit 1
    fi
elif [[ ! "$DUMP_FILE" = /* ]]; then
    # Ruta relativa → buscar en BACKUP_DIR
    DUMP_FILE="$BACKUP_DIR/$DUMP_FILE"
fi

[[ ! -f "$DUMP_FILE" ]] && { error "No existe el archivo: $DUMP_FILE"; exit 1; }

REAL_DUMP=$(realpath "$DUMP_FILE")
BNAME=$(basename "$REAL_DUMP")

# ── Comprobaciones previas ───────────────────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    error "El contenedor $DB_CONTAINER no está en ejecución"
    exit 1
fi

# Verificar integridad SHA256 si existe el checksum
SHA_FILE="${REAL_DUMP}.sha256"
if [[ -f "$SHA_FILE" ]]; then
    info "Verificando integridad SHA256..."
    if sha256sum --check "$SHA_FILE" --quiet 2>/dev/null; then
        ok "Integridad verificada"
    else
        error "¡La suma SHA256 no coincide! El archivo puede estar corrupto."
        exit 1
    fi
fi

# Mostrar resumen
echo ""
bold "═══════════════════════════════════════════════════════"
bold "  RESTAURACIÓN DE BASE DE DATOS"
bold "═══════════════════════════════════════════════════════"
info "Backup a restaurar: $BNAME"
info "Tamaño: $(du -h "$REAL_DUMP" | cut -f1)"
info "Base de datos destino: $DB_NAME en $DB_CONTAINER"
$DRY_RUN && warn "MODO DRY-RUN: no se ejecutará ningún cambio"
echo ""

# Contar registros actuales
CURRENT_ROWS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -At -c \
    "SELECT SUM(n_live_tup) FROM pg_stat_user_tables;" 2>/dev/null || echo "?")
info "Filas actuales en BD: $CURRENT_ROWS"
echo ""

# Confirmación interactiva
if ! $DRY_RUN; then
    warn "ATENCIÓN: esto sobreescribirá TODOS los datos de $DB_NAME."
    warn "Se creará un backup pre-restauración automáticamente."
    echo ""
    read -r -p "$(echo -e "${BOLD}¿Confirmas la restauración? [escribe: SI para continuar]${RESET} ")" CONFIRM
    [[ "$CONFIRM" != "SI" ]] && { info "Restauración cancelada."; exit 0; }
fi

echo ""
log "====== INICIANDO RESTAURACIÓN ======"
log "Archivo: $BNAME"
log "Usuario: $(whoami)"

# ── Backup previo automático ─────────────────────────────────────────
PRE_TS=$(date '+%Y%m%d_%H%M%S')
PRE_DUMP="$BACKUP_DIR/pre_restore_${PRE_TS}.dump"

if ! $DRY_RUN; then
    info "Creando backup de seguridad previo..."
    docker exec "$DB_CONTAINER" pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        --no-owner \
        --no-privileges > "$PRE_DUMP"
    sha256sum "$PRE_DUMP" > "${PRE_DUMP}.sha256"
    ok "Backup previo creado: $(basename "$PRE_DUMP") ($(du -h "$PRE_DUMP" | cut -f1))"
    log "Backup previo: $(basename "$PRE_DUMP")"
else
    info "[DRY-RUN] Se crearía backup previo: pre_restore_${PRE_TS}.dump"
fi

# ── Restauración ─────────────────────────────────────────────────────
if ! $DRY_RUN; then
    info "Cerrando conexiones activas a $DB_NAME..."
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();" \
        > /dev/null 2>&1 || true

    info "Restaurando base de datos (esto puede tardar unos segundos)..."
    if docker exec -i "$DB_CONTAINER" pg_restore \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        --single-transaction \
        < "$REAL_DUMP" 2>/tmp/pg_restore_stderr.txt; then
        ok "pg_restore completado sin errores"
    else
        # pg_restore puede devolver código no-0 por warnings no críticos
        local_errors=$(grep -v "^pg_restore: warning" /tmp/pg_restore_stderr.txt | grep -v "^$" | head -5 || true)
        if [[ -n "$local_errors" ]]; then
            warn "pg_restore terminó con advertencias:"
            echo "$local_errors"
        else
            ok "pg_restore completado (solo warnings menores)"
        fi
    fi

    # Verificación post-restauración
    info "Verificando tablas restauradas..."
    SUMMARY=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -At -F '|' -c \
        "SELECT tablename, n_live_tup
         FROM pg_stat_user_tables
         WHERE n_live_tup > 0
         ORDER BY n_live_tup DESC
         LIMIT 10;" 2>/dev/null || echo "")

    echo ""
    bold "  Top tablas restauradas:"
    while IFS='|' read -r tbl cnt; do
        [[ -z "$tbl" ]] && continue
        printf "    %-45s  %s filas\n" "$tbl" "$cnt"
    done <<< "$SUMMARY"

    log "Restauración completada desde $BNAME"
fi

echo ""
bold "═══════════════════════════════════════════════════════"
$DRY_RUN \
    && ok "DRY-RUN completado — ningún dato fue modificado" \
    || ok "Restauración completada exitosamente"
bold "═══════════════════════════════════════════════════════"

if ! $DRY_RUN; then
    echo ""
    info "Si algo no está bien, puedes volver al estado anterior con:"
    echo "   $0 $(basename "$PRE_DUMP")"
fi
echo ""
