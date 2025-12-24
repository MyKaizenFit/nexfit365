# Script para cambiar la contraseña del usuario nexfit_app a una más simple
# y actualizar el .env

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "CAMBIANDO CONTRASEÑA DE USUARIO nexfit_app" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$PostgresPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$NewPassword = "nexfit_app_2024"

Write-Host "[INFO] Nueva contraseña: $NewPassword" -ForegroundColor Yellow
Write-Host "[INFO] Esta contraseña será más simple y sin caracteres especiales" -ForegroundColor Yellow
Write-Host ""

# Intentar cambiar la contraseña sin contraseña de postgres (si pg_hba.conf está en trust)
Write-Host "[PASO 1] Cambiando contraseña del usuario nexfit_app..." -ForegroundColor Cyan

$changePasswordCmd = "ALTER USER nexfit_app WITH PASSWORD '$NewPassword';"
$result = & $PostgresPath -U postgres -d postgres -c $changePasswordCmd 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Contraseña cambiada exitosamente" -ForegroundColor Green
} else {
    Write-Host "[ERROR] No se pudo cambiar la contraseña: $result" -ForegroundColor Red
    Write-Host ""
    Write-Host "[AYUDA] Necesitas:" -ForegroundColor Yellow
    Write-Host "  1. Configurar pg_hba.conf para permitir conexiones sin contraseña (trust)" -ForegroundColor White
    Write-Host "  2. O ejecutar manualmente en psql:" -ForegroundColor White
    Write-Host "     psql -U postgres -d postgres" -ForegroundColor White
    Write-Host "     $changePasswordCmd" -ForegroundColor White
    exit 1
}

# Actualizar .env
Write-Host ""
Write-Host "[PASO 2] Actualizando archivo .env..." -ForegroundColor Cyan

$envPath = ".\backend\.env"
if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    $content = $content -replace 'DB_PASSWORD=.*', "DB_PASSWORD=$NewPassword"
    Set-Content -Path $envPath -Value $content -Encoding UTF8
    Write-Host "[OK] Archivo .env actualizado" -ForegroundColor Green
} else {
    Write-Host "[ERROR] No se encontró el archivo .env" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[OK] CONFIGURACION COMPLETADA" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[CREDENCIALES] Nueva contraseña configurada:" -ForegroundColor Cyan
Write-Host "   DB_USER: nexfit_app" -ForegroundColor White
Write-Host "   DB_PASSWORD: $NewPassword" -ForegroundColor White
Write-Host ""


