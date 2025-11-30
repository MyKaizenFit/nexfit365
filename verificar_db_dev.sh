#!/bin/bash
# Script para verificar el contenido de la base de datos de desarrollo

echo "=========================================="
echo "  VERIFICANDO BASE DE DATOS DE DESARROLLO"
echo "=========================================="
echo ""

cd /srv/mykaizenfit/pro

# Verificar si el contenedor de DB está corriendo
echo "1. Verificando contenedor de base de datos..."
DB_STATUS=$(COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml ps db | grep -q "Up" && echo "running" || echo "stopped")

if [ "$DB_STATUS" != "running" ]; then
    echo "⚠️  El contenedor de base de datos NO está corriendo"
    echo "   Levanta los servicios primero con:"
    echo "   COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml up -d"
    exit 1
fi

echo "✓ Contenedor de base de datos está corriendo"
echo ""

# Conectar a la base de datos y verificar tablas
echo "2. Verificando tablas en la base de datos..."
echo "=========================================="

COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -c "\dt" 2>/dev/null || {
    echo "⚠️  No se pudo conectar a la base de datos"
    echo "   Puede que la base de datos no exista o no tenga tablas"
    echo ""
    echo "3. Verificando si la base de datos existe..."
    COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -l | grep mykaizenfit_dev || echo "   Base de datos 'mykaizenfit_dev' no existe"
    exit 1
}

echo ""
echo "3. Contando registros en tablas principales..."
echo "=========================================="

# Contar usuarios
echo "Usuarios:"
COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -c "SELECT COUNT(*) as total_usuarios FROM accounts_customuser;" 2>/dev/null || echo "   Tabla de usuarios no existe o no tiene datos"

# Contar ejercicios
echo ""
echo "Ejercicios:"
COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -c "SELECT COUNT(*) as total_ejercicios FROM workouts_exercise;" 2>/dev/null || echo "   Tabla de ejercicios no existe o no tiene datos"

# Contar recetas
echo ""
echo "Recetas:"
COMPOSE_PROJECT_NAME=reposseparadosparaelhost docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -c "SELECT COUNT(*) as total_recetas FROM nutrition_recipe;" 2>/dev/null || echo "   Tabla de recetas no existe o no tiene datos"

echo ""
echo "=========================================="
echo "  VERIFICACIÓN COMPLETA"
echo "=========================================="

