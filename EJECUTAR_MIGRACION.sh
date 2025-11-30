#!/bin/bash
# Script para ejecutar la migración de campos de contraseña temporal

echo "🔄 Ejecutando migración de campos de contraseña temporal..."
echo ""

cd /srv/mykaizenfit/pro

# Ejecutar la migración
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T backend python manage.py migrate accounts

echo ""
echo "✅ Migración completada"

