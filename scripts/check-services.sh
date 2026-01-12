#!/bin/bash
#
# Script de Monitoreo Automático - Nex-Fit PRO
# =============================================
# Este script verifica que todos los servicios críticos estén corriendo
# y los reinicia automáticamente si se detecta algún problema.
#
# Uso: ./check-services.sh
# Crontab: */5 * * * * /srv/mykaizenfit/pro/scripts/check-services.sh

# Configuración
PROJECT_DIR="/srv/mykaizenfit/pro"
LOG_FILE="/var/log/nexfit-check.log"
COMPOSE_PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.prod.yml"

# Función para logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Función para verificar si un servicio está corriendo
check_service() {
    local service_name=$1
    cd "$PROJECT_DIR" || exit 1
    
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE ps --filter "status=running" | grep -q "$service_name"
    return $?
}

# Función para verificar salud del servicio
check_health() {
    local service_name=$1
    cd "$PROJECT_DIR" || exit 1
    
    local health_status=$(COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE ps --format json | jq -r "select(.Name == \"$service_name\") | .Health")
    
    if [ "$health_status" == "healthy" ] || [ "$health_status" == "" ]; then
        return 0
    else
        return 1
    fi
}

# Función para reiniciar un servicio
restart_service() {
    local service_name=$1
    log "⚠️  Reiniciando servicio: $service_name"
    
    cd "$PROJECT_DIR" || exit 1
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE up -d "$service_name" 2>&1 | tee -a "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        log "✅ Servicio $service_name reiniciado correctamente"
        return 0
    else
        log "❌ ERROR: No se pudo reiniciar $service_name"
        return 1
    fi
}

# =============================================
# INICIO DEL MONITOREO
# =============================================

log "🔍 Iniciando verificación de servicios..."

# Lista de servicios críticos
SERVICES=("backend" "frontend" "db" "redis")
RESTART_NEEDED=0

# Verificar cada servicio
for service in "${SERVICES[@]}"; do
    container_name="nexfit-pro-${service}-1"
    
    if ! check_service "$container_name"; then
        log "❌ CRÍTICO: $service NO está corriendo"
        RESTART_NEEDED=1
    else
        log "✅ $service está corriendo"
        
        # Verificar salud si el servicio tiene healthcheck
        if ! check_health "$container_name"; then
            log "⚠️  ADVERTENCIA: $service está corriendo pero no está saludable"
            RESTART_NEEDED=1
        fi
    fi
done

# Reiniciar servicios si es necesario
if [ $RESTART_NEEDED -eq 1 ]; then
    log "🔄 Reiniciando servicios afectados..."
    
    cd "$PROJECT_DIR" || exit 1
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE up -d 2>&1 | tee -a "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        log "✅ Todos los servicios han sido reiniciados correctamente"
        
        # Enviar notificación (opcional - descomentar si tienes webhook)
        # curl -X POST https://tu-webhook.com/alert -d "message=Servicios Nexfit-PRO reiniciados automáticamente"
    else
        log "❌ ERROR CRÍTICO: Fallo al reiniciar servicios. Requiere intervención manual."
        
        # Aquí podrías enviar una alerta crítica por email o webhook
    fi
else
    log "✅ Todos los servicios funcionan correctamente"
fi

# Verificar uso de recursos
log "📊 Uso de recursos:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep nexfit-pro | tee -a "$LOG_FILE"

log "✅ Verificación completada\n"

exit 0
