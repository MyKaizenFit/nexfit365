#!/bin/bash
# Purga informes de error: formato antiguo y saneados de más de 90 días.
# No imprime el contenido de los ficheros.

set -Eeuo pipefail

cd /srv/mykaizenfit/pro
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T backend \
  python manage.py cleanup_error_reports --execute
