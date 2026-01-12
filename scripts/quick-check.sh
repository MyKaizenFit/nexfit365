#!/bin/bash
#
# Quick Check Script - Verificación rápida de servicios
# ======================================================

cd /srv/mykaizenfit/pro
echo "🔍 Estado de servicios Nex-Fit PRO:"
echo "===================================="
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps
echo ""
echo "📊 Uso de recursos:"
echo "==================="
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | grep nexfit-pro
