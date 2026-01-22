#!/bin/bash

# Monitoreo de Performance del Sistema
# Ejecutar diariamente para recopilar metrics

COMPOSE_FILE="/srv/mykaizenfit/pro/docker-compose.prod.yml"
PROJECT="nexfit-pro"
LOG_FILE="/srv/mykaizenfit/pro/backups/performance.log"

echo "[$(date)] ========== REPORTE DE PERFORMANCE ==========" >> "$LOG_FILE"

# 1. Redis stats
echo "[$(date)] Redis Stats:" >> "$LOG_FILE"
COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli INFO stats >> "$LOG_FILE" 2>&1 || echo "Redis no disponible" >> "$LOG_FILE"

# 2. DB Connections
echo "[$(date)] DB Connections:" >> "$LOG_FILE"
COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -c "SELECT count(*) as active_connections FROM pg_stat_activity;" >> "$LOG_FILE" 2>&1

# 3. Database size
echo "[$(date)] Database Size:" >> "$LOG_FILE"
COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d mykaizenfit -c "SELECT pg_size_pretty(pg_database_size('mykaizenfit')) as db_size;" >> "$LOG_FILE" 2>&1

# 4. CPU y Memoria
echo "[$(date)] System Resources:" >> "$LOG_FILE"
echo "Disk:" >> "$LOG_FILE"
df -h /srv/mykaizenfit >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
echo "Memory:" >> "$LOG_FILE"
free -h >> "$LOG_FILE"

echo "[$(date)] ========== FIN REPORTE ==========" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
