# ============================================
# Script para Importar Base de Datos en Producción
# ============================================
# Este script importa una base de datos exportada de desarrollo a producción
#
# Uso:
#   .\scripts\deployment\import-to-prod.ps1 -BackupFile ".\backups\dev_database_export_20241220_120000.sql.gz"
#
# ⚠️ ADVERTENCIA: Este script reemplazará completamente la base de datos de producción
#
# Requisitos:
#   - Docker Desktop corriendo
#   - Contenedor de producción activo
#   - Archivo de backup válido

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    
    [string]$ComposeProjectName = "nexfit-pro",
    [string]$ComposeFile = "docker-compose.prod.yml"
)

$ErrorActionPreference = "Stop"

# Colores para output
function Write-Info {
    Write-Host "ℹ️  $args" -ForegroundColor Cyan
}

function Write-Success {
    Write-Host "✅ $args" -ForegroundColor Green
}

function Write-Warning {
    Write-Host "⚠️  $args" -ForegroundColor Yellow
}

function Write-Error {
    Write-Host "❌ $args" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Red
Write-Host "⚠️  IMPORTAR BASE DE DATOS A PRODUCCIÓN" -ForegroundColor Red
Write-Host "=========================================" -ForegroundColor Red
Write-Host ""
Write-Warning "ADVERTENCIA: Este proceso reemplazará completamente la base de datos de producción."
Write-Host ""

# Confirmación
$confirmation = Read-Host "¿Estás seguro de que deseas continuar? (escribe 'SI' para confirmar)"
if ($confirmation -ne "SI") {
    Write-Info "Operación cancelada."
    exit 0
}

# 1. Verificar que el archivo existe
Write-Info "Verificando archivo de backup..."
if (-not (Test-Path $BackupFile)) {
    Write-Error "El archivo de backup no existe: $BackupFile"
    exit 1
}
Write-Success "Archivo encontrado: $BackupFile"

# 2. Verificar que Docker esté corriendo
Write-Info "Verificando Docker..."
try {
    docker ps | Out-Null
    Write-Success "Docker está corriendo"
} catch {
    Write-Error "Docker no está corriendo. Por favor inicia Docker Desktop."
    exit 1
}

# 3. Verificar que el contenedor de BD de producción esté corriendo
Write-Info "Verificando contenedor de base de datos de producción..."
$env:COMPOSE_PROJECT_NAME = $ComposeProjectName
$dbContainer = docker compose -f $ComposeFile ps -q db 2>$null

if (-not $dbContainer) {
    Write-Error "No se encontró contenedor de base de datos de producción."
    Write-Info "Asegúrate de que los servicios de producción estén corriendo:"
    Write-Host "  `$env:COMPOSE_PROJECT_NAME=$ComposeProjectName; docker compose -f $ComposeFile up -d db" -ForegroundColor Yellow
    exit 1
}

Write-Success "Contenedor encontrado: $dbContainer"

# 4. Obtener variables de entorno de producción
Write-Info "Obteniendo configuración de base de datos de producción..."

$DB_NAME = "mykaizenfit"
$DB_USER = "postgres"

if (Test-Path ".\docker\backend.env.production") {
    $envContent = Get-Content ".\docker\backend.env.production" -Raw
    if ($envContent -match "POSTGRES_DB=(\S+)") {
        $DB_NAME = $matches[1]
    }
    if ($envContent -match "POSTGRES_USER=(\S+)") {
        $DB_USER = $matches[1]
    }
    Write-Success "Configuración leída desde backend.env.production"
} else {
    Write-Warning "No se encontró backend.env.production, usando valores por defecto"
}

Write-Info "Base de datos: $DB_NAME"
Write-Info "Usuario: $DB_USER"

# 5. Crear backup de la BD actual de producción
Write-Info "Creando backup de la base de datos actual de producción..."
$backupDir = ".\backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$prodBackupFile = Join-Path $backupDir "prod_backup_before_import_$timestamp.sql"

try {
    docker exec $dbContainer pg_dump -U $DB_USER -d $DB_NAME --clean --if-exists > $prodBackupFile 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Backup de producción creado: $prodBackupFile"
    } else {
        Write-Warning "No se pudo crear backup de producción, pero continuando..."
    }
} catch {
    Write-Warning "Error al crear backup de producción: $_"
}

# 6. Detener servicios que usan la BD
Write-Info "Deteniendo servicios que usan la base de datos..."
docker compose -f $ComposeFile stop backend 2>$null | Out-Null
Write-Success "Servicios detenidos"

# 7. Descomprimir archivo si es necesario
Write-Info "Preparando archivo de importación..."
$tempFile = $BackupFile

if ($BackupFile.EndsWith(".gz")) {
    Write-Info "Descomprimiendo archivo..."
    $tempFile = $BackupFile -replace "\.gz$", ""
    try {
        if (Get-Command gzip -ErrorAction SilentlyContinue) {
            gzip -d -c $BackupFile > $tempFile
        } else {
            Write-Error "gzip no está disponible. Por favor descomprime el archivo manualmente."
            exit 1
        }
    } catch {
        Write-Error "Error al descomprimir: $_"
        exit 1
    }
} elseif ($BackupFile.EndsWith(".zip")) {
    Write-Info "Extrayendo archivo ZIP..."
    $tempFile = $BackupFile -replace "\.zip$", ".sql"
    Expand-Archive -Path $BackupFile -DestinationPath (Split-Path $tempFile) -Force
}

# 8. Eliminar y recrear la base de datos
Write-Info "Eliminando base de datos existente..."
try {
    docker exec $dbContainer psql -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>&1 | Out-Null
    Write-Success "Base de datos eliminada"
    
    Write-Info "Creando nueva base de datos..."
    docker exec $dbContainer psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" 2>&1 | Out-Null
    Write-Success "Base de datos creada"
} catch {
    Write-Error "Error al recrear la base de datos: $_"
    exit 1
}

# 9. Importar datos
Write-Info "Importando datos..."
Write-Info "Esto puede tomar varios minutos dependiendo del tamaño de la BD..."

try {
    Get-Content $tempFile | docker exec -i $dbContainer psql -U $DB_USER -d $DB_NAME 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Importación completada"
    } else {
        Write-Error "Error durante la importación"
        Write-Info "Verifica los logs del contenedor: docker logs $dbContainer"
        exit 1
    }
} catch {
    Write-Error "Error durante la importación: $_"
    exit 1
} finally {
    # Limpiar archivo temporal si fue descomprimido
    if ($tempFile -ne $BackupFile -and (Test-Path $tempFile)) {
        Remove-Item $tempFile -Force
    }
}

# 10. Reiniciar servicios
Write-Info "Reiniciando servicios..."
docker compose -f $ComposeFile up -d backend 2>&1 | Out-Null
Write-Success "Servicios reiniciados"

# 11. Ejecutar migraciones
Write-Info "Ejecutando migraciones..."
Start-Sleep -Seconds 5
docker compose -f $ComposeFile exec -T backend python manage.py migrate --noinput 2>&1 | Out-Null
Write-Success "Migraciones aplicadas"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "✅ IMPORTACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Success "La base de datos de desarrollo ha sido importada en producción"
Write-Host ""
Write-Info "Backup de producción guardado en: $prodBackupFile"
Write-Host ""
Write-Info "Verifica que todo funcione correctamente:"
Write-Host "  - Backend: http://localhost:8000/api/health/" -ForegroundColor Yellow
Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
