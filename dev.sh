#!/bin/bash
# ============================================
# Script para gestionar entorno de DESARROLLO
# ============================================

set -e

ACTION=${1:-help}
COMPOSE_PROJECT_NAME=nexfit-dev

case $ACTION in
  up|start)
    echo "🚀 Iniciando entorno de DESARROLLO..."
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f docker-compose.dev.yml up -d --build
    echo ""
    echo "✅ Desarrollo iniciado:"
    echo "   Frontend: http://localhost:3001"
    echo "   Backend:  http://localhost:8001"
    echo "   DB:       localhost:5434"
    ;;
    
  down|stop)
    echo "🛑 Deteniendo entorno de desarrollo..."
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f docker-compose.dev.yml down
    ;;
    
  logs)
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f docker-compose.dev.yml logs -f ${2:-}
    ;;
    
  restart)
    echo "🔄 Reiniciando ${2:-todos los servicios}..."
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f docker-compose.dev.yml restart ${2:-}
    ;;
    
  rebuild)
    echo "🔨 Reconstruyendo ${2:-todos los servicios}..."
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f docker-compose.dev.yml up -d --build ${2:-}
    ;;
    
  ps|status)
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f docker-compose.dev.yml ps
    ;;
    
  shell)
    SERVICE=${2:-backend}
    echo "📟 Entrando al shell de $SERVICE..."
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f docker-compose.dev.yml exec $SERVICE sh
    ;;
    
  migrate)
    echo "🔄 Ejecutando migraciones..."
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f docker-compose.dev.yml exec backend python manage.py migrate
    ;;
    
  *)
    echo "📋 Comandos disponibles:"
    echo ""
    echo "  ./dev.sh up        - Iniciar desarrollo"
    echo "  ./dev.sh down      - Detener desarrollo"
    echo "  ./dev.sh logs      - Ver logs (opcional: servicio)"
    echo "  ./dev.sh restart   - Reiniciar (opcional: servicio)"
    echo "  ./dev.sh rebuild   - Reconstruir (opcional: servicio)"
    echo "  ./dev.sh ps        - Ver estado"
    echo "  ./dev.sh shell     - Entrar al shell (opcional: servicio)"
    echo "  ./dev.sh migrate   - Ejecutar migraciones"
    echo ""
    echo "Ejemplos:"
    echo "  ./dev.sh logs backend"
    echo "  ./dev.sh rebuild frontend"
    echo "  ./dev.sh shell db"
    ;;
esac

