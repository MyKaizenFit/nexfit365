#!/bin/bash

echo "🔨 Reconstruyendo Backend con admin_views.py"
echo "=============================================="
echo ""

COMPOSE_PROJECT_NAME=nexfit-pro
COMPOSE_FILE=docker-compose.dev-clean.yml

echo "1️⃣ Verificando que admin_views.py existe..."
if [ -f "./backend/workouts/admin_views.py" ]; then
    echo "   ✅ Archivo admin_views.py encontrado"
    ls -lh ./backend/workouts/admin_views.py
else
    echo "   ❌ ERROR: admin_views.py NO existe"
    echo "   Copiando desde producción..."
    cp /srv/mykaizenfit/app/backend/workouts/admin_views.py ./backend/workouts/admin_views.py
    echo "   ✅ Archivo copiado"
fi
echo ""

echo "2️⃣ Deteniendo contenedor backend actual..."
sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE stop backend 2>/dev/null || true
sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE rm -f backend 2>/dev/null || true
echo "   ✅ Backend detenido"
echo ""

echo "3️⃣ Reconstruyendo imagen del backend (sin caché)..."
sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE build --no-cache backend
echo ""

echo "4️⃣ Iniciando backend..."
sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE up -d backend
echo ""

echo "5️⃣ Esperando 45 segundos para que el backend inicie..."
for i in {45..1}; do
    echo -ne "   Tiempo restante: ${i}s\r"
    sleep 1
done
echo -ne "   Tiempo restante: 0s  \n"
echo ""

echo "6️⃣ Verificando estado del backend..."
CONTAINER_NAME="${COMPOSE_PROJECT_NAME}-backend-1"
if sudo docker ps | grep -q "$CONTAINER_NAME"; then
    STATUS=$(sudo docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "unknown")
    echo "   Estado del contenedor: $(sudo docker ps --filter name=$CONTAINER_NAME --format '{{.Status}}')"
    echo "   Estado del healthcheck: $STATUS"
    
    if [ "$STATUS" = "healthy" ]; then
        echo "   ✅ Backend está HEALTHY!"
    else
        echo "   ⚠️ Backend aún no está healthy"
        echo ""
        echo "   Últimos logs:"
        sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE logs backend --tail 20
    fi
else
    echo "   ❌ Contenedor no está corriendo"
    echo ""
    echo "   Últimos logs de error:"
    sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE logs backend --tail 30
fi
echo ""

echo "✅ Reconstrucción completada"

