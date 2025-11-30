#!/bin/bash
# Script para generar planes de nutrición desde recetas en el entorno dev

echo "🍽️  Generando planes de nutrición desde recetas..."
echo ""

cd /srv/mykaizenfit/pro

# Ejecutar el comando de management
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T backend python manage.py generate_plans_from_recipes

echo ""
echo "✅ Proceso completado"


