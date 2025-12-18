# ============================================
# Git Hook: Post-Merge
# ============================================
# Este script se ejecuta automáticamente después de git pull/merge
# Restaura la BD de desarrollo si hay un backup nuevo

$ErrorActionPreference = "Continue"

# Solo ejecutar si estamos en la rama develop
$currentBranch = git branch --show-current
if ($currentBranch -ne "develop") {
    exit 0
}

# Verificar si hay cambios en backups/dev/
$backupDir = "./backups/dev"
if (-not (Test-Path $backupDir)) {
    exit 0
}

# Verificar si hay un nuevo backup
$latestBackupFile = "$backupDir/latest_backup.txt"
if (-not (Test-Path $latestBackupFile)) {
    exit 0
}

# Verificar si el contenedor de BD está corriendo
$DB_CONTAINER = docker ps --filter "name=nexfit-dev-db" --format "{{.Names}}" | Select-Object -First 1
if (-not $DB_CONTAINER) {
    Write-Host "INFO: Contenedor de BD no está corriendo. Ejecuta manualmente restore-dev-db.ps1 cuando levantes Docker."
    exit 0
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "DETECTADO NUEVO BACKUP DE BD" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se detectó un nuevo backup de la BD de desarrollo." -ForegroundColor Yellow
Write-Host "¿Deseas restaurarlo ahora? (s/N): " -NoNewline -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "s" -or $response -eq "S" -or $response -eq "si" -or $response -eq "Si") {
    Write-Host ""
    & "$PSScriptRoot\restore-dev-db.ps1"
} else {
    Write-Host "Puedes restaurar el backup manualmente ejecutando:" -ForegroundColor Cyan
    Write-Host "  .\scripts\development\restore-dev-db.ps1" -ForegroundColor White
    Write-Host ""
}

