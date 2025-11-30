#!/bin/bash
# Script para reconstruir el frontend con las nuevas variables de entorno
# Uso: ./reconstruir_frontend.sh

set -e

echo "=========================================="
echo "  RECONSTRUYENDO FRONTEND"
echo "  MyKaizenFit"
echo "=========================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: No se encuentra docker-compose.prod.yml"
    echo "   Asegúrate de estar en el directorio /srv/mykaizenfit/app"
    exit 1
fi

# Verificar que el archivo de entorno existe
if [ ! -f "frontend/docker.env.production" ]; then
    echo "❌ Error: No se encuentra frontend/docker.env.production"
    exit 1
fi

# Mostrar la URL configurada
echo "📋 Verificando configuración..."
API_URL=$(grep "NEXT_PUBLIC_API_URL" frontend/docker.env.production | cut -d '=' -f2)
echo "   URL del backend configurada: $API_URL"
echo ""

# Detener el frontend
echo "1. Deteniendo el frontend..."
docker compose -f docker-compose.prod.yml stop frontend || echo "   (El frontend ya estaba detenido)"
echo ""

# Reconstruir el frontend sin caché
echo "2. Reconstruyendo el frontend (esto puede tardar varios minutos)..."
echo "   ⏳ Por favor, espera..."
docker compose -f docker-compose.prod.yml build --no-cache frontend

if [ $? -eq 0 ]; then
    echo "   ✅ Frontend reconstruido exitosamente"
else
    echo "   ❌ Error al reconstruir el frontend"
    exit 1
fi
echo ""

# Iniciar el frontend
echo "3. Iniciando el frontend..."
docker compose -f docker-compose.prod.yml up -d frontend

if [ $? -eq 0 ]; then
    echo "   ✅ Frontend iniciado"
else
    echo "   ❌ Error al iniciar el frontend"
    exit 1
fi
echo ""

# Esperar un momento para que el contenedor se inicie
echo "4. Esperando a que el frontend esté listo..."
sleep 5

# Verificar el estado
echo "5. Verificando estado del frontend..."
docker compose -f docker-compose.prod.yml ps frontend
echo ""

# Mostrar logs recientes
echo "6. Últimas líneas de los logs del frontend:"
echo "   (Presiona Ctrl+C para salir de los logs)"
echo ""
docker compose -f docker-compose.prod.yml logs --tail=20 frontend
echo ""

echo "=========================================="
echo "  ✅ RECONSTRUCCIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "El frontend debería estar disponible en:"
echo "  http://45.136.19.91:3000"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  docker compose -f docker-compose.prod.yml logs -f frontend"
echo ""
echo "Para verificar que la variable de entorno se cargó:"
echo "  docker compose -f docker-compose.prod.yml exec frontend printenv | grep NEXT_PUBLIC_API_URL"
echo ""

