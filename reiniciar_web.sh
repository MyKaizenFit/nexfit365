#!/bin/bash

# Script simple para reiniciar la web
PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.prod.yml"

cd /srv/mykaizenfit/pro

echo "🔄 REINICIANDO LA WEB..."
echo ""

echo "1. Deteniendo servicios..."
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE stop frontend backend

echo "2. Eliminando contenedores..."
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE rm -f frontend backend

echo "3. Iniciando servicios base (DB, Redis)..."
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE up -d db redis

echo "4. Esperando 5 segundos..."
sleep 5

echo "5. Iniciando backend..."
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE up -d backend

echo "6. Esperando 20 segundos para que el backend esté listo..."
sleep 20

echo "7. Iniciando frontend..."
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE up -d frontend

echo "8. Esperando 15 segundos para que el frontend inicie..."
sleep 15

echo ""
echo "✅ SERVICIOS REINICIADOS"
echo ""
echo "📊 Estado de los contenedores:"
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE ps

echo ""
echo "🌐 URLs de acceso:"
echo "   Frontend: http://45.136.19.91:3001"
echo "   Backend:  http://45.136.19.91:8001/api/health/"
echo ""
echo "📋 Para ver los logs:"
echo "   Frontend: sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE logs -f frontend"
echo "   Backend:  sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE logs -f backend"

