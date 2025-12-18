# ============================================
# Script de Restauración de BD de Desarrollo desde Backup
# ============================================
# Este script:
# 1. Busca el backup más reciente en backups/dev/
# 2. Lo restaura en la BD de desarrollo
# 3. Se ejecuta automáticamente después de git pull

param(
    [string]$BackupFile = ""
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
Write-Host "RESTAURAR BD DE DESARROLLO DESDE BACKUP" -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue
Write-Host ""

# Configuración
$BACKUP_DIR = "./backups/dev"
$DB_NAME = "mykaizenfit_dev"
$DB_USER = "postgres"
$CONTAINER_NAME = "nexfit-dev-db-1"

# Verificar que Docker está corriendo
Write-Info "Verificando Docker..."
try {
    docker ps | Out-Null
    Write-Success "Docker está corriendo"
} catch {
    Write-Error "Docker Desktop no está corriendo"
    exit 1
}

# Verificar que el contenedor de BD está corriendo
Write-Info "Verificando contenedor de BD..."
$DB_CONTAINER = docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | Select-Object -First 1

if (-not $DB_CONTAINER) {
    Write-Warning "No se encontró el contenedor de BD de desarrollo."
    Write-Info "Intentando buscar contenedor..."
    $DB_CONTAINER = docker ps --filter "name=nexfit-dev-db" --format "{{.Names}}" | Select-Object -First 1
    if (-not $DB_CONTAINER) {
        Write-Error "No se pudo encontrar el contenedor de BD de desarrollo"
        Write-Info "Asegúrate de que el entorno de desarrollo esté corriendo:"
        Write-Host "  docker compose -f docker-compose.dev.yml up -d"
        exit 1
    }
}

Write-Success "Contenedor encontrado: $DB_CONTAINER"

# Buscar backup
if ($BackupFile -eq "") {
    # Buscar el backup más reciente
    $LATEST_BACKUP_FILE = "$BACKUP_DIR/latest_backup.txt"
    if (Test-Path $LATEST_BACKUP_FILE) {
        $backupFileName = Get-Content $LATEST_BACKUP_FILE -Raw
        $backupFileName = $backupFileName.Trim()
        $BackupFile = "$BACKUP_DIR/$backupFileName"
    } else {
        # Buscar el archivo más reciente
        $latestBackup = Get-ChildItem $BACKUP_DIR -Filter "mykaizenfit_dev_*.sql.gz" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latestBackup) {
            $BackupFile = $latestBackup.FullName
        }
    }
}

if (-not $BackupFile -or -not (Test-Path $BackupFile)) {
    Write-Error "No se encontró ningún backup en $BACKUP_DIR"
    Write-Info "Ejecuta primero: .\scripts\development\backup-dev-db.ps1"
    exit 1
}

Write-Success "Backup encontrado: $(Split-Path $BackupFile -Leaf)"

# Confirmación
Write-Warning "ADVERTENCIA: Este proceso reemplazará TODOS los datos en la BD de desarrollo."
Write-Warning "La BD de desarrollo actual será eliminada y reemplazada con el backup."
Write-Host ""
$confirm = Read-Host "¿Deseas continuar? (escribe 'si' para confirmar)"
if ($confirm -ne "si" -and $confirm -ne "Si" -and $confirm -ne "SI") {
    Write-Info "Operación cancelada."
    exit 0
}

# Detener backend
Write-Info "Deteniendo backend de desarrollo..."
$BACKEND_CONTAINER = docker ps --filter "name=nexfit-dev-backend" --format "{{.Names}}" | Select-Object -First 1
if ($BACKEND_CONTAINER) {
    docker stop $BACKEND_CONTAINER | Out-Null
    Write-Success "Backend detenido"
}

# Eliminar y recrear BD
Write-Info "Eliminando BD de desarrollo actual..."
docker exec $DB_CONTAINER psql -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>&1 | Out-Null

Write-Info "Creando nueva BD de desarrollo con codificación UTF-8..."
docker exec $DB_CONTAINER psql -U $DB_USER -c "CREATE DATABASE $DB_NAME WITH ENCODING 'UTF8' LC_COLLATE='en_US.utf8' LC_CTYPE='en_US.utf8' TEMPLATE template0;" 2>&1 | Out-Null
Write-Success "BD recreada"

# Descomprimir y restaurar backup
Write-Info "Descomprimiendo backup..."
$TEMP_SQL = "$env:TEMP/mykaizenfit_dev_restore_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

try {
    $input = New-Object System.IO.FileStream $BackupFile, ([IO.FileMode]::Open), ([IO.FileAccess]::Read), ([IO.FileShare]::Read)
    $gzipStream = New-Object System.IO.Compression.GzipStream($input, [System.IO.Compression.CompressionMode]::Decompress)
    $output = New-Object System.IO.FileStream($TEMP_SQL, [IO.FileMode]::Create)
    $gzipStream.CopyTo($output)
    $output.Close()
    $gzipStream.Close()
    $input.Close()
    
    Write-Success "Backup descomprimido"
    
    Write-Info "Restaurando backup en BD de desarrollo..."
    Write-Info "Esto puede tardar varios minutos..."
    
    # Copiar al contenedor y restaurar
    docker cp $TEMP_SQL ${DB_CONTAINER}:/tmp/restore.sql
    docker exec $DB_CONTAINER bash -c "export PGCLIENTENCODING=UTF8 && psql -U $DB_USER -d $DB_NAME -f /tmp/restore.sql" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Backup restaurado correctamente"
    } else {
        throw "Error al restaurar backup"
    }
    
    # Limpiar archivo temporal
    Remove-Item $TEMP_SQL -Force -ErrorAction SilentlyContinue
    docker exec $DB_CONTAINER rm /tmp/restore.sql 2>&1 | Out-Null
    
} catch {
    Write-Error "Error al restaurar backup: $_"
    if (Test-Path $TEMP_SQL) {
        Remove-Item $TEMP_SQL -Force -ErrorAction SilentlyContinue
    }
    exit 1
}

# Reiniciar backend
if ($BACKEND_CONTAINER) {
    Write-Info "Reiniciando backend de desarrollo..."
    docker start $BACKEND_CONTAINER | Out-Null
    Write-Success "Backend reiniciado"
}

# Resumen
Write-Host ""
Write-Success "========================================="
Write-Success "RESTAURACION COMPLETADA EXITOSAMENTE"
Write-Success "========================================="
Write-Host ""
Write-Info "BD de desarrollo restaurada desde: $(Split-Path $BackupFile -Leaf)"
Write-Host ""

