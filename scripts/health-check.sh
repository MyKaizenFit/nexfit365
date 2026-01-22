#!/bin/bash

# ============================================================================
# Health Check Script - Monitoreo automático de servicios
# ============================================================================
# Verifica la salud de todos los servicios y auto-reinicia si es necesario
# Se ejecuta cada hora via cron
# ============================================================================

set -e

# Configuración
HEALTH_LOG="/srv/mykaizenfit/pro/backups/health.log"
COMPOSE_FILE="/srv/mykaizenfit/pro/docker-compose.prod.yml"
PROJECT="nexfit-pro"
DOCKER_COMPOSE="COMPOSE_PROJECT_NAME=$PROJECT docker compose -f $COMPOSE_FILE"

# Crear log si no existe
touch "$HEALTH_LOG"
mkdir -p "$(dirname "$HEALTH_LOG")"

# Timestamp
TIMESTAMP="[$(date '+%Y-%m-%d %H:%M:%S')]"

# Función para loguear
log_status() {
    local service=$1
    local status=$2
    echo "$TIMESTAMP $service: $status" >> "$HEALTH_LOG"
    echo "$status"
}

# Función para reiniciar servicio
restart_service() {
    local service=$1
    echo "$TIMESTAMP Reiniciando $service..." >> "$HEALTH_LOG"
    eval "$DOCKER_COMPOSE restart $service" >> "$HEALTH_LOG" 2>&1
}

# ============================================================================
# INICIO DEL HEALTH CHECK
# ============================================================================

echo "$TIMESTAMP ========== INICIANDO HEALTH CHECK ==========" >> "$HEALTH_LOG"

# ============================================================================
# 1. Verificar Backend (Django)
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
# 2. Verificar Frontend (Next.js)
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
# 3. Verificar PostgreSQL
# ============================================================================
echo -n "Checking PostgreSQL... "
if eval "$DOCKER_COMPOSE exec -T db psql -U postgres -c 'SELECT 1;'" > /dev/null 2>&1; then
    # Contar usuarios como indicador adicional
    USER_COUNT=$(eval "$DOCKER_COMPOSE exec -T db psql -U postgres mykaizenfit -t -c 'SELECT COUNT(*) FROM accounts_customuser;'" 2>/dev/null || echo "?")
    log_status "PostgreSQL" "✅ Healthy ($USER_COUNT users)"
else
    log_status "PostgreSQL" "❌ FAILED - Restarting..."
    restart_service "db"
    sleep 10
    if eval "$DOCKER_COMPOSE exec -T db psql -U postgres -c 'SELECT 1;'" > /dev/null 2>&1; then
        log_status "PostgreSQL" "✅ Recovered after restart"
    else
        log_status "PostgreSQL" "❌ Still down after restart"
    fi
fi

# ============================================================================
# 4. Verificar Redis
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
# 5. Verificar estado general de Docker Compose
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
# 6. Verificar espacio en disco
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
fi

# ============================================================================
# 7. Verificar backup más reciente
# ============================================================================
echo -n "Checking Latest Backup... "
BACKUP_DIR="/srv/mykaizenfit/pro/backups"
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/pg_data_backup_*.tar.gz 2>/dev/null | head -1)

if [ -f "$LATEST_BACKUP" ]; then
    BACKUP_AGE=$(($(date +%s) - $(stat -c %Y "$LATEST_BACKUP" 2>/dev/null || date +%s)))
    BACKUP_AGE_HOURS=$((BACKUP_AGE / 3600))
    BACKUP_SIZE=$(du -h "$LATEST_BACKUP" 2>/dev/null | cut -f1)
    BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP" 2>/dev/null | cut -d. -f1)
    
    if [ "$BACKUP_AGE_HOURS" -lt 25 ]; then
        log_status "Backup" "✅ OK (${BACKUP_AGE_HOURS}h old, $BACKUP_SIZE, $BACKUP_DATE)"
    else
        log_status "Backup" "⚠️  WARNING (${BACKUP_AGE_HOURS}h old - should be daily)"
    fi
else
    log_status "Backup" "❌ NO BACKUP FOUND"
fi

# ============================================================================
# 8. Verificar ENCRYPTION_KEY configurada
# ============================================================================
echo -n "Checking Encryption... "
if grep -q "ENCRYPTION_KEY=" "/srv/mykaizenfit/pro/backend/.env" 2>/dev/null; then
    ENCRYPTION_KEY_LENGTH=$(grep "ENCRYPTION_KEY=" "/srv/mykaizenfit/pro/backend/.env" | cut -d= -f2 | wc -c)
    log_status "Encryption" "✅ ENCRYPTION_KEY configured (${ENCRYPTION_KEY_LENGTH} chars)"
else
    log_status "Encryption" "⚠️  ENCRYPTION_KEY not found in .env"
fi

# ============================================================================
# Resumen
# ============================================================================
echo "$TIMESTAMP ========== HEALTH CHECK COMPLETED ==========" >> "$HEALTH_LOG"
echo "" >> "$HEALTH_LOG"

# Mostrar resumen
echo ""
echo "✅ Health check completed. Log: $HEALTH_LOG"
echo "📋 Last 5 checks:"
tail -5 "$HEALTH_LOG"
