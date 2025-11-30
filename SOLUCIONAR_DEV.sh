#!/bin/bash
# Script para solucionar problemas del entorno de desarrollo

set -e

cd /srv/mykaizenfit/pro
echo "🔧 Solucionando problemas del entorno de desarrollo..."
echo ""

# Detener todos los contenedores
echo "🛑 Deteniendo contenedores..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down

# Limpiar contenedores huérfanos
echo "🧹 Limpiando contenedores huérfanos..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down --remove-orphans 2>&1 || true

# Reconstruir imágenes si es necesario
echo "🔨 Reconstruyendo imágenes..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml build --no-cache backend

# Levantar servicios
echo "🚀 Levantando servicios..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d

echo ""
echo "⏳ Esperando a que los servicios inicien (30 segundos)..."
sleep 30

echo ""
echo "📊 Estado de los servicios:"
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps

echo ""
echo "📋 Logs del backend:"
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs backend --tail=50

echo ""
BACKEND_STATUS=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps backend --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

if [ "$BACKEND_STATUS" = "running" ]; then
    echo "✅ Backend está corriendo correctamente"
    echo ""
    echo "✅ Desarrollo disponible en http://45.136.19.91:3001"
else
    echo "❌ Backend no está corriendo. Estado: $BACKEND_STATUS"
    echo ""
    echo "🔍 Revisa los logs completos:"
    echo "   sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs backend"
fi

echo ""
echo "📋 Comandos útiles:"
echo "   Ver logs: sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs -f"
echo "   Ver estado: sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps"
echo "   Detener: sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down"

