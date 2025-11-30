#!/bin/bash
# Script para reiniciar el entorno de desarrollo

echo "=========================================="
echo "  REINICIANDO DESARROLLO (Puerto 3001)"
echo "=========================================="
echo ""

cd /srv/mykaizenfit/pro

# Detener servicios actuales
echo "1. Deteniendo servicios actuales..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down

echo ""
echo "2. Esperando 5 segundos..."
sleep 5

# Levantar servicios
echo ""
echo "3. Levantando servicios de desarrollo..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "4. Esperando 25 segundos para que los servicios inicien completamente..."
sleep 25

# Verificar estado final
echo ""
echo "5. Estado final de desarrollo:"
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps

echo ""
echo "=========================================="
echo "  ✅ DESARROLLO REINICIADO"
echo "=========================================="
echo ""
echo "📍 URLs de Desarrollo:"
echo "   Frontend: http://45.136.19.91:3001"
echo "   Backend:  http://45.136.19.91:8001"
echo ""
echo "📋 Para ver logs:"
echo "   sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs -f"
echo ""




