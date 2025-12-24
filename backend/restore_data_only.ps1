# ============================================
# Script para restaurar datos en ddbb_nextfit
# ============================================
# Este script asume que la BD y usuario ya existen
# Solo restaura los datos del backup
# ============================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "RESTAURANDO DATOS EN ddbb_nextfit" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Configuracion
$PostgresPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$NewUser = "nexfit_app"
$NewPassword = 'CHANGE_ME_DB_PASSWORD'
$NewDatabase = "ddbb_nextfit"
$BackupZip = "..\backups\dev_database_export_20251224_142932.sql.zip"
$BackupDir = "..\backups\tmp_restore"
$BackupSql = "$BackupDir\dev_database_export_20251224_142932.sql"

# Verificar que psql existe
if (-not (Test-Path $PostgresPath)) {
    Write-Host "[ERROR] No se encontro PostgreSQL en: $PostgresPath" -ForegroundColor Red
    exit 1
}

# Paso 1: Descomprimir backup
Write-Host "[PASO 1] Descomprimiendo backup..." -ForegroundColor Cyan
if (Test-Path $BackupZip) {
    try {
        if (Test-Path $BackupDir) {
            Remove-Item -Path $BackupDir -Recurse -Force
        }
        Expand-Archive -Path $BackupZip -DestinationPath $BackupDir -Force
        Write-Host "[OK] Backup descomprimido exitosamente" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Error descomprimiendo backup: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[ERROR] No se encontro el archivo de backup: $BackupZip" -ForegroundColor Red
    exit 1
}

# Paso 2: Restaurar datos
Write-Host ""
Write-Host "[PASO 2] Restaurando datos en la nueva base de datos..." -ForegroundColor Cyan
Write-Host "   Esto puede tardar varios minutos..." -ForegroundColor Yellow

$env:PGPASSWORD = $NewPassword
$result = & $PostgresPath -U $NewUser -d $NewDatabase -f $BackupSql 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Datos restaurados exitosamente" -ForegroundColor Green
} else {
    Write-Host "[ADVERTENCIA] Advertencias durante la restauracion (puede ser normal):" -ForegroundColor Yellow
    Write-Host $result -ForegroundColor Yellow
}

# Limpiar archivos temporales
Write-Host ""
Write-Host "[LIMPIEZA] Limpiando archivos temporales..." -ForegroundColor Cyan
if (Test-Path $BackupDir) {
    Remove-Item -Path $BackupDir -Recurse -Force
    Write-Host "[OK] Archivos temporales eliminados" -ForegroundColor Green
}

# Limpiar variable de entorno
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[OK] RESTAURACION COMPLETADA" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""


