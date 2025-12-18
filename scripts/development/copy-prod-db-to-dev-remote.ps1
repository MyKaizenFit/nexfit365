# ============================================
# Script para copiar BD de Producción (Remota) a Desarrollo (Local)
# ============================================
# Este script:
# 1. Se conecta por SSH al servidor de producción
# 2. Hace backup de la BD de producción (mykaizenfit)
# 3. Descarga el backup a tu máquina local
# 4. Restaura el backup en la BD de desarrollo (mykaizenfit_dev)
# 5. Asegura que no se altere la BD de producción

param(
    [switch]$Force,
    [string]$ServerIP = "45.136.19.91",
    [string]$SSHUser = "root",
    [string]$ProjectPath = "/srv/mykaizenfit/pro"
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
Write-Host "COPIAR BD DE PRODUCCION (REMOTA) A DESARROLLO" -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue
Write-Host ""

# Verificar que Docker está corriendo localmente
Write-Info "Verificando Docker local..."
try {
    docker ps | Out-Null
    Write-Success "Docker local está corriendo"
} catch {
    Write-Error "Docker Desktop no está corriendo. Por favor, inicia Docker Desktop primero."
    exit 1
}

# Verificar que SSH está disponible
Write-Info "Verificando conexión SSH..."
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Error "SSH no está disponible. Por favor, instala OpenSSH o usa WSL."
    exit 1
}

# Configuración
$BACKUP_DIR = "./backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$REMOTE_BACKUP_FILE = "$ProjectPath/backup_prod_${TIMESTAMP}.sql"
$LOCAL_BACKUP_FILE = "$BACKUP_DIR/backup_prod_${TIMESTAMP}.sql"

# Nombres de las bases de datos
$DB_PROD = "mykaizenfit"
$DB_DEV = "mykaizenfit_dev"
$DB_USER = "postgres"

# Verificar que el contenedor de desarrollo está corriendo
Write-Info "Verificando contenedor de desarrollo local..."
$DEV_DB_CONTAINER = docker ps --filter "name=nexfit-dev-db" --format "{{.Names}}" | Select-Object -First 1

if (-not $DEV_DB_CONTAINER) {
    Write-Warning "No se encontró el contenedor de BD de desarrollo."
    Write-Info "Iniciando entorno de desarrollo..."
    $env:COMPOSE_PROJECT_NAME = "nexfit-dev"
    docker compose -f docker-compose.dev.yml up -d db
    Start-Sleep -Seconds 10
    $DEV_DB_CONTAINER = docker ps --filter "name=nexfit-dev-db" --format "{{.Names}}" | Select-Object -First 1
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
    Write-Info "Servidor: $SSHUser@$ServerIP"
    Write-Info "Ruta del proyecto: $ProjectPath"
    Write-Host ""
    $confirm = Read-Host "¿Deseas continuar? (escribe 'si' para confirmar)"
    if ($confirm -ne "si" -and $confirm -ne "Si" -and $confirm -ne "SI") {
        Write-Info "Operacion cancelada."
        exit 0
    }
}

# 1. Conectarse al servidor y hacer backup de producción
Write-Info "Conectándose al servidor de producción ($ServerIP)..."
Write-Warning "NOTA: Se te pedirá la contraseña SSH para conectarte al servidor"
Write-Info "Buscando contenedor de BD de producción..."

# Buscar el contenedor de BD en el servidor remoto
Write-Info "Ejecutando comando SSH (puede pedirte la contraseña)..."
$PROD_DB_CONTAINER_CMD = "docker ps --filter 'name=nexfit-pro-db' --format '{{.Names}}' | head -n 1"
try {
    $PROD_DB_CONTAINER = ssh "${SSHUser}@${ServerIP}" $PROD_DB_CONTAINER_CMD 2>&1
} catch {
    Write-Error "Error al conectar por SSH: $_"
    Write-Info "Verifica:"
    Write-Info "  - Que tengas acceso SSH al servidor"
    Write-Info "  - Que el usuario SSH sea correcto (actual: $SSHUser)"
    Write-Info "  - Que tengas la contraseña o clave SSH configurada"
    exit 1
}

if ($LASTEXITCODE -ne 0 -or -not $PROD_DB_CONTAINER -or $PROD_DB_CONTAINER -match "^\s*$") {
    # Intentar con otro nombre posible
    Write-Info "Intentando buscar contenedor con otro método..."
    $PROD_DB_CONTAINER_CMD = "docker ps --format '{{.Names}}' | grep -E '(db|postgres)' | head -n 1"
    $PROD_DB_CONTAINER = ssh "${SSHUser}@${ServerIP}" $PROD_DB_CONTAINER_CMD 2>&1
}

if (-not $PROD_DB_CONTAINER -or $PROD_DB_CONTAINER -match "error|Error|ERROR|^\s*$") {
    Write-Warning "No se pudo encontrar el contenedor de BD de producción automáticamente."
    Write-Info "Listando contenedores en el servidor..."
    ssh "${SSHUser}@${ServerIP}" "docker ps --format 'table {{.Names}}\t{{.Status}}'"
    $PROD_DB_CONTAINER = Read-Host "Por favor, introduce el nombre exacto del contenedor de BD de producción"
} else {
    $PROD_DB_CONTAINER = $PROD_DB_CONTAINER.Trim()
    Write-Success "Contenedor de producción encontrado: $PROD_DB_CONTAINER"
}

# Hacer backup en el servidor remoto
Write-Info "Haciendo backup de la BD de producción en el servidor..."
$backupCmd = "docker exec $PROD_DB_CONTAINER pg_dump -U $DB_USER -F p $DB_PROD > $REMOTE_BACKUP_FILE"
$backupResult = ssh "${SSHUser}@${ServerIP}" $backupCmd 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Error "Error al crear backup en el servidor: $backupResult"
    exit 1
}

# Verificar que el backup se creó
$checkBackupCmd = "test -f $REMOTE_BACKUP_FILE && echo 'OK' || echo 'FAIL'"
$backupExists = ssh "${SSHUser}@${ServerIP}" $checkBackupCmd 2>&1

if ($backupExists -ne "OK") {
    Write-Error "El backup no se creó correctamente en el servidor"
    exit 1
}

Write-Success "Backup creado en el servidor: $REMOTE_BACKUP_FILE"

# 2. Descargar el backup a la máquina local
Write-Info "Descargando backup del servidor..."
try {
    scp "${SSHUser}@${ServerIP}:${REMOTE_BACKUP_FILE}" $LOCAL_BACKUP_FILE
    if ($LASTEXITCODE -eq 0) {
        $backupSize = (Get-Item $LOCAL_BACKUP_FILE).Length / 1MB
        $backupSizeRounded = [math]::Round($backupSize, 2)
        Write-Success "Backup descargado: $LOCAL_BACKUP_FILE ($backupSizeRounded MB)"
    } else {
        throw "Error al descargar backup"
    }
} catch {
    Write-Error "Error al descargar backup: $_"
    exit 1
}

# 3. Limpiar backup del servidor remoto (opcional, comentado por seguridad)
# Write-Info "Eliminando backup del servidor remoto..."
# ssh "${SSHUser}@${ServerIP}" "rm $REMOTE_BACKUP_FILE"

# 4. Detener backend de desarrollo (para evitar conexiones)
Write-Info "Deteniendo backend de desarrollo temporalmente..."
$DEV_BACKEND = docker ps --filter "name=nexfit-dev-backend" --format "{{.Names}}" | Select-Object -First 1
if ($DEV_BACKEND) {
    docker stop $DEV_BACKEND | Out-Null
    Write-Success "Backend de desarrollo detenido"
}

# 5. Eliminar y recrear la BD de desarrollo
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

# 6. Restaurar backup en desarrollo
Write-Info "Restaurando backup en BD de desarrollo..."
Write-Info "Esto puede tardar varios minutos dependiendo del tamaño de la BD..."
try {
    Get-Content $LOCAL_BACKUP_FILE | docker exec -i $DEV_DB_CONTAINER psql -U $DB_USER -d $DB_DEV
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Backup restaurado en BD de desarrollo"
    } else {
        throw "Error al restaurar backup"
    }
} catch {
    Write-Error "Error al restaurar backup: $_"
    exit 1
}

# 7. Reiniciar backend de desarrollo
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
Write-Host "  - Servidor de produccion: $SSHUser@$ServerIP"
Write-Host "  - Backup descargado: $LOCAL_BACKUP_FILE"
Write-Host "  - BD de desarrollo actualizada: $DB_DEV"
Write-Host "  - BD de produccion NO fue modificada: $DB_PROD"
Write-Host ""
Write-Info "Puedes acceder a:"
Write-Host "  - Frontend desarrollo: http://localhost:3001"
Write-Host "  - Backend desarrollo: http://localhost:8001/api"
Write-Host "  - Admin desarrollo: http://localhost:8001/admin"
Write-Host ""

