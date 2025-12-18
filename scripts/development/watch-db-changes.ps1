# ============================================
# Script para Monitorear Cambios en la BD y Hacer Backup Automático
# ============================================
# Este script monitorea cambios en la BD y hace backup automático
# Ejecutar en segundo plano mientras trabajas

param(
    [int]$IntervalSeconds = 300  # Hacer backup cada 5 minutos por defecto
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Blue
Write-Host "MONITOR DE CAMBIOS EN BD DE DESARROLLO" -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "Este script monitoreará cambios en la BD y hará backup automático." -ForegroundColor Cyan
Write-Host "Intervalo: $IntervalSeconds segundos" -ForegroundColor Cyan
Write-Host "Presiona Ctrl+C para detener el monitoreo." -ForegroundColor Yellow
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backupScript = Join-Path $scriptPath "backup-dev-db.ps1"

# Verificar que el script de backup existe
if (-not (Test-Path $backupScript)) {
    Write-Host "ERROR: No se encontró el script de backup: $backupScript" -ForegroundColor Red
    exit 1
}

# Función para obtener el hash de la BD (número aproximado de cambios)
function Get-DatabaseHash {
    $DB_CONTAINER = docker ps --filter "name=nexfit-dev-db" --format "{{.Names}}" | Select-Object -First 1
    if (-not $DB_CONTAINER) {
        return $null
    }
    
    # Obtener un hash basado en el número de registros y última modificación
    $result = docker exec $DB_CONTAINER psql -U postgres -d mykaizenfit_dev -t -c "
        SELECT 
            COUNT(*)::text || '-' || 
            COALESCE(MAX(updated_at)::text, '') || '-' ||
            COALESCE(MAX(created_at)::text, '')
        FROM (
            SELECT updated_at, created_at FROM accounts_customuser
            UNION ALL
            SELECT updated_at, created_at FROM workouts_exercise
            UNION ALL
            SELECT updated_at, created_at FROM nutrition_recipe
            LIMIT 1000
        ) t;
    " 2>&1
    
    return $result.Trim()
}

$lastHash = Get-DatabaseHash
$lastBackupTime = Get-Date

Write-Host "Monitoreo iniciado. Último estado de BD: $lastHash" -ForegroundColor Green
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds $IntervalSeconds
        
        $currentHash = Get-DatabaseHash
        
        if ($null -eq $currentHash) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] WARNING: No se puede acceder a la BD. Reintentando..." -ForegroundColor Yellow
            continue
        }
        
        # Verificar si hay cambios
        if ($currentHash -ne $lastHash) {
            $timeSinceLastBackup = (Get-Date) - $lastBackupTime
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Cambios detectados en la BD. Haciendo backup..." -ForegroundColor Cyan
            
            & $backupScript -Force
            
            if ($LASTEXITCODE -eq 0) {
                $lastHash = $currentHash
                $lastBackupTime = Get-Date
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Backup completado exitosamente." -ForegroundColor Green
                Write-Host ""
            } else {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ERROR: Fallo al hacer backup." -ForegroundColor Red
            }
        } else {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Sin cambios en la BD." -ForegroundColor Gray
        }
    }
} catch {
    Write-Host ""
    Write-Host "Monitoreo detenido." -ForegroundColor Yellow
    exit 0
}

