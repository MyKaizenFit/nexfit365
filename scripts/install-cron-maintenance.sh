#!/bin/bash
# install-cron-maintenance.sh — Instala crons de mantenimiento unificados
#
# Uso: sudo ./scripts/install-cron-maintenance.sh
#
# Qué hace:
#   - Instala /etc/cron.d/nexfit-pro-maintenance (horarios seguros)
#   - Elimina entradas duplicadas del crontab de iago si existen
#   - chmod +x en scripts de mantenimiento

set -Eeuo pipefail

ROOT="/srv/mykaizenfit/pro"
CRON_SRC="$ROOT/scripts/cron/nexfit-pro-maintenance"
CRON_DST="/etc/cron.d/nexfit-pro-maintenance"
APP_USER="${SUDO_USER:-iago}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

if [ "$(id -u)" -ne 0 ]; then
  echo -e "${RED}Ejecuta con sudo:${NC} sudo $ROOT/scripts/install-cron-maintenance.sh"
  exit 1
fi

echo -e "${GREEN}Instalando crons de mantenimiento NexFit PRO...${NC}"

install -m 0644 "$CRON_SRC" "$CRON_DST"
echo "  ✓ $CRON_DST"

for script in db-integrity-check.sh optimize-database.sh reindex-jwt-blacklist.sh health-check.sh alert-logs.sh verify-backup.sh check-services.sh ensure-celery-worker.sh auto-backup.sh restore.sh; do
  chmod +x "$ROOT/scripts/$script"
done
echo "  ✓ Permisos de scripts"

if id "$APP_USER" >/dev/null 2>&1; then
  tmp=$(mktemp)
  crontab -u "$APP_USER" -l 2>/dev/null | grep -v 'mykaizenfit/pro/scripts/\(auto-backup\|health-check\|alert-logs\|optimize-database\|verify-backup\|monitor-performance\)\.sh' >"$tmp" || true
  crontab -u "$APP_USER" "$tmp"
  rm -f "$tmp"
  echo "  ✓ Crontab de $APP_USER limpiado (tareas movidas a $CRON_DST)"
fi

echo ""
echo -e "${GREEN}Instalación completada.${NC}"
echo ""
echo "Horarios clave:"
echo "  02:00  auto-backup (dump + SHA256)"
echo "  03:00  db-backup container (SQL daily)"
echo "  04:15  reindex-jwt-blacklist (diario, tablas refresh/blacklist)"
echo "  04:30  optimize-database (domingos, sin REINDEX DATABASE)"
echo "  05:00  verify-backup (domingos)"
echo "  06:30  ensure-celery-worker (diario)"
echo ""
echo -e "${YELLOW}Si hay corrupción PostgreSQL:${NC}"
echo "  1. NO mover data/postgres/"
echo "  2. ./scripts/restore.sh"
echo "  3. Revisar backups/alerts.log y backups/health.log"
echo ""
echo "Probar integridad ahora:"
echo "  $ROOT/scripts/db-integrity-check.sh"
