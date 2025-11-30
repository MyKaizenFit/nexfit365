#!/bin/bash
# Script completo para levantar desarrollo en paralelo con producción

echo "=========================================="
echo "  LEVANTANDO DESARROLLO (Puerto 3001)"
echo "  En paralelo con Producción (Puerto 3000)"
echo "=========================================="
echo ""

cd /srv/mykaizenfit/pro

# Verificar archivos de configuración
echo "1. Verificando configuración..."
if [ ! -f "docker/backend.env" ]; then
    echo "❌ Error: No se encuentra docker/backend.env"
    exit 1
fi

if [ ! -f "frontend/docker.env" ]; then
    echo "❌ Error: No se encuentra frontend/docker.env"
    exit 1
fi
echo "✓ Archivos de configuración encontrados"
echo ""

# Verificar estado actual
echo "2. Estado actual de desarrollo:"
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps 2>/dev/null || echo "   (Ningún contenedor corriendo aún)"
echo ""

# Levantar servicios
echo "3. Levantando servicios de desarrollo..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d

echo ""
echo "4. Esperando 25 segundos para que los servicios inicien completamente..."
sleep 25

# Verificar estado final
echo ""
echo "5. Estado final de desarrollo:"
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps

echo ""
echo "=========================================="
echo "  ✅ DESARROLLO LEVANTADO"
echo "=========================================="
echo ""
echo "📍 URLs de Desarrollo:"
echo "   Frontend: http://45.136.19.91:3001"
echo "   Backend:  http://45.136.19.91:8001"
echo ""
echo "📍 URLs de Producción (activas en paralelo):"
echo "   Frontend: http://45.136.19.91:3000"
echo "   Backend:  http://45.136.19.91:8000"
echo ""
echo "📋 Comandos útiles:"
echo "   Ver logs: sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs -f"
echo "   Detener:  sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down"
echo "   Estado:   sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps"
echo ""

