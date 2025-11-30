#!/bin/bash
# Script para detener el entorno de DESARROLLO
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo "🛑 Deteniendo entorno de DESARROLLO..."
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down
echo "✅ Entorno de desarrollo detenido!"
