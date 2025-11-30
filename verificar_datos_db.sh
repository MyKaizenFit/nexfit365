#!/bin/bash
# Script rápido para verificar si hay datos en la base de datos de desarrollo
# SIN detener el backend

echo "=========================================="
echo "  VERIFICANDO DATOS EN BASE DE DATOS DEV"
echo "=========================================="
echo ""

cd /srv/mykaizenfit/pro

# Verificar si el contenedor está corriendo
if ! sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps db 2>/dev/null | grep -q "Up"; then
    echo "⚠️  El contenedor de base de datos NO está corriendo"
    echo "   Levanta los servicios primero con:"
    echo "   sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d"
    exit 1
fi

echo "✓ Base de datos está corriendo"
echo ""

# Verificar si la base de datos existe
echo "1. Verificando si la base de datos 'mykaizenfit_dev' existe..."
DB_EXISTS=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw mykaizenfit_dev && echo "yes" || echo "no")

if [ "$DB_EXISTS" != "yes" ]; then
    echo "⚠️  La base de datos 'mykaizenfit_dev' NO existe"
    echo "   Necesitas ejecutar las migraciones primero"
    echo ""
    echo "   Ejecuta:"
    echo "   sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py migrate"
    exit 1
fi

echo "✓ Base de datos 'mykaizenfit_dev' existe"
echo ""

# Contar tablas
echo "2. Contando tablas..."
TABLE_COUNT=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

if [ -z "$TABLE_COUNT" ] || [ "$TABLE_COUNT" = "0" ]; then
    echo "⚠️  No hay tablas en la base de datos"
    echo "   Necesitas ejecutar las migraciones"
    echo ""
    echo "   Ejecuta:"
    echo "   sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py migrate"
    exit 1
fi

echo "✓ Hay $TABLE_COUNT tablas en la base de datos"
echo ""

# Contar registros en tablas principales (sin detener el backend)
echo "3. Contando registros en tablas principales..."
echo "=========================================="

# Usuarios
USERS=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT COUNT(*) FROM accounts_customuser;" 2>/dev/null | tr -d ' ' || echo "0")
if [ -n "$USERS" ] && [ "$USERS" != "0" ]; then
    echo "   👥 Usuarios: $USERS"
else
    echo "   👥 Usuarios: 0 (tabla no existe o vacía)"
    USERS=0
fi

# Ejercicios
EXERCISES=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT COUNT(*) FROM workouts_exercise;" 2>/dev/null | tr -d ' ' || echo "0")
if [ -n "$EXERCISES" ] && [ "$EXERCISES" != "0" ]; then
    echo "   💪 Ejercicios: $EXERCISES"
else
    echo "   💪 Ejercicios: 0 (tabla no existe o vacía)"
    EXERCISES=0
fi

# Recetas
RECIPES=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT COUNT(*) FROM nutrition_recipe;" 2>/dev/null | tr -d ' ' || echo "0")
if [ -n "$RECIPES" ] && [ "$RECIPES" != "0" ]; then
    echo "   🍽️  Recetas: $RECIPES"
else
    echo "   🍽️  Recetas: 0 (tabla no existe o vacía)"
    RECIPES=0
fi

# Migraciones aplicadas
MIGRATIONS=$(sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d mykaizenfit_dev -t -c "SELECT COUNT(*) FROM django_migrations;" 2>/dev/null | tr -d ' ' || echo "0")
if [ -n "$MIGRATIONS" ]; then
    echo "   📦 Migraciones aplicadas: $MIGRATIONS"
fi

echo ""
echo "=========================================="
echo "  RESUMEN"
echo "=========================================="

TOTAL=$((USERS + EXERCISES + RECIPES))
if [ "$TOTAL" -gt 0 ]; then
    echo "✅ Hay datos en la base de datos de desarrollo"
    echo "   Total de registros principales: $TOTAL"
else
    echo "⚠️  La base de datos está vacía (solo estructura, sin datos)"
    echo ""
    echo "   Si quieres copiar datos de producción, ejecuta:"
    echo "   sudo bash /srv/mykaizenfit/pro/verificar_y_copiar_datos.sh"
fi

echo ""
echo "⚠️  NOTA: El backend de desarrollo sigue corriendo (no se detuvo)"
echo ""
