# ============================================
# Script para Exportar Base de Datos de Desarrollo
# ============================================
# Este script exporta la base de datos de desarrollo para importarla en producción
#
# Uso:
#   .\scripts\deployment\export-dev-db.ps1
#
# Requisitos:
#   - Docker Desktop corriendo
#   - Contenedor de desarrollo activo
#   - Espacio suficiente en disco

param(
    [string]$OutputDir = ".\backups",
    [string]$FileName = "dev_database_export_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
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
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "📦 EXPORTAR BASE DE DATOS DE DESARROLLO" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar que Docker esté corriendo
Write-Info "Verificando Docker..."
try {
    docker ps | Out-Null
    Write-Success "Docker está corriendo"
} catch {
    Write-Error "Docker no está corriendo. Por favor inicia Docker Desktop."
    exit 1
}

# 2. Verificar que el contenedor de BD de desarrollo esté corriendo
Write-Info "Verificando contenedor de base de datos de desarrollo..."
$dbContainer = docker ps --filter "name=db" --format "{{.Names}}" | Select-Object -First 1

if (-not $dbContainer) {
    Write-Error "No se encontró contenedor de base de datos de desarrollo."
    Write-Info "Asegúrate de que los servicios de desarrollo estén corriendo:"
    Write-Host "  docker compose up -d db" -ForegroundColor Yellow
    exit 1
}

Write-Success "Contenedor encontrado: $dbContainer"

# 3. Obtener variables de entorno de desarrollo
Write-Info "Obteniendo configuración de base de datos..."

# Intentar leer desde docker-compose.yml o usar valores por defecto
$DB_NAME = "mykaizenfit"
$DB_USER = "postgres"

# Verificar si existe archivo de entorno de desarrollo
if (Test-Path ".\docker\backend.env") {
    $envContent = Get-Content ".\docker\backend.env" -Raw
    if ($envContent -match "DB_NAME=(\S+)") {
        $DB_NAME = $matches[1]
    }
    if ($envContent -match "DB_USER=(\S+)") {
        $DB_USER = $matches[1]
    }
    Write-Success "Configuración leída desde backend.env"
} else {
    Write-Warning "No se encontró backend.env, usando valores por defecto"
}

Write-Info "Base de datos: $DB_NAME"
Write-Info "Usuario: $DB_USER"

# 4. Crear directorio de salida
Write-Info "Creando directorio de salida..."
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Success "Directorio creado: $OutputDir"
} else {
    Write-Success "Directorio existe: $OutputDir"
}

$outputPath = Join-Path $OutputDir $FileName
$outputPathGz = "$outputPath.gz"

# 5. Exportar base de datos
Write-Info "Exportando base de datos..."
Write-Info "Esto puede tomar varios minutos dependiendo del tamaño de la BD..."

try {
    # Exportar usando pg_dump
    docker exec $dbContainer pg_dump -U $DB_USER -d $DB_NAME --clean --if-exists --no-owner --no-acl > $outputPath 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Exportación completada: $outputPath"
        
        # Verificar tamaño del archivo
        $fileSize = (Get-Item $outputPath).Length / 1MB
        Write-Info "Tamaño del archivo: $([math]::Round($fileSize, 2)) MB"
        
        # 6. Comprimir archivo
        Write-Info "Comprimiendo archivo..."
        try {
            # Usar gzip si está disponible, sino usar Compress-Archive
            if (Get-Command gzip -ErrorAction SilentlyContinue) {
                gzip -f $outputPath
                $compressedPath = "$outputPath.gz"
            } else {
                # Usar PowerShell nativo
                Compress-Archive -Path $outputPath -DestinationPath "$outputPath.zip" -Force
                Remove-Item $outputPath
                $compressedPath = "$outputPath.zip"
            }
            
            if (Test-Path $compressedPath) {
                $compressedSize = (Get-Item $compressedPath).Length / 1MB
                Write-Success "Archivo comprimido: $compressedPath"
                Write-Info "Tamaño comprimido: $([math]::Round($compressedSize, 2)) MB"
                Write-Info "Reducción: $([math]::Round((1 - ($compressedSize / $fileSize)) * 100, 1))%"
            }
        } catch {
            Write-Warning "No se pudo comprimir el archivo, pero la exportación está completa: $outputPath"
        }
        
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host "✅ EXPORTACIÓN COMPLETADA" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host ""
        Write-Success "Archivo de exportación: $compressedPath"
        Write-Host ""
        Write-Info "Próximos pasos:"
        Write-Host "  1. Copia este archivo al servidor de producción"
        Write-Host "  2. Ejecuta el script de importación en producción:"
        Write-Host "     .\scripts\deployment\import-to-prod.ps1 -BackupFile '$compressedPath'" -ForegroundColor Yellow
        Write-Host ""
        
    } else {
        Write-Error "Error al exportar la base de datos"
        Write-Info "Verifica los logs del contenedor: docker logs $dbContainer"
        exit 1
    }
} catch {
    Write-Error "Error durante la exportación: $_"
    exit 1
}


