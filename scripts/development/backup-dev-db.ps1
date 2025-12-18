# ============================================
# Script de Backup Automático de BD de Desarrollo
# ============================================
# Este script:
# 1. Hace backup de la BD de desarrollo (mykaizenfit_dev)
# 2. Comprime el backup
# 3. Lo guarda en backups/dev/ con timestamp
# 4. Mantiene solo el backup más reciente (elimina anteriores)
# 5. Prepara el backup para Git

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
Write-Host "BACKUP AUTOMATICO BD DE DESARROLLO" -ForegroundColor Blue
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
        exit 1
    }
}

Write-Success "Contenedor encontrado: $DB_CONTAINER"

# Crear directorio de backups si no existe
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    Write-Success "Directorio de backups creado: $BACKUP_DIR"
}

# Generar nombre de backup
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE_SQL = "$BACKUP_DIR/mykaizenfit_dev_${TIMESTAMP}.sql"
$BACKUP_FILE_GZ = "$BACKUP_FILE_SQL.gz"

# Hacer backup
Write-Info "Creando backup de la BD de desarrollo..."
try {
    # Copiar el backup al contenedor temporalmente para comprimirlo
    docker exec $DB_CONTAINER pg_dump -U $DB_USER -F p $DB_NAME > $BACKUP_FILE_SQL
    
    if ($LASTEXITCODE -eq 0 -and (Test-Path $BACKUP_FILE_SQL)) {
        $backupSize = (Get-Item $BACKUP_FILE_SQL).Length / 1MB
        Write-Success "Backup SQL creado: $backupSize MB"
        
        # Comprimir backup
        Write-Info "Comprimiendo backup..."
        $inputFile = Get-Item $BACKUP_FILE_SQL
        $input = New-Object System.IO.FileStream $BACKUP_FILE_SQL, ([IO.FileMode]::Open), ([IO.FileAccess]::Read), ([IO.FileShare]::Read)
        $output = New-Object System.IO.FileStream($BACKUP_FILE_GZ, [IO.FileMode]::Create, [IO.FileAccess]::Write)
        $gzipStream = New-Object System.IO.Compression.GzipStream($output, [System.IO.Compression.CompressionMode]::Compress)
        $input.CopyTo($gzipStream)
        $gzipStream.Close()
        $output.Close()
        $input.Close()
        
        # Eliminar archivo SQL sin comprimir
        Remove-Item $BACKUP_FILE_SQL -Force
        
        $compressedSize = (Get-Item $BACKUP_FILE_GZ).Length / 1MB
        Write-Success "Backup comprimido: $compressedSize MB"
        
        # Crear archivo de referencia (último backup)
        $LATEST_BACKUP = "$BACKUP_DIR/latest_backup.txt"
        $BACKUP_FILE_NAME = "mykaizenfit_dev_${TIMESTAMP}.sql.gz"
        Set-Content -Path $LATEST_BACKUP -Value $BACKUP_FILE_NAME
        Write-Success "Archivo de referencia creado: $LATEST_BACKUP"
        
    } else {
        throw "Error al crear backup"
    }
} catch {
    Write-Error "Error al crear backup: $_"
    exit 1
}

# Eliminar backups antiguos (mantener solo el más reciente)
Write-Info "Limpiando backups antiguos..."
$oldBackups = Get-ChildItem $BACKUP_DIR -Filter "mykaizenfit_dev_*.sql.gz" | Where-Object { $_.Name -ne $BACKUP_FILE_NAME } | Sort-Object LastWriteTime -Descending
if ($oldBackups.Count -gt 0) {
    $oldBackups | Remove-Item -Force
    Write-Success "Eliminados $($oldBackups.Count) backups antiguos"
}

# Resumen
Write-Host ""
Write-Success "========================================="
Write-Success "BACKUP COMPLETADO EXITOSAMENTE"
Write-Success "========================================="
Write-Host ""
Write-Info "Backup guardado en: $BACKUP_FILE_GZ"
Write-Info "Tamaño: $compressedSize MB"
Write-Host ""
Write-Info "Para sincronizar con Git:"
Write-Host "  git add backups/dev/"
Write-Host "  git commit -m 'backup: actualizar BD de desarrollo'"
Write-Host "  git push"
Write-Host ""

