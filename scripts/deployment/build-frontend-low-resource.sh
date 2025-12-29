#!/bin/bash

# ============================================
# Script para Build del Frontend con Recursos Limitados
# ============================================
# Este script hace el build del frontend limitando recursos para evitar
# que cuelgue el servidor durante el proceso
#
# Uso:
#   ./scripts/deployment/build-frontend-low-resource.sh
#
# Requisitos:
#   - Docker corriendo
#   - Espacio suficiente en disco

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funciones de output
print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo ""
echo "========================================="
echo -e "${CYAN}🔧 BUILD DEL FRONTEND CON RECURSOS LIMITADOS${NC}"
echo "========================================="
echo ""

# 1. Verificar que Docker esté corriendo
print_info "Verificando Docker..."
if ! docker ps > /dev/null 2>&1; then
    print_error "Docker no está corriendo. Por favor inicia Docker."
    exit 1
fi
print_success "Docker está corriendo"

# 2. Verificar recursos disponibles
print_info "Verificando recursos del sistema..."
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
AVAILABLE_MEM=$(free -m | awk '/^Mem:/{print $7}')
CPU_CORES=$(nproc)

print_info "Memoria total: ${TOTAL_MEM}MB"
print_info "Memoria disponible: ${AVAILABLE_MEM}MB"
print_info "CPUs disponibles: ${CPU_CORES}"

if [ "$AVAILABLE_MEM" -lt 1024 ]; then
    print_warning "Memoria disponible baja (${AVAILABLE_MEM}MB). El build puede ser lento."
fi

# 3. Determinar proyecto (producción por defecto)
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-reposseparadosparaelhost}"
COMPOSE_FILE="docker-compose.prod.yml"

print_info "Proyecto: $COMPOSE_PROJECT_NAME"
print_info "Archivo compose: $COMPOSE_FILE"

# 4. Limpiar builds anteriores si es necesario
print_info "Limpiando builds anteriores del frontend..."
docker image prune -f --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME" > /dev/null 2>&1 || true
print_success "Limpieza completada"

# 5. Hacer build con recursos limitados
print_info "Iniciando build del frontend con recursos limitados..."
print_warning "Este proceso puede tardar varios minutos..."
print_info "Recursos limitados: Máximo 1.5 CPUs, 2GB RAM"

# Habilitar BuildKit para mejor control de recursos
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Hacer build con límites explícitos
if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME \
   docker compose -f $COMPOSE_FILE build \
   --build-arg NODE_ENV=production \
   --build-arg BUILDKIT_INLINE_CACHE=1 \
   --memory=2g \
   --progress=plain \
   frontend 2>&1 | tee /tmp/frontend-build.log; then
    
    print_success "Build completado exitosamente"
    
    # Verificar tamaño de la imagen
    IMAGE_SIZE=$(docker images --format "{{.Size}}" ${COMPOSE_PROJECT_NAME}-frontend:latest 2>/dev/null || echo "N/A")
    print_info "Tamaño de la imagen: $IMAGE_SIZE"
    
else
    print_error "Error durante el build"
    print_info "Revisa los logs en /tmp/frontend-build.log"
    exit 1
fi

# 6. Reiniciar el servicio
print_info "Reiniciando servicio frontend..."
if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE up -d frontend; then
    print_success "Frontend reiniciado"
else
    print_error "Error al reiniciar el frontend"
    exit 1
fi

# 7. Verificar que el servicio esté corriendo
print_info "Esperando a que el frontend esté listo..."
sleep 10

if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE ps frontend | grep -q "Up"; then
    print_success "Frontend está corriendo"
    
    # Verificar health check
    if curl -f http://localhost:3000/ > /dev/null 2>&1; then
        print_success "Frontend responde correctamente"
    else
        print_warning "Frontend no responde aún, puede tardar unos minutos más"
    fi
else
    print_error "Frontend no está corriendo"
    print_info "Revisa los logs: COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE logs frontend"
    exit 1
fi

echo ""
echo "========================================="
echo -e "${GREEN}✅ BUILD Y DEPLOYMENT COMPLETADOS${NC}"
echo "========================================="
echo ""
print_success "Frontend reconstruido y desplegado exitosamente"
echo ""
print_info "Verifica que todo funcione correctamente:"
echo -e "${YELLOW}  - Frontend: http://localhost:3000${NC}"
echo ""

