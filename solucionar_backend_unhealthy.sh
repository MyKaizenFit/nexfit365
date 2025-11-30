#!/bin/bash

echo "🔧 Solucionando Backend Unhealthy"
echo "===================================="
echo ""

COMPOSE_PROJECT_NAME=nexfit-pro
COMPOSE_FILE=docker-compose.dev-clean.yml
CONTAINER_NAME="${COMPOSE_PROJECT_NAME}-backend-1"

echo "1️⃣ Deteniendo contenedor backend si está corriendo..."
sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE stop backend 2>/dev/null || true
sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE rm -f backend 2>/dev/null || true
echo "   ✅ Backend detenido"
echo ""

echo "2️⃣ Verificando que la base de datos esté saludable..."
DB_STATUS=$(sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE ps db --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
if [ "$DB_STATUS" = "healthy" ]; then
    echo "   ✅ Base de datos está healthy"
else
    echo "   ⚠️ Base de datos NO está healthy, iniciando..."
    sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE up -d db
    echo "   Esperando 10 segundos para que la BD se inicie..."
    sleep 10
fi
echo ""

echo "3️⃣ Verificando Redis..."
REDIS_STATUS=$(sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE ps redis --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
if [ "$REDIS_STATUS" = "healthy" ]; then
    echo "   ✅ Redis está healthy"
else
    echo "   ⚠️ Redis NO está healthy, iniciando..."
    sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE up -d redis
    echo "   Esperando 5 segundos para que Redis se inicie..."
    sleep 5
fi
echo ""

echo "4️⃣ Iniciando backend con más tiempo para el healthcheck..."
sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE up -d backend
echo "   ✅ Backend iniciado"
echo ""

echo "5️⃣ Esperando 30 segundos para que el backend inicie completamente..."
for i in {30..1}; do
    echo -ne "   Tiempo restante: ${i}s\r"
    sleep 1
done
echo -ne "   Tiempo restante: 0s  \n"
echo ""

echo "6️⃣ Verificando estado del backend..."
if sudo docker ps | grep -q "$CONTAINER_NAME"; then
    echo "   ✅ Contenedor está corriendo"
    
    echo ""
    echo "   Probando endpoint de health directamente:"
    sudo docker exec $CONTAINER_NAME curl -f http://localhost:8000/api/health/ 2>/dev/null && echo "   ✅ Health endpoint responde" || echo "   ❌ Health endpoint NO responde"
    
    echo ""
    echo "   Verificando logs recientes:"
    sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE logs backend --tail 20
else
    echo "   ❌ Contenedor NO está corriendo"
    echo ""
    echo "   Últimos logs de error:"
    sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE logs backend --tail 30
fi
echo ""

echo "7️⃣ Estado final de todos los servicios:"
sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE ps
echo ""

echo "✅ Diagnóstico completado"
echo ""
echo "💡 Si el backend sigue unhealthy, revisa:"
echo "   - Los logs completos: sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE logs backend"
echo "   - La conexión a la BD: sudo docker exec ${COMPOSE_PROJECT_NAME}-db-1 psql -U postgres -d mykaizenfit_dev -c 'SELECT 1;'"
echo "   - El archivo backend.env: cat ./docker/backend.env"

