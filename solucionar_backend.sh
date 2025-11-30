#!/bin/bash

# Script para solucionar problemas del backend en desarrollo
set -e

PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.prod.yml"

echo "🔧 SOLUCIONANDO PROBLEMAS DEL BACKEND"
echo "======================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar errores
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Función para mostrar éxito
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Función para mostrar advertencias
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

cd /srv/mykaizenfit/pro

echo "1️⃣  Verificando estado de contenedores..."
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE ps

echo ""
echo "2️⃣  Deteniendo contenedores problemáticos..."
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE stop backend frontend || true

echo ""
echo "3️⃣  Eliminando contenedor del backend..."
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE rm -f backend || true

echo ""
echo "4️⃣  Verificando logs del backend (últimas 50 líneas)..."
echo "=========================================="
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE logs backend --tail=50 || true

echo ""
echo "5️⃣  Verificando que la base de datos esté saludable..."
DB_STATUS=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE ps db --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
if [ "$DB_STATUS" == "healthy" ]; then
    success "Base de datos está saludable"
else
    warning "Base de datos no está saludable. Esperando..."
    sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE up -d db
    sleep 5
fi

echo ""
echo "6️⃣  Verificando que Redis esté saludable..."
REDIS_STATUS=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE ps redis --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
if [ "$REDIS_STATUS" == "healthy" ]; then
    success "Redis está saludable"
else
    warning "Redis no está saludable. Esperando..."
    sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE up -d redis
    sleep 5
fi

echo ""
echo "7️⃣  Intentando iniciar el backend con logs en tiempo real..."
echo "=========================================="
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE up -d backend

echo ""
echo "8️⃣  Esperando 10 segundos para que el backend inicie..."
sleep 10

echo ""
echo "9️⃣  Verificando logs del backend nuevamente..."
echo "=========================================="
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE logs backend --tail=30

echo ""
echo "🔟 Verificando estado del contenedor del backend..."
BACKEND_STATUS=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE ps backend --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
BACKEND_HEALTH=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE ps backend --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

echo "Estado: $BACKEND_STATUS"
echo "Salud: $BACKEND_HEALTH"

if [ "$BACKEND_STATUS" == "running" ] && [ "$BACKEND_HEALTH" == "healthy" ]; then
    success "Backend está corriendo y saludable!"
    echo ""
    echo "🚀 Intentando iniciar el frontend..."
    sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE up -d frontend
else
    error "Backend no está saludable. Revisa los logs arriba para más detalles."
    echo ""
    echo "💡 SUGERENCIAS:"
    echo "   - Verifica que no haya errores de migraciones"
    echo "   - Verifica que el archivo docker/backend.env exista"
    echo "   - Verifica que la base de datos esté accesible"
    echo "   - Ejecuta manualmente: sudo docker exec -it ${PROJECT_NAME}-backend-1 bash"
    echo "   - Dentro del contenedor: python manage.py migrate"
    echo ""
    exit 1
fi

echo ""
echo "✅ Proceso completado. Revisa el estado final:"
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE ps

