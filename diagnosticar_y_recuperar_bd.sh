#!/bin/bash
# Script para diagnosticar y recuperar la base de datos de desarrollo
# Busca backups anteriores a la carga de menús y permite restaurar

PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.prod.yml"
DB_NAME="mykaizenfit_dev"
BACKUP_DIR="/srv/mykaizenfit/pro/backups"

echo "🔍 DIAGNÓSTICO Y RECUPERACIÓN DE BASE DE DATOS"
echo "=============================================="
echo ""

cd /srv/mykaizenfit/pro

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
section() { echo -e "${CYAN}$1${NC}"; }

# 1. Verificar backups disponibles
echo "1️⃣  Verificando backups disponibles..."
echo "=========================================="

if [ ! -d "$BACKUP_DIR/daily" ]; then
    error "Directorio de backups diarios no encontrado: $BACKUP_DIR/daily"
    exit 1
fi

BACKUPS=($(ls -1t "$BACKUP_DIR/daily"/*.sql.gz 2>/dev/null | head -10))
if [ ${#BACKUPS[@]} -eq 0 ]; then
    error "No se encontraron backups diarios"
    exit 1
fi

info "Backups encontrados:"
for i in "${!BACKUPS[@]}"; do
    backup="${BACKUPS[$i]}"
    filename=$(basename "$backup")
    size=$(du -h "$backup" | cut -f1)
    date=$(echo "$filename" | grep -oE '[0-9]{8}' || echo "desconocida")
    if [ "$date" != "desconocida" ]; then
        formatted_date="${date:0:4}-${date:4:2}-${date:6:2}"
    else
        formatted_date="desconocida"
    fi
    echo "   $((i+1)). $filename ($size) - $formatted_date"
done
echo ""

# 2. Verificar estado actual de la BD
echo "2️⃣  Verificando estado actual de la base de datos..."
echo "=========================================="

# Verificar si el contenedor está corriendo
if COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE ps db 2>/dev/null | grep -q "Up"; then
    success "Contenedor de BD está corriendo"
    
    # Contar menús actuales
    MEAL_COUNT=$(COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "SELECT COUNT(*) FROM nutrition_defaultmeal;" 2>/dev/null | tr -d ' ' || echo "0")
    PLAN_COUNT=$(COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "SELECT COUNT(*) FROM nutrition_defaultnutritionplan;" 2>/dev/null | tr -d ' ' || echo "0")
    
    info "Estado actual de la BD:"
    echo "   - Menús (DefaultMeal): $MEAL_COUNT"
    echo "   - Planes nutricionales: $PLAN_COUNT"
    
    # Verificar menús huérfanos
    ORPHAN_MEALS=$(COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM nutrition_defaultmeal dm
        LEFT JOIN nutrition_defaultnutritionplan dnp ON dm.plan_id = dnp.id
        WHERE dnp.id IS NULL;
    " 2>/dev/null | tr -d ' ' || echo "0")
    
    if [ "$ORPHAN_MEALS" != "0" ]; then
        error "⚠️  Encontrados $ORPHAN_MEALS menús huérfanos (datos corruptos)"
        echo ""
        echo "📋 Esto indica que la base de datos tiene problemas de integridad"
        echo "   causados probablemente por la carga incorrecta de menús."
    else
        success "No hay menús huérfanos detectados"
    fi
    
else
    warning "Contenedor de BD no está corriendo"
    info "Para verificar la BD, primero levanta los servicios:"
    echo "   COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE up -d db"
fi
echo ""

# 3. Mostrar opciones de recuperación
echo "3️⃣  OPCIONES DE RECUPERACIÓN"
echo "=========================================="
echo ""
echo "Opción A: Restaurar desde backup más antiguo (antes de cargar menús)"
echo "Opción B: Eliminar solo los datos corruptos (menús huérfanos)"
echo "Opción C: Ver detalles de un backup específico"
echo "Opción D: Salir sin hacer cambios"
echo ""

read -p "Selecciona una opción (A/B/C/D): " option

case "$option" in
    A|a)
        echo ""
        section "🔄 RESTAURACIÓN DESDE BACKUP"
        echo "=========================================="
        echo ""
        
        # Mostrar backups más antiguos
        OLDEST_BACKUPS=($(ls -1t "$BACKUP_DIR/daily"/*.sql.gz 2>/dev/null | tail -5))
        if [ ${#OLDEST_BACKUPS[@]} -eq 0 ]; then
            error "No se encontraron backups antiguos"
            exit 1
        fi
        
        info "Backups más antiguos disponibles (probablemente anteriores a la carga de menús):"
        for i in "${!OLDEST_BACKUPS[@]}"; do
            backup="${OLDEST_BACKUPS[$i]}"
            filename=$(basename "$backup")
            size=$(du -h "$backup" | cut -f1)
            date=$(echo "$filename" | grep -oE '[0-9]{8}' || echo "desconocida")
            if [ "$date" != "desconocida" ]; then
                formatted_date="${date:0:4}-${date:4:2}-${date:6:2}"
            else
                formatted_date="desconocida"
            fi
            echo "   $((i+1)). $filename ($size) - $formatted_date"
        done
        echo ""
        
        read -p "Selecciona el número del backup a restaurar (1-${#OLDEST_BACKUPS[@]}): " backup_num
        
        if ! [[ "$backup_num" =~ ^[0-9]+$ ]] || [ "$backup_num" -lt 1 ] || [ "$backup_num" -gt ${#OLDEST_BACKUPS[@]} ]; then
            error "Número inválido"
            exit 1
        fi
        
        SELECTED_BACKUP="${OLDEST_BACKUPS[$((backup_num-1))]}"
        
        echo ""
        warning "⚠️  ATENCIÓN: Esta operación reemplazará TODA la base de datos actual"
        warning "   Se perderán todos los datos creados después del backup seleccionado"
        echo ""
        read -p "¿Estás seguro de que quieres continuar? (escribe 'SI' para confirmar): " confirm
        
        if [ "$confirm" != "SI" ]; then
            info "Operación cancelada"
            exit 0
        fi
        
        # Proceder con la restauración
        echo ""
        section "Iniciando restauración desde: $(basename "$SELECTED_BACKUP")"
        echo ""
        
        # Crear backup de seguridad del estado actual
        info "1. Creando backup de seguridad del estado actual..."
        CURRENT_BACKUP="/tmp/bd_dev_backup_antes_de_restaurar_$(date +%Y%m%d_%H%M%S).sql.gz"
        if COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db pg_dump -U postgres -F c -Z 9 "$DB_NAME" > "$CURRENT_BACKUP" 2>/dev/null; then
            success "Backup de seguridad creado: $CURRENT_BACKUP"
        else
            warning "No se pudo crear backup de seguridad (continuando de todas formas...)"
        fi
        echo ""
        
        # Parar backend
        info "2. Deteniendo backend..."
        COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE stop backend 2>/dev/null || true
        echo ""
        
        # Eliminar base de datos actual
        info "3. Eliminando base de datos actual..."
        COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
        
        # Crear nueva base de datos
        info "4. Creando nueva base de datos..."
        COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || {
            error "No se pudo crear la base de datos"
            exit 1
        }
        echo ""
        
        # Restaurar desde backup
        info "5. Restaurando desde backup..."
        echo "   Esto puede tardar varios minutos..."
        gunzip -c "$SELECTED_BACKUP" | COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d "$DB_NAME" 2>&1 | grep -v "ERROR" || {
            error "Error durante la restauración"
            echo ""
            info "Puedes restaurar el backup de seguridad desde: $CURRENT_BACKUP"
            exit 1
        }
        echo ""
        
        # Reiniciar backend
        info "6. Reiniciando backend..."
        COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE up -d backend 2>/dev/null || true
        echo ""
        
        success "✅ Restauración completada"
        echo ""
        info "La base de datos ha sido restaurada desde: $(basename "$SELECTED_BACKUP")"
        info "El backend se reiniciará automáticamente y aplicará las migraciones si es necesario"
        ;;
        
    B|b)
        echo ""
        section "🧹 LIMPIEZA DE DATOS CORRUPTOS"
        echo "=========================================="
        echo ""
        
        if ! COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE ps db 2>/dev/null | grep -q "Up"; then
            error "El contenedor de BD debe estar corriendo para esta operación"
            exit 1
        fi
        
        # Contar menús huérfanos
        ORPHAN_COUNT=$(COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -t -c "
            SELECT COUNT(*) FROM nutrition_defaultmeal dm
            LEFT JOIN nutrition_defaultnutritionplan dnp ON dm.plan_id = dnp.id
            WHERE dnp.id IS NULL;
        " 2>/dev/null | tr -d ' ' || echo "0")
        
        if [ "$ORPHAN_COUNT" = "0" ]; then
            success "No hay datos corruptos para limpiar"
            exit 0
        fi
        
        warning "Se encontraron $ORPHAN_COUNT menús huérfanos que serán eliminados"
        echo ""
        read -p "¿Continuar? (escribe 'SI' para confirmar): " confirm
        
        if [ "$confirm" != "SI" ]; then
            info "Operación cancelada"
            exit 0
        fi
        
        # Eliminar menús huérfanos
        info "Eliminando menús huérfanos..."
        COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d $DB_NAME -c "
            DELETE FROM nutrition_defaultmeal
            WHERE id IN (
                SELECT dm.id FROM nutrition_defaultmeal dm
                LEFT JOIN nutrition_defaultnutritionplan dnp ON dm.plan_id = dnp.id
                WHERE dnp.id IS NULL
            );
        " 2>/dev/null
        
        success "✅ Limpieza completada"
        ;;
        
    C|c)
        echo ""
        section "📋 DETALLES DE BACKUPS"
        echo "=========================================="
        echo ""
        
        for backup in "${BACKUPS[@]}"; do
            filename=$(basename "$backup")
            size=$(du -h "$backup" | cut -f1)
            date=$(echo "$filename" | grep -oE '[0-9]{8}' || echo "desconocida")
            
            echo "📦 $filename"
            echo "   Tamaño: $size"
            if [ "$date" != "desconocida" ]; then
                formatted_date="${date:0:4}-${date:4:2}-${date:6:2}"
                echo "   Fecha: $formatted_date"
            fi
            echo ""
        done
        ;;
        
    D|d)
        info "Operación cancelada"
        exit 0
        ;;
        
    *)
        error "Opción inválida"
        exit 1
        ;;
esac

echo ""
echo "📋 SIGUIENTE PASO:"
echo "   Verifica que el backend esté funcionando correctamente:"
echo "   COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE logs backend --tail=50"
echo ""
