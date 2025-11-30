#!/bin/bash
# Script para verificar el estado de la base de datos y contenedores
# Uso: ./verificar_base_datos.sh

set -e

echo "=========================================="
echo "  VERIFICACIÓN DE BASE DE DATOS"
echo "  MyKaizenFit"
echo "=========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar Docker
echo "1. Verificando Docker..."
if command_exists docker; then
    echo -e "${GREEN}✓${NC} Docker está instalado"
    if docker ps >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Docker está funcionando"
    else
        echo -e "${RED}✗${NC} Docker no está funcionando o no tienes permisos"
        echo "   Intenta: sudo docker ps"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} Docker no está instalado"
    exit 1
fi

# Verificar Docker Compose
echo ""
echo "2. Verificando Docker Compose..."
if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker Compose está disponible"
else
    echo -e "${RED}✗${NC} Docker Compose no está disponible"
    exit 1
fi

# Verificar contenedores
echo ""
echo "3. Verificando contenedores..."
COMPOSE_CMD="docker compose"
if ! $COMPOSE_CMD ps >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
fi

CONTAINERS=$($COMPOSE_CMD ps --format json 2>/dev/null | jq -r '.[] | select(.State == "running") | .Service' 2>/dev/null || $COMPOSE_CMD ps --services 2>/dev/null | grep -v "^$" || echo "")

if [ -z "$CONTAINERS" ]; then
    echo -e "${YELLOW}⚠${NC} No se encontraron contenedores corriendo"
    echo "   Intenta: docker compose up -d"
else
    echo -e "${GREEN}✓${NC} Contenedores encontrados:"
    echo "$CONTAINERS" | while read -r container; do
        if [ ! -z "$container" ]; then
            echo "   - $container"
        fi
    done
fi

# Verificar contenedor de base de datos
echo ""
echo "4. Verificando contenedor de base de datos..."
DB_RUNNING=$($COMPOSE_CMD ps db 2>/dev/null | grep -q "Up" && echo "yes" || echo "no")

if [ "$DB_RUNNING" = "yes" ]; then
    echo -e "${GREEN}✓${NC} Contenedor 'db' está corriendo"
    
    # Verificar conexión
    echo ""
    echo "5. Verificando conexión a la base de datos..."
    if $COMPOSE_CMD exec -T db pg_isready -U postgres >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} PostgreSQL está listo y aceptando conexiones"
    else
        echo -e "${RED}✗${NC} PostgreSQL no está respondiendo"
    fi
    
    # Verificar base de datos
    echo ""
    echo "6. Verificando base de datos 'mykaizenfit'..."
    DB_EXISTS=$($COMPOSE_CMD exec -T db psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw mykaizenfit && echo "yes" || echo "no")
    
    if [ "$DB_EXISTS" = "yes" ]; then
        echo -e "${GREEN}✓${NC} Base de datos 'mykaizenfit' existe"
        
        # Contar tablas
        TABLE_COUNT=$($COMPOSE_CMD exec -T db psql -U postgres -d mykaizenfit -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
        echo "   Tablas encontradas: $TABLE_COUNT"
        
        # Verificar migraciones
        echo ""
        echo "7. Verificando migraciones de Django..."
        if $COMPOSE_CMD exec -T backend python manage.py showmigrations --plan 2>/dev/null | grep -q "\[ \]"; then
            PENDING=$($COMPOSE_CMD exec -T backend python manage.py showmigrations --plan 2>/dev/null | grep -c "\[ \]" || echo "0")
            echo -e "${YELLOW}⚠${NC} Hay $PENDING migraciones pendientes"
            echo "   Ejecuta: docker compose exec backend python manage.py migrate"
        else
            echo -e "${GREEN}✓${NC} Todas las migraciones están aplicadas"
        fi
    else
        echo -e "${RED}✗${NC} Base de datos 'mykaizenfit' no existe"
        echo "   Crea la base de datos o ejecuta las migraciones"
    fi
else
    echo -e "${RED}✗${NC} Contenedor 'db' no está corriendo"
    echo "   Intenta: docker compose up -d db"
fi

# Verificar contenedor backend
echo ""
echo "8. Verificando contenedor backend..."
BACKEND_RUNNING=$($COMPOSE_CMD ps backend 2>/dev/null | grep -q "Up" && echo "yes" || echo "no")

if [ "$BACKEND_RUNNING" = "yes" ]; then
    echo -e "${GREEN}✓${NC} Contenedor 'backend' está corriendo"
    
    # Verificar healthcheck
    echo ""
    echo "9. Verificando healthcheck del backend..."
    if $COMPOSE_CMD exec -T backend curl -f http://localhost:8000/api/health/ >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend responde correctamente"
    else
        echo -e "${YELLOW}⚠${NC} Backend no responde al healthcheck"
        echo "   Revisa los logs: docker compose logs backend"
    fi
else
    echo -e "${RED}✗${NC} Contenedor 'backend' no está corriendo"
    echo "   Intenta: docker compose up -d backend"
fi

# Resumen
echo ""
echo "=========================================="
echo "  RESUMEN"
echo "=========================================="

if [ "$DB_RUNNING" = "yes" ] && [ "$DB_EXISTS" = "yes" ] && [ "$BACKEND_RUNNING" = "yes" ]; then
    echo -e "${GREEN}✓${NC} Sistema básico funcionando"
    echo ""
    echo "Para ver más detalles, ejecuta:"
    echo "  docker compose exec backend python check_database.py"
    echo ""
    echo "O conecta directamente a la base de datos:"
    echo "  docker compose exec db psql -U postgres -d mykaizenfit"
else
    echo -e "${YELLOW}⚠${NC} Hay problemas que resolver"
    echo ""
    echo "Revisa los mensajes anteriores para más detalles"
fi

echo "=========================================="

