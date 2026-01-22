#!/bin/bash
# Script para reparar migraciones de Django

set -e

PROJECT_DIR="/srv/mykaizenfit/pro"
COMPOSE_FILE="docker-compose.prod.yml"

echo "🔧 Iniciando reparación de migraciones..."

# Levantar solo DB y redis
cd "$PROJECT_DIR"
export COMPOSE_PROJECT_NAME=nexfit-pro
docker compose -f "$COMPOSE_FILE" up -d db redis

echo "⏳ Esperando a que DB esté lista..."
sleep 10

# Crear contenedor temporal para correr migraciones
echo "🚀 Ejecutando migraciones..."
docker compose -f "$COMPOSE_FILE" run --rm backend python manage.py migrate --noinput 2>&1 || {
    echo "⚠️  Primera pasada falló, intentando con --run-syncdb..."
    docker compose -f "$COMPOSE_FILE" run --rm backend python manage.py migrate --run-syncdb --noinput 2>&1
}

echo "✅ Migraciones completadas"

# Levantar backend y verificar
echo "🚀 Levantando backend..."
docker compose -f "$COMPOSE_FILE" up -d backend frontend

sleep 10
echo "✅ Sistema lista!"
docker ps | grep nexfit-pro
