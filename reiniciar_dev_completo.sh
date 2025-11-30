#!/bin/bash
# Script para reiniciar completamente el entorno de desarrollo

set -e

echo "=========================================="
echo "  REINICIANDO ENTORNO DE DESARROLLO"
echo "=========================================="
echo ""

cd /srv/mykaizenfit/pro

# Paso 1: Detener todos los servicios
echo "1. Deteniendo todos los servicios de desarrollo..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down

echo ""
echo "2. Esperando 5 segundos para que los contenedores se detengan completamente..."
sleep 5

# Paso 2: Verificar que todo esté detenido
echo ""
echo "3. Verificando que todos los servicios estén detenidos..."
STATUS=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps 2>/dev/null | grep -c "Up" || echo "0")
if [ "$STATUS" != "0" ]; then
    echo "⚠️  Algunos servicios aún están corriendo. Forzando detención..."
    sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down --remove-orphans
    sleep 3
fi

echo "✓ Todos los servicios detenidos"
echo ""

# Paso 3: Levantar los servicios de nuevo
echo "4. Levantando servicios de desarrollo..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d

echo ""
echo "5. Esperando 30 segundos para que los servicios inicien completamente..."
echo "   (Esto puede tardar en la primera vez que se construyen las imágenes)"
sleep 30

# Paso 4: Verificar estado de los servicios
echo ""
echo "6. Verificando estado de los servicios..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps

echo ""
echo "7. Verificando logs del backend (últimas 20 líneas)..."
echo "=========================================="
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs --tail=20 backend

echo ""
echo "=========================================="
echo "  ✅ REINICIO COMPLETADO"
echo "=========================================="
echo ""
echo "📍 URLs de Desarrollo:"
echo "   Frontend: http://45.136.19.91:3001"
echo "   Backend:  http://45.136.19.91:8001"
echo ""
echo "📋 Comandos útiles:"
echo "   Ver logs: sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs -f"
echo "   Estado:   sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps"
echo ""
echo "⚠️  Si el login sigue fallando, verifica que existan usuarios:"
echo "   sudo bash /srv/mykaizenfit/pro/solucionar_login_dev.sh"
echo ""

