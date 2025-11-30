#!/bin/bash
# Script rápido para levantar desarrollo (usa sudo)

set -e

cd /srv/mykaizenfit/pro
echo "🚀 Levantando entorno de desarrollo..."
echo ""

# Limpiar contenedores huérfanos
echo "🧹 Limpiando contenedores huérfanos..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d --remove-orphans 2>&1 | grep -v "WARN.*orphan" || true

echo ""
echo "⏳ Esperando a que los servicios inicien..."
sleep 10

echo ""
echo "📊 Estado de los servicios:"
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps

echo ""
echo "📋 Últimos logs del backend:"
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs backend --tail=30

echo ""
BACKEND_STATUS=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps backend --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

if [ "$BACKEND_STATUS" != "running" ]; then
    echo "⚠️  El backend no está corriendo. Estado: $BACKEND_STATUS"
    echo ""
    echo "🔍 Revisando logs completos del backend:"
    sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs backend --tail=100
    echo ""
    echo "💡 Intenta reconstruir el backend:"
    echo "   sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d --build backend"
else
echo "✅ Desarrollo levantado en http://45.136.19.91:3001"
fi

echo ""
echo "📋 Comandos útiles:"
echo "   Ver logs: sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs -f"
echo "   Ver estado: sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps"
echo "   Detener: sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down"
