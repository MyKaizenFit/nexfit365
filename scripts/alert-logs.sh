#!/bin/bash

# Sistema de Alertas - Solo Logs Locales
# Centraliza todos los errores en archivos

ALERT_LOG="/srv/mykaizenfit/pro/backups/alerts.log"
ERROR_LOG="/srv/mykaizenfit/pro/backups/error.log"
HEALTH_LOG="/srv/mykaizenfit/pro/backups/health.log"
COMPOSE_FILE="/srv/mykaizenfit/pro/docker-compose.prod.yml"
PROJECT="nexfit-pro"

log_alert() {
    local level=$1
    local message=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" >> "$ALERT_LOG"
}

log_error() {
    local message=$1
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" >> "$ERROR_LOG"
}

# 1. ALERTA: Servicios caídos
check_services_down() {
    SERVICES_DOWN=$(COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" ps --services --filter "status=exited" 2>/dev/null)
    
    if [ ! -z "$SERVICES_DOWN" ]; then
        MSG="CRÍTICO - Servicios DOWN: $SERVICES_DOWN"
        log_alert "CRITICAL" "$MSG"
        log_error "$MSG"
    fi
}

# 2. ALERTA: Disco lleno (>85%)
check_disk_space() {
    DISK_USAGE=$(df /srv/mykaizenfit | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$DISK_USAGE" -gt 85 ]; then
        MSG="CRÍTICO - Disco al ${DISK_USAGE}%"
        log_alert "CRITICAL" "$MSG"
        log_error "$MSG"
    elif [ "$DISK_USAGE" -gt 75 ]; then
        MSG="ADVERTENCIA - Disco al ${DISK_USAGE}%"
        log_alert "WARNING" "$MSG"
    fi
}

# 3. ALERTA: Backup fallido
check_backup_status() {
    LATEST_BACKUP=$(ls -t /srv/mykaizenfit/pro/backups/backup_*.sql* 2>/dev/null | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        MSG="CRÍTICO - NO HAY BACKUPS"
        log_alert "CRITICAL" "$MSG"
        log_error "$MSG"
        return
    fi
    
    BACKUP_AGE=$(($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")))
    BACKUP_AGE_HOURS=$((BACKUP_AGE / 3600))
    BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
    
    if [ "$BACKUP_AGE_HOURS" -gt 25 ]; then
        MSG="CRÍTICO - Backup antiguo: ${BACKUP_AGE_HOURS}h (${BACKUP_SIZE})"
        log_alert "CRITICAL" "$MSG"
        log_error "$MSG"
    fi
}

# 4. ALERTA: Errores en logs de backend
check_error_logs() {
    ERROR_COUNT=$(COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" logs backend --tail=500 2>/dev/null | grep -i "error\|exception\|traceback" | wc -l)
    
    if [ "$ERROR_COUNT" -gt 10 ]; then
        MSG="ADVERTENCIA - $ERROR_COUNT errores en logs"
        log_alert "WARNING" "$MSG"
        
        # Guardar últimos errores
        COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" logs backend --tail=500 2>/dev/null | grep -i "error\|exception\|traceback" | tail -20 >> "$ERROR_LOG"
    fi
}

# 5. ALERTA: BD con problemas
check_database_health() {
    DB_CHECK=$(COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -c "SELECT 1;" 2>/dev/null)
    
    if [ -z "$DB_CHECK" ]; then
        MSG="CRÍTICO - Base de datos no responde"
        log_alert "CRITICAL" "$MSG"
        log_error "$MSG"
    fi
}

# 6. ALERTA: Memoria crítica
check_memory_usage() {
    MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    
    if [ "$MEM_USAGE" -gt 90 ]; then
        MSG="CRÍTICO - Memoria al ${MEM_USAGE}%"
        log_alert "CRITICAL" "$MSG"
        log_error "$MSG"
    elif [ "$MEM_USAGE" -gt 80 ]; then
        MSG="ADVERTENCIA - Memoria al ${MEM_USAGE}%"
        log_alert "WARNING" "$MSG"
    fi
}

# 7. ALERTA: CPU alta
check_cpu_usage() {
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | awk '{print int($1)}')
    
    if [ "$CPU_USAGE" -gt 80 ]; then
        MSG="ADVERTENCIA - CPU al ${CPU_USAGE}%"
        log_alert "WARNING" "$MSG"
    fi
}

# Ejecutar todos los chequeos
echo "" >> "$ALERT_LOG"
echo "[$(date)] ========== CHEQUEO DE ALERTAS ==========" >> "$ALERT_LOG"
check_services_down
check_disk_space
check_backup_status
check_error_logs
check_database_health
check_memory_usage
check_cpu_usage
echo "" >> "$ALERT_LOG"

