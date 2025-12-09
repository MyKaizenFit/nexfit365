#!/bin/bash
# ============================================
# Script para gestionar entorno de DESARROLLO
# ============================================

set -e

ACTION=${1:-help}
COMPOSE_PROJECT_NAME=nexfit-dev
PROD_PROJECT_NAME=nexfit-pro

# Función para verificar que producción esté corriendo
check_production_status() {
  echo "🔍 Verificando estado de producción..."
  
  # Verificar contenedores de producción por múltiples patrones
  # Pueden usar "pro-", "nexfit-pro", o el nombre del proyecto
  PROD_CONTAINERS=$(docker ps --filter "name=pro-" --format "{{.Names}}" 2>/dev/null | head -1 || echo "")
  
  if [ -z "$PROD_CONTAINERS" ]; then
    # También verificar por proyecto de compose
    PROD_BACKEND=$(COMPOSE_PROJECT_NAME=$PROD_PROJECT_NAME docker compose -f docker-compose.prod.yml ps -q backend 2>/dev/null || echo "")
    if [ -z "$PROD_BACKEND" ]; then
      # Último intento: buscar cualquier contenedor que parezca de producción
      PROD_ANY=$(docker ps --format "{{.Names}}" 2>/dev/null | grep -E "(pro-|nexfit-pro|production)" | head -1 || echo "")
      if [ -z "$PROD_ANY" ]; then
        echo "⚠️  ADVERTENCIA: No se detectaron contenedores de producción corriendo."
        echo "   Esto es normal si producción no está activa, pero verifica que no se haya caído."
        read -p "¿Continuar con el inicio de desarrollo? (s/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
          echo "❌ Operación cancelada por el usuario."
          exit 1
        fi
      else
        echo "✅ Producción detectada: $PROD_ANY"
      fi
    else
      echo "✅ Producción detectada (backend activo)."
    fi
  else
    echo "✅ Producción detectada: $PROD_CONTAINERS"
  fi
  
  # Verificar que las redes de producción no se vean afectadas
  PROD_NETWORKS=$(docker network ls --filter "name=pro-" --format "{{.Name}}" 2>/dev/null | head -3 || echo "")
  if [ ! -z "$PROD_NETWORKS" ]; then
    echo "✅ Redes de producción detectadas (aisladas de desarrollo)."
  fi
}

case $ACTION in
  up|start)
    # Verificar producción antes de iniciar desarrollo
    check_production_status
    echo ""
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
    echo "⚠️  Verificando que no se afecte producción..."
    # Verificar que solo se detengan contenedores de dev
    DEV_CONTAINERS=$(COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f docker-compose.dev.yml ps -q 2>/dev/null || echo "")
    if [ ! -z "$DEV_CONTAINERS" ]; then
      echo "✅ Deteniendo solo contenedores de desarrollo..."
      COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f docker-compose.dev.yml down
      echo "✅ Desarrollo detenido. Producción no afectada."
    else
      echo "ℹ️  No hay contenedores de desarrollo corriendo."
    fi
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






