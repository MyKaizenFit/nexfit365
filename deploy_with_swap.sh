#!/bin/bash
# Script para desplegar con swap temporal
# Ejecutar como root: sudo bash deploy_with_swap.sh

set -e

SWAP_FILE=/swapfile
SWAP_SIZE=4G

echo "=========================================="
echo "  DESPLIEGUE CON SWAP TEMPORAL"
echo "  MyKaizenFit"
echo "=========================================="
echo ""

cd /srv/mykaizenfit/app

# Verificar memoria disponible
echo "Memoria disponible antes del swap:"
free -h
echo ""

# Crear swap si no existe
if [ ! -f "$SWAP_FILE" ]; then
    echo "1. Creando swap de $SWAP_SIZE..."
    fallocate -l $SWAP_SIZE $SWAP_FILE 2>/dev/null || dd if=/dev/zero of=$SWAP_FILE bs=1M count=4096
    chmod 600 $SWAP_FILE
    mkswap $SWAP_FILE
    swapon $SWAP_FILE
    echo "   ✅ Swap activado"
else
    echo "1. Swap ya existe, activando..."
    swapon $SWAP_FILE 2>/dev/null || echo "   (Ya estaba activo)"
fi

echo ""
echo "Memoria disponible con swap:"
free -h
echo ""

# Variables
COMPOSE_PROJECT_NAME=reposseparadosparaelhost
COMPOSE_FILE=docker-compose.prod.yml

# 2. Detener servicios existentes
echo "2. Deteniendo servicios existentes..."
docker compose -f $COMPOSE_FILE down || echo "   (No había servicios corriendo)"
echo ""

# 3. Construir imágenes (solo frontend primero para probar)
echo "3. Construyendo frontend (esto puede tardar varios minutos)..."
echo "   ⏳ Por favor, espera..."
docker compose -f $COMPOSE_FILE build --no-cache frontend
echo ""

# 4. Construir backend
echo "4. Construyendo backend..."
docker compose -f $COMPOSE_FILE build --no-cache backend
echo ""

# 5. Levantar servicios
echo "5. Levantando servicios..."
docker compose -f $COMPOSE_FILE up -d
echo ""

# 6. Esperar a que los servicios estén listos
echo "6. Esperando a que los servicios estén listos..."
sleep 10
echo ""

# 7. Verificar estado
echo "7. Verificando estado de los servicios..."
docker compose -f $COMPOSE_FILE ps
echo ""

# 8. Desactivar swap (opcional, comentar si quieres mantenerlo)
echo "8. Desactivando swap temporal..."
swapoff $SWAP_FILE 2>/dev/null || echo "   (No se pudo desactivar, puedes hacerlo manualmente)"
echo ""

echo "=========================================="
echo "  DESPLIEGUE COMPLETADO"
echo "=========================================="
echo ""
echo "✅ Servicios desplegados"
echo ""
echo "Para eliminar el swap:"
echo "  sudo swapoff $SWAP_FILE && sudo rm $SWAP_FILE"
echo ""
echo "La aplicación debería estar disponible en:"
echo "  Frontend: http://192.168.1.148:3000"
echo "  Backend:  http://192.168.1.148:8000"
echo ""

