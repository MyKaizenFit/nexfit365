#!/bin/bash
# Script para desplegar la aplicación en producción
# Ejecutar como root: sudo su y luego ./deploy_production.sh

set -e

echo "=========================================="
echo "  DESPLIEGUE EN PRODUCCIÓN"
echo "  MyKaizenFit"
echo "=========================================="
echo ""

cd /srv/mykaizenfit/app

# Variables
COMPOSE_PROJECT_NAME=reposseparadosparaelhost
COMPOSE_FILE=docker-compose.prod.yml

# 1. Detener servicios existentes
echo "1. Deteniendo servicios existentes..."
docker compose -f $COMPOSE_FILE down || echo "   (No había servicios corriendo)"
echo ""

# 2. Construir imágenes
echo "2. Construyendo imágenes (esto puede tardar varios minutos)..."
echo "   ⏳ Por favor, espera..."
docker compose -f $COMPOSE_FILE build --no-cache
echo ""

# 3. Levantar servicios
echo "3. Levantando servicios..."
docker compose -f $COMPOSE_FILE up -d
echo ""

# 4. Esperar a que los servicios estén listos
echo "4. Esperando a que los servicios estén listos..."
sleep 10
echo ""

# 5. Verificar estado
echo "5. Verificando estado de los servicios..."
docker compose -f $COMPOSE_FILE ps
echo ""

# 6. Mostrar logs recientes
echo "6. Últimas líneas de logs del backend:"
docker compose -f $COMPOSE_FILE logs --tail=20 backend
echo ""

echo "7. Últimas líneas de logs del frontend:"
docker compose -f $COMPOSE_FILE logs --tail=20 frontend
echo ""

echo "=========================================="
echo "  DESPLIEGUE COMPLETADO"
echo "=========================================="
echo ""
echo "✅ Servicios desplegados"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  docker compose -f $COMPOSE_FILE logs -f"
echo ""
echo "Para verificar el estado:"
echo "  docker compose -f $COMPOSE_FILE ps"
echo ""
echo "La aplicación debería estar disponible en:"
echo "  Frontend: http://192.168.1.148:3000"
echo "  Backend:  http://192.168.1.148:8000"
echo ""


