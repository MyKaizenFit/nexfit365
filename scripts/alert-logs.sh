#!/bin/bash

# Sistema de Alertas - Solo Logs Locales
# Centraliza todos los errores en archivos

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-integrity-check.sh
source "$SCRIPT_DIR/db-integrity-check.sh"

ALERT_LOG="/srv/mykaizenfit/pro/backups/alerts.log"
ERROR_LOG="/srv/mykaizenfit/pro/backups/error.log"
HEALTH_LOG="/srv/mykaizenfit/pro/backups/health.log"
# Errores en la última ejecución de optimize-database.sh (no histórico completo)
_optimization_last_run_errors() {
    local log_file=$1
    [ -f "$log_file" ] || return 1
    local start_line
    start_line=$(grep -n "INICIANDO OPTIMIZACIÓN DE BD" "$log_file" | tail -1 | cut -d: -f1)
    [ -n "$start_line" ] || return 1
    tail -n +"$start_line" "$log_file" | grep -qiE 'could not open file|read only 0 of 8192|ERROR:.*Abortado|optimize-database: Abortado|Corrupción detectada'
}
COMPOSE_FILE="/srv/mykaizenfit/pro/docker-compose.prod.yml"
PROJECT="nexfit-pro"
BACKUP_DIR="/srv/mykaizenfit/pro/backups"
DAILY_BACKUP="/srv/mykaizenfit/pro/data/backups/daily/mykaizenfit-latest.sql.gz"
OPT_LOG="/srv/mykaizenfit/pro/backups/optimization.log"

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

# 3. ALERTA: Backup fallido o antiguo
check_backup_status() {
    local latest_dump="" backup_ok=false daily_ok=false

    if [ -L "$BACKUP_DIR/latest.dump" ] && [ -f "$BACKUP_DIR/latest.dump" ]; then
        latest_dump="$BACKUP_DIR/latest.dump"
    elif ls "$BACKUP_DIR"/mykaizenfit_*.dump >/dev/null 2>&1; then
        latest_dump=$(ls -t "$BACKUP_DIR"/mykaizenfit_*.dump 2>/dev/null | head -1)
    fi

    if [ -n "$latest_dump" ] && [ -f "$latest_dump" ]; then
        local age_h=$(( ($(date +%s) - $(stat -c %Y "$latest_dump")) / 3600 ))
        if [ "$age_h" -le 25 ]; then
            backup_ok=true
        else
            MSG="CRÍTICO - Dump antiguo: ${age_h}h ($latest_dump)"
            log_alert "CRITICAL" "$MSG"
            log_error "$MSG"
        fi
    else
        MSG="CRÍTICO - No hay dump canónico en $BACKUP_DIR"
        log_alert "CRITICAL" "$MSG"
        log_error "$MSG"
    fi

    if [ -f "$DAILY_BACKUP" ] || [ -L "$DAILY_BACKUP" ]; then
        local daily_h=$(( ($(date +%s) - $(stat -c %Y "$DAILY_BACKUP")) / 3600 ))
        if [ "$daily_h" -le 25 ]; then
            daily_ok=true
        else
            MSG="ADVERTENCIA - Backup daily antiguo: ${daily_h}h"
            log_alert "WARNING" "$MSG"
        fi
    else
        MSG="ADVERTENCIA - Falta backup daily del contenedor db-backup"
        log_alert "WARNING" "$MSG"
    fi

    if [ "$backup_ok" = true ] && [ "$daily_ok" = true ]; then
        log_alert "INFO" "Backups dump + daily OK"
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

# 5. ALERTA: BD con problemas o corrupción
check_database_health() {
    local msg="" rc=0
    msg=$(check_db_integrity) || rc=$?

    if [ "$rc" -eq 1 ]; then
        MSG="CRÍTICO - Corrupción PostgreSQL: $msg"
        log_alert "CRITICAL" "$MSG"
        log_error "$MSG"
    elif [ "$rc" -eq 2 ]; then
        MSG="CRÍTICO - Base de datos no responde: $msg"
        log_alert "CRITICAL" "$MSG"
        log_error "$MSG"
    fi
}

# 5b. ALERTA: Errores en la última ejecución de optimize-database.sh
check_optimization_log() {
    if _optimization_last_run_errors "$OPT_LOG"; then
        MSG="CRÍTICO - Errores de corrupción/optimización en la última ejecución semanal"
        log_alert "CRITICAL" "$MSG"
        log_error "$MSG"
        local start_line
        start_line=$(grep -n "INICIANDO OPTIMIZACIÓN DE BD" "$OPT_LOG" | tail -1 | cut -d: -f1)
        tail -n +"$start_line" "$OPT_LOG" | tail -20 >> "$ERROR_LOG"
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
check_optimization_log
check_memory_usage
check_cpu_usage
echo "" >> "$ALERT_LOG"

