# ============================================
# Script para copiar BD de Producción a Desarrollo
# ============================================
# Este script:
# 1. Hace backup de la BD de producción (mykaizenfit)
# 2. Restaura el backup en la BD de desarrollo (mykaizenfit_dev)
# 3. Asegura que no se altere la BD de producción
#
# ⚠️ IMPORTANTE: Este script requiere que Docker Desktop esté corriendo
# y que los contenedores de producción y desarrollo estén activos

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Colores para output
function Write-Info {
    param([string]$Message)
    Write-Host "INFO: $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "OK: $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "WARNING: $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Blue
Write-Host "COPIAR BD DE PRODUCCION A DESARROLLO" -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue
Write-Host ""

# Verificar que Docker está corriendo
Write-Info "Verificando Docker..."
try {
    docker ps | Out-Null
    Write-Success "Docker está corriendo"
} catch {
    Write-Error "Docker Desktop no está corriendo. Por favor, inicia Docker Desktop primero."
    exit 1
}

# Configuración
$COMPOSE_PROD = "docker-compose.prod.yml"
$COMPOSE_DEV = "docker-compose.dev.yml"
$PROJECT_PROD = "nexfit-pro"
$PROJECT_DEV = "nexfit-dev"
$BACKUP_DIR = "./backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "$BACKUP_DIR/backup_prod_to_dev_${TIMESTAMP}.sql"

# Nombres de las bases de datos
$DB_PROD = "mykaizenfit"
$DB_DEV = "mykaizenfit_dev"
$DB_USER = "postgres"

# Verificar que los contenedores de producción están corriendo
Write-Info "Verificando contenedores de producción..."
$PROD_DB_CONTAINER = docker ps --filter "name=${PROJECT_PROD}-db" --format "{{.Names}}" | Select-Object -First 1

if (-not $PROD_DB_CONTAINER) {
    Write-Warning "No se encontró el contenedor de BD de producción."
    Write-Info "¿Está corriendo el entorno de producción?"
    Write-Info "Para iniciarlo: COMPOSE_PROJECT_NAME=$PROJECT_PROD docker compose -f $COMPOSE_PROD up -d"
    exit 1
}

Write-Success "Contenedor de producción encontrado: $PROD_DB_CONTAINER"

# Verificar que los contenedores de desarrollo están corriendo
Write-Info "Verificando contenedores de desarrollo..."
$DEV_DB_CONTAINER = docker ps --filter "name=${PROJECT_DEV}-db" --format "{{.Names}}" | Select-Object -First 1

if (-not $DEV_DB_CONTAINER) {
    Write-Warning "No se encontró el contenedor de BD de desarrollo."
    Write-Info "Iniciando entorno de desarrollo..."
    $env:COMPOSE_PROJECT_NAME = $PROJECT_DEV
    docker compose -f $COMPOSE_DEV up -d db
    Start-Sleep -Seconds 5
    $DEV_DB_CONTAINER = docker ps --filter "name=${PROJECT_DEV}-db" --format "{{.Names}}" | Select-Object -First 1
    if (-not $DEV_DB_CONTAINER) {
        Write-Error "No se pudo iniciar el contenedor de desarrollo"
        exit 1
    }
    Write-Success "Contenedor de desarrollo iniciado: $DEV_DB_CONTAINER"
} else {
    Write-Success "Contenedor de desarrollo encontrado: $DEV_DB_CONTAINER"
}

# Crear directorio de backups si no existe
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    Write-Success "Directorio de backups creado: $BACKUP_DIR"
}

# Confirmación (a menos que se use -Force)
if (-not $Force) {
    Write-Warning "ADVERTENCIA: Este proceso reemplazara TODOS los datos en la BD de desarrollo."
    Write-Warning "La BD de desarrollo actual sera eliminada y reemplazada con una copia de produccion."
    Write-Host ""
    $confirm = Read-Host "¿Deseas continuar? (escribe 'si' para confirmar)"
    if ($confirm -ne "si") {
        Write-Info "Operacion cancelada."
        exit 0
    }
}

# 1. Hacer backup de producción
Write-Info "Haciendo backup de la BD de producción ($DB_PROD)..."
try {
    docker exec $PROD_DB_CONTAINER pg_dump -U $DB_USER -F p $DB_PROD > $BACKUP_FILE
    if ($LASTEXITCODE -eq 0) {
        $backupSize = (Get-Item $BACKUP_FILE).Length / 1MB
        $backupSizeRounded = [math]::Round($backupSize, 2)
        Write-Success "Backup creado: $BACKUP_FILE ($backupSizeRounded MB)"
    } else {
        throw "Error al crear backup"
    }
} catch {
    Write-Error "Error al crear backup de producción: $_"
    exit 1
}

# 2. Detener backend de desarrollo (para evitar conexiones)
Write-Info "Deteniendo backend de desarrollo temporalmente..."
$DEV_BACKEND = docker ps --filter "name=${PROJECT_DEV}-backend" --format "{{.Names}}" | Select-Object -First 1
if ($DEV_BACKEND) {
    docker stop $DEV_BACKEND | Out-Null
    Write-Success "Backend de desarrollo detenido"
}

# 3. Eliminar y recrear la BD de desarrollo
Write-Info "Eliminando BD de desarrollo actual ($DB_DEV)..."
try {
    docker exec $DEV_DB_CONTAINER psql -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_DEV;" | Out-Null
    Write-Success "BD de desarrollo eliminada"
} catch {
    Write-Warning "No se pudo eliminar la BD (puede que no exista): $_"
}

Write-Info "Creando nueva BD de desarrollo ($DB_DEV)..."
try {
    docker exec $DEV_DB_CONTAINER psql -U $DB_USER -c "CREATE DATABASE $DB_DEV;" | Out-Null
    Write-Success "BD de desarrollo creada"
} catch {
    Write-Error "Error al crear BD de desarrollo: $_"
    exit 1
}

# 4. Restaurar backup en desarrollo
Write-Info "Restaurando backup en BD de desarrollo..."
try {
    Get-Content $BACKUP_FILE | docker exec -i $DEV_DB_CONTAINER psql -U $DB_USER -d $DB_DEV
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Backup restaurado en BD de desarrollo"
    } else {
        throw "Error al restaurar backup"
    }
} catch {
    Write-Error "Error al restaurar backup: $_"
    exit 1
}

# 5. Reiniciar backend de desarrollo
if ($DEV_BACKEND) {
    Write-Info "Reiniciando backend de desarrollo..."
    docker start $DEV_BACKEND | Out-Null
    Write-Success "Backend de desarrollo reiniciado"
}

# Resumen
Write-Host ""
Write-Success "========================================="
Write-Success "PROCESO COMPLETADO EXITOSAMENTE"
Write-Success "========================================="
Write-Host ""
Write-Info "Resumen:"
Write-Host "  - Backup de produccion: $BACKUP_FILE"
Write-Host "  - BD de desarrollo actualizada: $DB_DEV"
Write-Host "  - BD de produccion NO fue modificada: $DB_PROD"
Write-Host ""
Write-Info "Puedes acceder a:"
Write-Host "  - Frontend desarrollo: http://localhost:3001"
Write-Host "  - Backend desarrollo: http://localhost:8001/api"
Write-Host "  - Admin desarrollo: http://localhost:8001/admin"
Write-Host ""

