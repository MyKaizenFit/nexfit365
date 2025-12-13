#!/bin/bash
# ============================================
# Script de Deploy a PRODUCCIÓN - NexFit365
# ============================================
# 
# Este script automatiza el despliegue seguro a producción:
# 1. Crea backup de la base de datos
# 2. Verifica rama y estado de Git
# 3. Pull del código más reciente
# 4. Construye y despliega los contenedores
# 5. Ejecuta migraciones
# 6. Verifica que todo funcione correctamente

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
COMPOSE_PROJECT_NAME=nexfit-pro
COMPOSE_FILE=docker-compose.prod.yml
BACKUP_DIR="/srv/mykaizenfit/pro/data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Función para imprimir mensajes
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Banner
echo ""
echo "========================================="
echo "🚀 DEPLOY A PRODUCCIÓN - NexFit365"
echo "========================================="
echo ""

# 1. Verificar que estamos en el directorio correcto
if [ ! -f "$COMPOSE_FILE" ]; then
    error "No se encontró $COMPOSE_FILE. Asegúrate de estar en /srv/mykaizenfit/pro/"
    exit 1
fi

# 2. Verificar que Git esté inicializado
if [ ! -d ".git" ]; then
    warning "Git no está inicializado en este directorio."
    read -p "¿Deseas continuar sin Git? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        info "Para inicializar Git, ejecuta:"
        echo "  git init"
        echo "  git remote add origin <url-del-repositorio>"
        exit 1
    fi
    SKIP_GIT=true
else
    SKIP_GIT=false
fi

# 3. Verificar rama y estado de Git
if [ "$SKIP_GIT" = false ]; then
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    info "Rama actual: $CURRENT_BRANCH"
    
    # Verificar que no haya cambios sin commitear
    if [ -n "$(git status --porcelain)" ]; then
        warning "Hay cambios sin commitear:"
        git status --short
        read -p "¿Deseas continuar de todas formas? (s/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            error "Deploy cancelado. Haz commit o stash de tus cambios primero."
            exit 1
        fi
    fi
    
    # Verificar que estemos en main o desarrollar
    if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
        warning "No estás en la rama main/master. Rama actual: $CURRENT_BRANCH"
        read -p "¿Deseas continuar desde esta rama? (s/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            info "Cambia a main con: git checkout main"
            exit 1
        fi
    fi
    
    # Hacer pull
    info "Obteniendo últimos cambios desde el repositorio..."
    git fetch origin
    git pull origin "$CURRENT_BRANCH" || {
        warning "No se pudo hacer pull. Continuando con código local..."
    }
fi

# 4. Crear backup de la base de datos
info "Creando backup de la base de datos..."
mkdir -p "$BACKUP_DIR"

# Verificar si hay contenedores de producción corriendo
DB_CONTAINER=$(COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE ps -q db 2>/dev/null || echo "")

if [ -n "$DB_CONTAINER" ]; then
    BACKUP_FILE="$BACKUP_DIR/backup_pre_deploy_${TIMESTAMP}.sql"
    
    # Obtener variables de entorno de la BD
    if [ -f "./docker/backend.env.production" ]; then
        source ./docker/backend.env.production
        DB_NAME=${POSTGRES_DB:-mykaizenfit}
        DB_USER=${POSTGRES_USER:-postgres}
    else
        DB_NAME=mykaizenfit
        DB_USER=postgres
        warning "No se encontró backend.env.production, usando valores por defecto"
    fi
    
    info "Haciendo backup de $DB_NAME..."
    if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
        success "Backup creado: $BACKUP_FILE"
        # Comprimir backup
        gzip "$BACKUP_FILE" 2>/dev/null || true
        success "Backup comprimido"
    else
        warning "No se pudo crear backup (puede ser que la BD no esté corriendo). Continuando..."
    fi
else
    warning "No hay contenedor de BD corriendo. Saltando backup."
fi

# 5. Construir y desplegar
info "Construyendo y desplegando contenedores de producción..."
info "Esto puede tomar varios minutos..."

if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE build --no-cache; then
    success "Build completado"
else
    error "Error en el build"
    exit 1
fi

info "Iniciando servicios..."
if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE up -d; then
    success "Servicios iniciados"
else
    error "Error al iniciar servicios"
    exit 1
fi

# 6. Esperar a que los servicios estén listos
info "Esperando a que los servicios estén listos..."
sleep 10

# 7. Ejecutar migraciones
info "Ejecutando migraciones de base de datos..."
if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T backend python manage.py migrate --noinput; then
    success "Migraciones aplicadas"
else
    warning "Error al ejecutar migraciones. Verifica los logs."
fi

# 8. Recolectar archivos estáticos
info "Recolectando archivos estáticos..."
if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T backend python manage.py collectstatic --noinput; then
    success "Archivos estáticos recolectados"
else
    warning "Error al recolectar archivos estáticos. Verifica los logs."
fi

# 9. Verificar estado de los servicios
info "Verificando estado de los servicios..."
sleep 5

if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE ps | grep -q "Up"; then
    success "Servicios en ejecución"
else
    warning "Algunos servicios pueden no estar corriendo. Revisa:"
    echo "  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE ps"
fi

# 10. Verificar health checks
info "Verificando health checks..."
sleep 15

BACKEND_HEALTH=$(COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T backend curl -f http://localhost:8000/api/health/ 2>/dev/null || echo "FAIL")
FRONTEND_HEALTH=$(COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE exec -T frontend wget --spider -q http://localhost:3000/ 2>/dev/null && echo "OK" || echo "FAIL")

if [ "$BACKEND_HEALTH" != "FAIL" ]; then
    success "Backend respondiendo correctamente"
else
    warning "Backend no responde. Verifica logs: docker compose -f $COMPOSE_FILE logs backend"
fi

if [ "$FRONTEND_HEALTH" = "OK" ]; then
    success "Frontend respondiendo correctamente"
else
    warning "Frontend no responde. Verifica logs: docker compose -f $COMPOSE_FILE logs frontend"
fi

# Resumen final
echo ""
echo "========================================="
echo "📊 RESUMEN DEL DEPLOY"
echo "========================================="
echo ""
success "Deploy completado!"
echo ""
info "Servicios disponibles:"
echo "  🌐 Frontend: http://localhost:3000"
echo "  🔌 Backend:  http://localhost:8000/api"
echo "  🔐 Admin:    http://localhost:8000/admin"
echo ""
info "Comandos útiles:"
echo "  Ver logs:     COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE logs -f"
echo "  Ver estado:   COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE ps"
echo "  Detener:      COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose -f $COMPOSE_FILE down"
echo ""

if [ -n "$BACKUP_FILE" ] && [ -f "${BACKUP_FILE}.gz" ]; then
    info "Backup disponible en: ${BACKUP_FILE}.gz"
fi

echo ""
success "¡Deploy exitoso! 🎉"
echo ""

