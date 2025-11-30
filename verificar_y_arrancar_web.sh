#!/bin/bash

# Script para verificar y arrancar la web en Docker
set -e

PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.prod.yml"

echo "🌐 VERIFICANDO Y ARRANCANDO LA WEB"
echo "==================================="
echo ""

cd /srv/mykaizenfit/pro

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "1️⃣  Verificando estado de contenedores..."
echo "=========================================="
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE ps

echo ""
echo "2️⃣  Verificando logs del backend..."
echo "=========================================="
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE logs backend --tail=20

echo ""
echo "3️⃣  Verificando logs del frontend..."
echo "=========================================="
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE logs frontend --tail=30

echo ""
echo "4️⃣  Verificando que los puertos estén escuchando..."
echo "=========================================="
info "Verificando puerto 3001 (frontend)..."
if sudo netstat -tlnp 2>/dev/null | grep -q ":3001"; then
    success "Puerto 3001 está escuchando"
    sudo netstat -tlnp | grep ":3001"
else
    warning "Puerto 3001 NO está escuchando"
fi

info "Verificando puerto 8001 (backend)..."
if sudo netstat -tlnp 2>/dev/null | grep -q ":8001"; then
    success "Puerto 8001 está escuchando"
    sudo netstat -tlnp | grep ":8001"
else
    warning "Puerto 8001 NO está escuchando"
fi

echo ""
echo "5️⃣  Verificando conectividad interna..."
echo "=========================================="
info "Verificando que el frontend pueda acceder al backend..."
sudo docker exec ${PROJECT_NAME}-frontend-1 wget -q --spider http://backend:8000/api/health/ 2>&1 || warning "Frontend no puede acceder al backend internamente"

echo ""
echo "6️⃣  Verificando firewall..."
echo "=========================================="
if command -v ufw &> /dev/null; then
    info "Estado del firewall UFW:"
    sudo ufw status | head -5
fi

if command -v firewall-cmd &> /dev/null; then
    info "Estado del firewall firewalld:"
    sudo firewall-cmd --list-all 2>&1 | head -10
fi

echo ""
echo "7️⃣  Intentando reiniciar los servicios..."
echo "=========================================="
read -p "¿Quieres reiniciar los servicios? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    info "Deteniendo servicios..."
    sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE stop frontend backend
    
    info "Eliminando contenedores..."
    sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE rm -f frontend backend
    
    info "Iniciando backend..."
    sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE up -d db redis
    
    echo "Esperando 5 segundos para que la DB esté lista..."
    sleep 5
    
    info "Iniciando backend..."
    sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE up -d backend
    
    echo "Esperando 15 segundos para que el backend esté listo..."
    sleep 15
    
    info "Iniciando frontend..."
    sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE up -d frontend
    
    echo "Esperando 10 segundos para que el frontend inicie..."
    sleep 10
    
    success "Servicios reiniciados"
fi

echo ""
echo "8️⃣  Estado final de los contenedores..."
echo "=========================================="
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE ps

echo ""
echo "9️⃣  Verificando acceso local..."
echo "=========================================="
info "Probando http://localhost:3001..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200\|301\|302"; then
    success "Frontend responde localmente"
else
    warning "Frontend NO responde localmente"
fi

info "Probando http://localhost:8001/api/health/..."
if curl -s http://localhost:8001/api/health/ | grep -q "ok"; then
    success "Backend responde localmente"
else
    warning "Backend NO responde localmente"
fi

echo ""
echo "🔟 Resumen y URLs de acceso..."
echo "=========================================="
success "URLs de acceso:"
echo "  - Frontend: http://45.136.19.91:3001"
echo "  - Backend API: http://45.136.19.91:8001"
echo "  - Health Check: http://45.136.19.91:8001/api/health/"
echo ""
info "Si no puedes acceder desde fuera:"
echo "  1. Verifica que el firewall permita los puertos 3001 y 8001"
echo "  2. Verifica que Docker esté exponiendo en 0.0.0.0 y no solo en 127.0.0.1"
echo "  3. Verifica la configuración del router/firewall del servidor"

echo ""
echo "📋 Comandos útiles:"
echo "  Ver logs del frontend: sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE logs -f frontend"
echo "  Ver logs del backend: sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE logs -f backend"
echo "  Reiniciar todo: sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE restart"

