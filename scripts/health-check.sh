#!/bin/bash

# ============================================================================
# Health Check Script - Monitoreo read-only de servicios
# ============================================================================
# Observa, registra y alerta. No reinicia, recrea, construye ni detiene
# contenedores. Redis se valida con el healthcheck Docker para evitar falsos
# negativos por autenticacion.
# ============================================================================

set -u

ALERT_LOG="/srv/mykaizenfit/pro/backups/alerts.log"
COMPOSE_FILE="/srv/mykaizenfit/pro/docker-compose.prod.yml"
PROJECT="nexfit-pro"
TIMESTAMP="[$(date '+%Y-%m-%d %H:%M:%S')]"

mkdir -p "$(dirname "$ALERT_LOG")"
touch "$ALERT_LOG"

compose() {
    COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" "$@"
}

log_status() {
    local service=$1
    local status=$2
    echo "$TIMESTAMP $service: $status"
}

log_critical() {
    local message=$1
    echo "$TIMESTAMP [CRITICAL] $message" >> "$ALERT_LOG"
}

container_health() {
    local container_name=$1
    docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$container_name" 2>/dev/null || echo "missing"
}

echo "$TIMESTAMP ========== INICIANDO HEALTH CHECK (READ-ONLY) =========="

# ============================================================================
# 1. Backend
# ============================================================================
echo -n "Checking Backend... "
if curl -fsS --max-time 8 http://localhost:8000/api/health/ > /dev/null 2>&1 || \
   curl -fsS --max-time 8 http://localhost:8000 > /dev/null 2>&1; then
    log_status "Backend" "✅ Healthy"
else
    log_status "Backend" "🔴 CRITICAL: no responde"
    log_critical "Backend no responde a healthcheck HTTP"
fi

# ============================================================================
# 2. Frontend
# ============================================================================
echo -n "Checking Frontend... "
if curl -fsS --max-time 8 http://localhost:3000 > /dev/null 2>&1; then
    log_status "Frontend" "✅ Healthy"
else
    log_status "Frontend" "🔴 CRITICAL: no responde"
    log_critical "Frontend no responde a HTTP local"
fi

# ============================================================================
# 3. PostgreSQL (read-only)
# ============================================================================
echo -n "Checking PostgreSQL... "
if compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
    USER_COUNT=$(compose exec -T db psql -U postgres mykaizenfit -tA -c 'SELECT COUNT(*) FROM accounts_customuser;' 2>/dev/null || echo "?")
    log_status "PostgreSQL" "✅ Healthy ($USER_COUNT users)"
else
    log_status "PostgreSQL" "🔴 CRITICAL: pg_isready falló"
    log_critical "PostgreSQL no responde a pg_isready"
fi

# ============================================================================
# 4. Redis
# ============================================================================
echo -n "Checking Redis... "
REDIS_HEALTH=$(container_health "nexfit-pro-redis-1")
if [ "$REDIS_HEALTH" = "healthy" ]; then
    log_status "Redis" "✅ healthy"
else
    log_status "Redis" "🔴 CRITICAL: Docker health=$REDIS_HEALTH"
    log_critical "Redis Docker health=$REDIS_HEALTH; no se ejecuta restart automatico"
fi

# ============================================================================
# 5. Docker Compose
# ============================================================================
echo -n "Checking Docker Compose... "
DOWN_LIST=$(compose ps --services --filter 'status=exited' 2>/dev/null | grep -v '^$' | tr '\n' ' ')
SERVICES_DOWN=$(printf '%s\n' "$DOWN_LIST" | awk '{$1=$1; print}' | grep -cv '^$')
if [ "$SERVICES_DOWN" -eq 0 ]; then
    TOTAL_SERVICES=$(compose ps --services 2>/dev/null | wc -l)
    log_status "Docker Compose" "✅ All services UP ($TOTAL_SERVICES)"
else
    log_status "Docker Compose" "🔴 CRITICAL: $SERVICES_DOWN services DOWN: $DOWN_LIST"
    log_critical "Docker Compose services down: $DOWN_LIST"
fi

# ============================================================================
# 6. Disco
# ============================================================================
echo -n "Checking Disk Space... "
DISK_USAGE=$(df /srv/mykaizenfit 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//' || echo "0")
DISK_AVAILABLE=$(df -h /srv/mykaizenfit 2>/dev/null | awk 'NR==2 {print $4}' || echo "?")

if [ "$DISK_USAGE" -lt 80 ]; then
    log_status "Disk Space" "✅ OK ($DISK_USAGE% used, $DISK_AVAILABLE available)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    log_status "Disk Space" "⚠️  WARNING ($DISK_USAGE% used, $DISK_AVAILABLE available)"
else
    log_status "Disk Space" "🔴 CRITICAL ($DISK_USAGE% used, $DISK_AVAILABLE available)"
    log_critical "Disk usage critical: ${DISK_USAGE}%"
fi

# ============================================================================
# 7. Backups (dump canonico + daily del contenedor)
# ============================================================================
echo -n "Checking Latest Backup... "
BACKUP_DIR="/srv/mykaizenfit/pro/backups"
DAILY_BACKUP="/srv/mykaizenfit/pro/data/backups/daily/mykaizenfit-latest.sql.gz"
LATEST_DUMP=""

if [ -L "$BACKUP_DIR/latest.dump" ] && [ -f "$BACKUP_DIR/latest.dump" ]; then
    LATEST_DUMP="$BACKUP_DIR/latest.dump"
elif ls "$BACKUP_DIR"/mykaizenfit_*.dump >/dev/null 2>&1; then
    LATEST_DUMP=$(ls -t "$BACKUP_DIR"/mykaizenfit_*.dump 2>/dev/null | head -1)
fi

BACKUP_STATUS="❌ NO BACKUP FOUND"
if [ -n "$LATEST_DUMP" ] && [ -f "$LATEST_DUMP" ]; then
    BACKUP_AGE=$(($(date +%s) - $(stat -c %Y "$LATEST_DUMP" 2>/dev/null || date +%s)))
    BACKUP_AGE_HOURS=$((BACKUP_AGE / 3600))
    BACKUP_SIZE=$(du -h "$LATEST_DUMP" 2>/dev/null | cut -f1)
    BACKUP_DATE=$(stat -c %y "$LATEST_DUMP" 2>/dev/null | cut -d. -f1)
    if [ "$BACKUP_AGE_HOURS" -lt 25 ]; then
        BACKUP_STATUS="✅ dump OK (${BACKUP_AGE_HOURS}h, $BACKUP_SIZE, $BACKUP_DATE)"
    else
        BACKUP_STATUS="⚠️  dump antiguo (${BACKUP_AGE_HOURS}h, $BACKUP_SIZE)"
    fi
fi

if [ -f "$DAILY_BACKUP" ] || [ -L "$DAILY_BACKUP" ]; then
    DAILY_AGE=$(($(date +%s) - $(stat -c %Y "$DAILY_BACKUP" 2>/dev/null || date +%s)))
    DAILY_H=$((DAILY_AGE / 3600))
    if [ "$DAILY_H" -lt 25 ]; then
        BACKUP_STATUS="$BACKUP_STATUS; daily OK (${DAILY_H}h)"
    else
        BACKUP_STATUS="$BACKUP_STATUS; ⚠️ daily antiguo (${DAILY_H}h)"
    fi
fi

log_status "Backup" "$BACKUP_STATUS"

# ============================================================================
# 8. Encryption
# ============================================================================
echo -n "Checking Encryption... "
if grep -q "ENCRYPTION_KEY=" "/srv/mykaizenfit/pro/backend/.env" 2>/dev/null; then
    ENCRYPTION_KEY_LENGTH=$(grep "ENCRYPTION_KEY=" "/srv/mykaizenfit/pro/backend/.env" | cut -d= -f2 | wc -c)
    log_status "Encryption" "✅ ENCRYPTION_KEY configured (${ENCRYPTION_KEY_LENGTH} chars)"
else
    log_status "Encryption" "⚠️  ENCRYPTION_KEY not found in .env"
fi

# ============================================================================
# 9. Errores en la ultima ejecucion de optimize-database.sh
# ============================================================================
OPT_LOG="/srv/mykaizenfit/pro/backups/optimization.log"
if [ -f "$OPT_LOG" ]; then
    opt_start=$(grep -n "INICIANDO OPTIMIZACIÓN DE BD" "$OPT_LOG" | tail -1 | cut -d: -f1)
    if [ -n "$opt_start" ] && tail -n +"$opt_start" "$OPT_LOG" | grep -qiE 'could not open file|read only 0 of 8192|ERROR:.*Abortado|Corrupción detectada'; then
        log_status "DB Optimization" "⚠️  Errores en la última ejecución semanal"
        log_critical "Errors in last optimize-database run — review optimization.log"
    fi
fi

echo ""
echo "$TIMESTAMP ========== HEALTH CHECK COMPLETED =========="
