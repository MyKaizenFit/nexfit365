#!/bin/bash

# ============================================================================
# Health Check Script - Monitoreo automático de servicios
# ============================================================================
# Verifica la salud de todos los servicios y auto-reinicia si es necesario.
# NO reinicia PostgreSQL si detecta corrupción (restaurar desde backup).
# ============================================================================

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-integrity-check.sh
source "$SCRIPT_DIR/db-integrity-check.sh"

HEALTH_LOG="/srv/mykaizenfit/pro/backups/health.log"
ALERT_LOG="/srv/mykaizenfit/pro/backups/alerts.log"
COMPOSE_FILE="/srv/mykaizenfit/pro/docker-compose.prod.yml"
PROJECT="nexfit-pro"
DOCKER_COMPOSE="COMPOSE_PROJECT_NAME=$PROJECT docker compose -f $COMPOSE_FILE"
DB_CORRUPTION=false

touch "$HEALTH_LOG" "$ALERT_LOG"
mkdir -p "$(dirname "$HEALTH_LOG")"

TIMESTAMP="[$(date '+%Y-%m-%d %H:%M:%S')]"

log_status() {
    local service=$1
    local status=$2
    echo "$TIMESTAMP $service: $status" >> "$HEALTH_LOG"
    echo "$status"
}

log_critical() {
    local message=$1
    echo "$TIMESTAMP [CRITICAL] $message" >> "$ALERT_LOG"
}

restart_service() {
    local service=$1
    echo "$TIMESTAMP Reiniciando $service..." >> "$HEALTH_LOG"
    eval "$DOCKER_COMPOSE restart $service" >> "$HEALTH_LOG" 2>&1
}

echo "$TIMESTAMP ========== INICIANDO HEALTH CHECK ==========" >> "$HEALTH_LOG"

# ============================================================================
# 1. Backend
# ============================================================================
echo -n "Checking Backend... "
if curl -s http://localhost:8000/api/health/ > /dev/null 2>&1 || curl -s http://localhost:8000 > /dev/null 2>&1; then
    log_status "Backend" "✅ Healthy"
else
    log_status "Backend" "❌ FAILED - Restarting..."
    restart_service "backend"
    sleep 5
    if curl -s http://localhost:8000 > /dev/null 2>&1; then
        log_status "Backend" "✅ Recovered after restart"
    else
        log_status "Backend" "❌ Still down after restart"
    fi
fi

# ============================================================================
# 2. Frontend
# ============================================================================
echo -n "Checking Frontend... "
if curl -s http://localhost:3000 | grep -q "html\|DOCTYPE\|next" > /dev/null 2>&1; then
    log_status "Frontend" "✅ Healthy"
else
    log_status "Frontend" "❌ FAILED - Restarting..."
    restart_service "frontend"
    sleep 5
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        log_status "Frontend" "✅ Recovered after restart"
    else
        log_status "Frontend" "❌ Still down after restart"
    fi
fi

# ============================================================================
# 3. PostgreSQL (+ integridad)
# ============================================================================
echo -n "Checking PostgreSQL... "
integrity_msg=""
integrity_rc=0
integrity_msg=$(check_db_integrity) || integrity_rc=$?

if [ "$integrity_rc" -eq 1 ]; then
    DB_CORRUPTION=true
    log_status "PostgreSQL" "🔴 CORRUPCIÓN DETECTADA — NO reiniciar. Restaurar backup."
    log_critical "PostgreSQL corruption: $integrity_msg"
elif [ "$integrity_rc" -eq 2 ]; then
    log_status "PostgreSQL" "❌ FAILED - Restarting..."
    restart_service "db"
    sleep 10
    integrity_msg=$(check_db_integrity) || integrity_rc=$?
    if [ "$integrity_rc" -eq 0 ]; then
        log_status "PostgreSQL" "✅ Recovered after restart"
    elif [ "$integrity_rc" -eq 1 ]; then
        DB_CORRUPTION=true
        log_status "PostgreSQL" "🔴 CORRUPCIÓN tras restart — restaurar backup"
        log_critical "PostgreSQL corruption after restart: $integrity_msg"
    else
        log_status "PostgreSQL" "❌ Still down after restart"
    fi
else
    USER_COUNT=$(eval "$DOCKER_COMPOSE exec -T db psql -U postgres mykaizenfit -tA -c 'SELECT COUNT(*) FROM accounts_customuser;'" 2>/dev/null || echo "?")
    log_status "PostgreSQL" "✅ Healthy ($USER_COUNT users, integrity OK)"
fi

# ============================================================================
# 4. Redis
# ============================================================================
echo -n "Checking Redis... "
if eval "$DOCKER_COMPOSE exec -T redis redis-cli ping" 2>&1 | grep -q "PONG"; then
    log_status "Redis" "✅ Healthy"
else
    log_status "Redis" "❌ FAILED - Restarting..."
    restart_service "redis"
    sleep 3
    if eval "$DOCKER_COMPOSE exec -T redis redis-cli ping" 2>&1 | grep -q "PONG"; then
        log_status "Redis" "✅ Recovered after restart"
    else
        log_status "Redis" "❌ Still down after restart"
    fi
fi

# ============================================================================
# 5. Docker Compose
# ============================================================================
echo -n "Checking Docker Compose... "
SERVICES_DOWN=$(eval "$DOCKER_COMPOSE ps --services --filter 'status=exited' 2>/dev/null | wc -l")
if [ "$SERVICES_DOWN" -eq 0 ]; then
    TOTAL_SERVICES=$(eval "$DOCKER_COMPOSE ps --services 2>/dev/null | wc -l")
    log_status "Docker Compose" "✅ All services UP ($TOTAL_SERVICES)"
else
    log_status "Docker Compose" "⚠️  $SERVICES_DOWN services DOWN"
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
# 7. Backups (dump canónico + daily del contenedor)
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
# 9. Errores en la última ejecución de optimize-database.sh
# ============================================================================
OPT_LOG="/srv/mykaizenfit/pro/backups/optimization.log"
if [ -f "$OPT_LOG" ]; then
    opt_start=$(grep -n "INICIANDO OPTIMIZACIÓN DE BD" "$OPT_LOG" | tail -1 | cut -d: -f1)
    if [ -n "$opt_start" ] && tail -n +"$opt_start" "$OPT_LOG" | grep -qiE 'could not open file|read only 0 of 8192|ERROR:.*Abortado|Corrupción detectada'; then
        log_status "DB Optimization" "⚠️  Errores en la última ejecución semanal"
        log_critical "Errors in last optimize-database run — review optimization.log"
    fi
fi

echo "$TIMESTAMP ========== HEALTH CHECK COMPLETED ==========" >> "$HEALTH_LOG"
echo "" >> "$HEALTH_LOG"

echo ""
echo "✅ Health check completed. Log: $HEALTH_LOG"
if [ "$DB_CORRUPTION" = true ]; then
    echo "🔴 CORRUPCIÓN PostgreSQL — usar ./scripts/restore.sh, NO mover data/postgres/"
fi
echo "📋 Last 5 checks:"
tail -5 "$HEALTH_LOG"

if [ "$DB_CORRUPTION" = true ]; then
    exit 2
fi
