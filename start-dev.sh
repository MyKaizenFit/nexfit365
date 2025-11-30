#!/bin/bash
# Script para iniciar el entorno de DESARROLLO
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo "🚀 Iniciando entorno de DESARROLLO..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d
sleep 10
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps
echo "✅ Entorno de desarrollo iniciado!"
echo "📍 URLs: Frontend http://localhost:3001 | Backend http://localhost:8001/api"
