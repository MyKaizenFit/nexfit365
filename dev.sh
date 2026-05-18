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

check_dev_db_target() {
  echo "🔍 Verificando que desarrollo usa la BD de producción..."

  DB_ENV=$(COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f docker-compose.dev.yml exec -T backend sh -lc 'echo "$DB_NAME|$DB_HOST|$DB_PORT"' 2>/dev/null || echo "")
  if [ -z "$DB_ENV" ]; then
    echo "❌ No se pudo leer configuración DB del backend en desarrollo."
    return 1
  fi

  DB_NAME_CURRENT=$(echo "$DB_ENV" | cut -d'|' -f1)
  DB_HOST_CURRENT=$(echo "$DB_ENV" | cut -d'|' -f2)

  if [ "$DB_NAME_CURRENT" != "mykaizenfit" ] || [ "$DB_HOST_CURRENT" != "nexfit-pro-db" ]; then
    echo "❌ Desarrollo NO está usando la BD de producción."
    echo "   Detectado: DB_NAME=$DB_NAME_CURRENT DB_HOST=$DB_HOST_CURRENT"
    return 1
  fi

  USER_COUNT=$(COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f docker-compose.dev.yml exec -T backend python manage.py shell -c "from django.contrib.auth import get_user_model; print(get_user_model().objects.count())" 2>/dev/null | tail -n 1 | tr -d '\r' || echo "0")
  if [ -z "$USER_COUNT" ] || [ "$USER_COUNT" = "0" ]; then
    echo "⚠️  Conteo de usuarios en backend es 0. Revisa conexión/credenciales antes de probar login."
    return 1
  fi

  echo "✅ Desarrollo conectado a BD de producción (usuarios detectados: $USER_COUNT)."
  return 0
}

remove_stray_local_db() {
  # Si quedó un db local antiguo, lo eliminamos para evitar confusión en pruebas.
  STRAY_DB_ID=$(docker ps -aq --filter "name=^nexfit-dev-db-1$" 2>/dev/null || true)
  if [ ! -z "$STRAY_DB_ID" ]; then
    echo "🧹 Eliminando contenedor db local residual (nexfit-dev-db-1)..."
    docker rm -f nexfit-dev-db-1 >/dev/null 2>&1 || true
  fi
}

case $ACTION in
  up|start)
    # Verificar producción antes de iniciar desarrollo
    check_production_status
    echo ""
    echo "🚀 Iniciando entorno de DESARROLLO..."
    remove_stray_local_db
    COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f docker-compose.dev.yml up -d --build
    if ! check_dev_db_target; then
      echo "❌ Verificación de BD falló."
      exit 1
    fi
    echo ""
    echo "✅ Desarrollo iniciado:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:8000"
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






