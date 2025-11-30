#!/bin/bash

echo "🔄 Actualizando y Reconstruyendo Entorno de Desarrollo"
echo "======================================================="
echo ""

COMPOSE_PROJECT_NAME=nexfit-pro
COMPOSE_FILE=docker-compose.dev-clean.yml

echo "1️⃣ Sincronizando archivos desde producción..."
bash ./sincronizar_desde_produccion.sh > /dev/null 2>&1
echo "   ✅ Sincronización completada"
echo ""

echo "2️⃣ Deteniendo servicios actuales..."
sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE stop backend frontend 2>/dev/null || true
sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE rm -f backend frontend 2>/dev/null || true
echo "   ✅ Servicios detenidos"
echo ""

echo "3️⃣ Reconstruyendo backend (sin caché)..."
sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE build --no-cache backend
echo ""

echo "4️⃣ Reconstruyendo frontend (sin caché)..."
sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE build --no-cache frontend
echo ""

echo "5️⃣ Iniciando todos los servicios..."
sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE up -d
echo ""

echo "6️⃣ Esperando 60 segundos para que los servicios inicien..."
for i in {60..1}; do
    echo -ne "   Tiempo restante: ${i}s\r"
    sleep 1
done
echo -ne "   Tiempo restante: 0s  \n"
echo ""

echo "7️⃣ Verificando estado de los servicios..."
echo ""
echo "   BACKEND:"
BACKEND_NAME="${COMPOSE_PROJECT_NAME}-backend-1"
if sudo docker ps | grep -q "$BACKEND_NAME"; then
    STATUS=$(sudo docker inspect --format='{{.State.Health.Status}}' $BACKEND_NAME 2>/dev/null || echo "unknown")
    echo "      Estado: $(sudo docker ps --filter name=$BACKEND_NAME --format '{{.Status}}')"
    echo "      Health: $STATUS"
    
    if [ "$STATUS" = "healthy" ]; then
        echo "      ✅ Backend está HEALTHY!"
    else
        echo "      ⚠️  Backend aún no está healthy (esto es normal, puede tardar más)"
    fi
else
    echo "      ❌ Backend no está corriendo"
fi

echo ""
echo "   FRONTEND:"
FRONTEND_NAME="${COMPOSE_PROJECT_NAME}-frontend-1"
if sudo docker ps | grep -q "$FRONTEND_NAME"; then
    STATUS=$(sudo docker inspect --format='{{.State.Health.Status}}' $FRONTEND_NAME 2>/dev/null || echo "unknown")
    echo "      Estado: $(sudo docker ps --filter name=$FRONTEND_NAME --format '{{.Status}}')"
    echo "      Health: $STATUS"
    
    if [ "$STATUS" = "healthy" ]; then
        echo "      ✅ Frontend está HEALTHY!"
    else
        echo "      ⚠️  Frontend aún no está healthy (esto es normal, puede tardar más)"
    fi
else
    echo "      ❌ Frontend no está corriendo"
fi

echo ""
echo "✅ Proceso completado"
echo ""
echo "📊 URLs:"
echo "   Frontend: http://45.136.19.91:3001"
echo "   Backend:  http://45.136.19.91:8001"
echo ""
echo "📋 Para ver logs:"
echo "   Backend:  sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE logs -f backend"
echo "   Frontend: sudo docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE logs -f frontend"

