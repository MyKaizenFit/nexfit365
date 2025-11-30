#!/bin/bash

echo "🔍 Diagnóstico del Backend - Contenedor Unhealthy"
echo "=================================================="
echo ""

COMPOSE_PROJECT_NAME=nexfit-pro
COMPOSE_FILE=docker-compose.dev-clean.yml

echo "1️⃣ Estado del contenedor backend:"
sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE ps backend
echo ""

echo "2️⃣ Últimos logs del backend (últimas 50 líneas):"
sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE logs backend --tail 50
echo ""

echo "3️⃣ Intentando acceder al endpoint de health desde dentro del contenedor:"
CONTAINER_NAME="${COMPOSE_PROJECT_NAME}-backend-1"
if sudo docker ps | grep -q "$CONTAINER_NAME"; then
    echo "   Contenedor está corriendo, probando health endpoint..."
    sudo docker exec $CONTAINER_NAME curl -f http://localhost:8000/api/health/ || echo "   ❌ Health check falló"
else
    echo "   ⚠️ Contenedor no está corriendo"
fi
echo ""

echo "4️⃣ Verificando si el puerto 8000 está escuchando:"
if sudo docker ps | grep -q "$CONTAINER_NAME"; then
    sudo docker exec $CONTAINER_NAME netstat -tlnp | grep 8000 || echo "   ⚠️ Puerto 8000 no está escuchando"
else
    echo "   ⚠️ Contenedor no está corriendo"
fi
echo ""

echo "5️⃣ Verificando variables de entorno críticas:"
if sudo docker ps | grep -q "$CONTAINER_NAME"; then
    sudo docker exec $CONTAINER_NAME env | grep -E "DATABASE|REDIS|SECRET|DEBUG" | head -10
else
    echo "   ⚠️ Contenedor no está corriendo"
fi
echo ""

echo "6️⃣ Verificando archivos de configuración:"
if [ -f "./docker/backend.env" ]; then
    echo "   ✅ Archivo backend.env existe"
    echo "   Primeras líneas (sin mostrar valores sensibles):"
    head -5 ./docker/backend.env | sed 's/=.*/=***/'
else
    echo "   ❌ Archivo backend.env NO existe en ./docker/"
fi
echo ""

echo "✅ Diagnóstico completado"
echo ""
echo "💡 Próximos pasos sugeridos:"
echo "   - Si el contenedor no está corriendo: revisar logs de errores"
echo "   - Si el health check falla: verificar que gunicorn esté escuchando"
echo "   - Si hay errores de base de datos: verificar conexión y migraciones"

