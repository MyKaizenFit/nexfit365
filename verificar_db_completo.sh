#!/bin/bash
# Script completo para verificar la base de datos de desarrollo
# Especialmente enfocado en problemas relacionados con menús

PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.prod.yml"
DB_NAME="mykaizenfit_dev"

echo "🔍 VERIFICACIÓN COMPLETA DE BASE DE DATOS - DEV"
echo "================================================"
echo ""

cd /srv/mykaizenfit/pro

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# 1. Verificar contenedor de BD
echo "1️⃣  Verificando contenedor de base de datos..."
if sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE ps db 2>/dev/null | grep -q "Up"; then
    success "Contenedor de BD está corriendo"
else
    error "Contenedor de BD NO está corriendo"
    exit 1
fi
echo ""

# 2. Verificar conexión
echo "2️⃣  Verificando conexión a la base de datos..."
DB_CHECK=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -c "SELECT 1;" 2>&1)
if echo "$DB_CHECK" | grep -q "1 row"; then
    success "Conexión exitosa a la base de datos"
else
    error "No se puede conectar a la base de datos"
    echo "$DB_CHECK"
    exit 1
fi
echo ""

# 3. Verificar tablas relacionadas con menús
echo "3️⃣  Verificando tablas relacionadas con menús..."
echo "=========================================="

# Tablas a verificar
TABLES=(
    "nutrition_defaultnutritionplan"
    "nutrition_defaultmeal"
    "nutrition_recipe"
    "nutrition_dailymealselection"
    "accounts_customuser"
)

for table in "${TABLES[@]}"; do
    EXISTS=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" 2>/dev/null | tr -d ' ')
    
    if [ "$EXISTS" = "t" ]; then
        COUNT=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
        success "$table: $COUNT registros"
    else
        error "$table: NO EXISTE"
    fi
done
echo ""

# 4. Verificar integridad de Foreign Keys (menús huérfanos)
echo "4️⃣  Verificando integridad de datos (Foreign Keys)..."
echo "=========================================="

# Menús sin plan (huérfanos)
ORPHAN_MEALS=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM nutrition_defaultmeal dm
    LEFT JOIN nutrition_defaultnutritionplan dnp ON dm.plan_id = dnp.id
    WHERE dnp.id IS NULL;
" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$ORPHAN_MEALS" != "0" ]; then
    error "Encontrados $ORPHAN_MEALS menús huérfanos (sin plan asociado)"
    
    # Mostrar algunos ejemplos
    echo ""
    info "Ejemplos de menús huérfanos:"
    sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -c "
        SELECT dm.id, dm.name, dm.plan_id 
        FROM nutrition_defaultmeal dm
        LEFT JOIN nutrition_defaultnutritionplan dnp ON dm.plan_id = dnp.id
        WHERE dnp.id IS NULL
        LIMIT 5;
    " 2>/dev/null
else
    success "No hay menús huérfanos"
fi

# Selecciones diarias con menús inválidos
INVALID_SELECTIONS=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM nutrition_dailymealselection dms
    LEFT JOIN nutrition_defaultmeal dm ON dms.selected_meal_id = dm.id
    WHERE dm.id IS NULL;
" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$INVALID_SELECTIONS" != "0" ]; then
    error "Encontradas $INVALID_SELECTIONS selecciones diarias con menús inválidos"
else
    success "No hay selecciones diarias inválidas"
fi
echo ""

# 5. Verificar datos específicos de menús
echo "5️⃣  Verificando datos de menús y planes..."
echo "=========================================="

# Planes nutricionales
PLAN_COUNT=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "SELECT COUNT(*) FROM nutrition_defaultnutritionplan;" 2>/dev/null | tr -d ' ')
info "Total de planes nutricionales: $PLAN_COUNT"

if [ "$PLAN_COUNT" -gt "0" ]; then
    # Planes con menús
    PLANS_WITH_MEALS=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "
        SELECT COUNT(DISTINCT plan_id) FROM nutrition_defaultmeal;
    " 2>/dev/null | tr -d ' ' || echo "0")
    
    info "Planes que tienen menús: $PLANS_WITH_MEALS"
    
    # Planes sin menús
    PLANS_WITHOUT_MEALS=$((PLAN_COUNT - PLANS_WITH_MEALS))
    if [ "$PLANS_WITHOUT_MEALS" -gt "0" ]; then
        warning "$PLANS_WITHOUT_MEALS planes sin menús asociados"
    fi
fi

# Total de menús
MEAL_COUNT=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "SELECT COUNT(*) FROM nutrition_defaultmeal;" 2>/dev/null | tr -d ' ')
info "Total de menús (DefaultMeal): $MEAL_COUNT"

# Recetas
RECIPE_COUNT=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "SELECT COUNT(*) FROM nutrition_recipe;" 2>/dev/null | tr -d ' ')
info "Total de recetas: $RECIPE_COUNT"
echo ""

# 6. Verificar problemas de datos (valores NULL en campos requeridos)
echo "6️⃣  Verificando datos inválidos..."
echo "=========================================="

# Menús sin nombre
NULL_NAMES=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM nutrition_defaultmeal WHERE name IS NULL OR name = '';
" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$NULL_NAMES" != "0" ]; then
    error "Encontrados $NULL_NAMES menús sin nombre"
else
    success "Todos los menús tienen nombre"
fi

# Menús sin plan_id
NULL_PLANS=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM nutrition_defaultmeal WHERE plan_id IS NULL;
" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$NULL_PLANS" != "0" ]; then
    error "Encontrados $NULL_PLANS menús sin plan_id (¡CRÍTICO!)"
else
    success "Todos los menús tienen plan_id"
fi
echo ""

# 7. Verificar migraciones
echo "7️⃣  Verificando migraciones aplicadas..."
echo "=========================================="
MIGRATION_COUNT=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "SELECT COUNT(*) FROM django_migrations;" 2>/dev/null | tr -d ' ')
info "Total de migraciones aplicadas: $MIGRATION_COUNT"

# Verificar migraciones de nutrition
NUTRITION_MIGS=$(sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM django_migrations WHERE app = 'nutrition';
" 2>/dev/null | tr -d ' ')
info "Migraciones de nutrition: $NUTRITION_MIGS"
echo ""

# 8. Resumen de problemas encontrados
echo "8️⃣  RESUMEN DE PROBLEMAS..."
echo "=========================================="

PROBLEMS=0

if [ "$ORPHAN_MEALS" != "0" ]; then
    error "❌ PROBLEMA: $ORPHAN_MEALS menús huérfanos"
    PROBLEMS=$((PROBLEMS + 1))
fi

if [ "$INVALID_SELECTIONS" != "0" ]; then
    error "❌ PROBLEMA: $INVALID_SELECTIONS selecciones inválidas"
    PROBLEMS=$((PROBLEMS + 1))
fi

if [ "$NULL_NAMES" != "0" ]; then
    error "❌ PROBLEMA: $NULL_NAMES menús sin nombre"
    PROBLEMS=$((PROBLEMS + 1))
fi

if [ "$NULL_PLANS" != "0" ]; then
    error "❌ PROBLEMA CRÍTICO: $NULL_PLANS menús sin plan_id"
    PROBLEMS=$((PROBLEMS + 1))
fi

if [ "$PROBLEMS" -eq "0" ]; then
    success "No se encontraron problemas de integridad de datos"
else
    warning "Se encontraron $PROBLEMS problema(s) que necesitan atención"
    echo ""
    echo "💡 SUGERENCIAS:"
    echo "   - Si hay menús huérfanos, elimínalos o asígnalos a un plan"
    echo "   - Si hay datos NULL en campos requeridos, corrígelos"
    echo "   - Verifica los logs del backend para más detalles"
fi

echo ""
echo "📊 RESUMEN FINAL:"
echo "   - Planes nutricionales: $PLAN_COUNT"
echo "   - Menús (DefaultMeal): $MEAL_COUNT"
echo "   - Recetas: $RECIPE_COUNT"
echo "   - Problemas encontrados: $PROBLEMS"
echo ""
echo "🔧 Para más detalles, ejecuta:"
echo "   sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec db psql -U postgres -d $DB_NAME"
