#!/bin/bash
# Script optimizado para build del frontend sin colgar el servidor

set -e

echo "🔧 Limpiando contenedores y recursos Docker no utilizados..."
sudo docker system prune -f

echo "📊 Estado actual del sistema:"
free -h | head -2
echo ""

echo "🚀 Iniciando build del frontend con optimizaciones..."
echo "   - Memoria máxima Node.js: 1.5GB (configurado en Dockerfile)"
echo "   - Usando BuildKit para mejor rendimiento"
echo ""

# Habilitar BuildKit para builds más eficientes
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Limitar recursos del proceso de build usando systemd-run o nice/ionice
# Esto ayuda a que el build no consuma todos los recursos del sistema

echo "📦 Construyendo imagen del frontend..."
# Usar nice para dar menor prioridad al proceso de build
sudo nice -n 10 \
  COMPOSE_PROJECT_NAME=reposseparadosparaelhost \
  docker compose -f docker-compose.prod.yml build \
  --progress=plain \
  --no-cache \
  frontend

if [ $? -eq 0 ]; then
  echo "✅ Build completado exitosamente"
  echo "🚀 Levantando contenedor..."
  sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost \
    docker compose -f docker-compose.prod.yml up -d frontend
  
  echo "✨ Frontend desplegado correctamente"
  echo ""
  echo "📊 Ver estado:"
  echo "   sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml ps"
  echo ""
  echo "📋 Ver logs:"
  echo "   sudo COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml logs -f frontend"
else
  echo "❌ Build falló. Revisa los logs arriba."
  exit 1
fi

