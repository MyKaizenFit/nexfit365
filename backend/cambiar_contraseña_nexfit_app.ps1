# Script para cambiar la contraseña del usuario nexfit_app
# Usa el usuario nexfit_app con su contraseña actual para cambiarla

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "CAMBIO DE CONTRASEÑA DE USUARIO nexfit_app" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$PostgresPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$CurrentUser = "nexfit_app"
$CurrentPassword = '$ydEt4Kdpe012oB$07tArRak'  # Contraseña actual con caracteres especiales
$NewPassword = "gFMpSumu3XrOH6S6zHkH"  # Nueva contraseña sin caracteres especiales

Write-Host "[INFO] Usuario: $CurrentUser" -ForegroundColor Yellow
Write-Host "[INFO] Nueva contraseña: $NewPassword" -ForegroundColor Yellow
Write-Host "[INFO] Esta contraseña no tiene caracteres especiales" -ForegroundColor Yellow
Write-Host ""

# Intentar cambiar la contraseña usando nexfit_app con su contraseña actual
Write-Host "[PASO 1] Conectando como nexfit_app con la contraseña actual..." -ForegroundColor Cyan

# Primero verificar que podemos conectarnos con la contraseña actual
$env:PGPASSWORD = $CurrentPassword
$testConnection = & $PostgresPath -U $CurrentUser -d ddbb_nextfit -c "SELECT current_user;" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Conexion exitosa con la contraseña actual" -ForegroundColor Green
    
    # Intentar cambiar la contraseña
    # Nota: Un usuario normal no puede cambiar su propia contraseña sin privilegios especiales
    # Necesitamos usar un usuario con privilegios de administrador
    Write-Host "[INFO] Intentando cambiar la contraseña..." -ForegroundColor Cyan
    Write-Host "[WARNING] Un usuario normal puede no tener permisos para cambiar su propia contraseña" -ForegroundColor Yellow
    Write-Host "[INFO] Intentando con ALTER USER..." -ForegroundColor Cyan
    
    # Intentar cambiar la contraseña (puede fallar si no tiene permisos)
    $changePasswordCmd = "ALTER USER nexfit_app WITH PASSWORD '$NewPassword';"
    $result = & $PostgresPath -U $CurrentUser -d postgres -c $changePasswordCmd 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Contraseña cambiada exitosamente" -ForegroundColor Green
        $success = $true
    } else {
        Write-Host "[INFO] No se pudo cambiar con nexfit_app (no tiene privilegios suficientes)" -ForegroundColor Yellow
        Write-Host "[INFO] Necesitamos un usuario administrador (postgres o superusuario)" -ForegroundColor Yellow
        $success = $false
    }
} else {
    Write-Host "[ERROR] No se pudo conectar con la contraseña actual" -ForegroundColor Red
    Write-Host "[INFO] La contraseña actual puede estar incorrecta o el usuario no existe" -ForegroundColor Yellow
    $success = $false
}

if (-not $success) {
    Write-Host ""
    Write-Host "[SOLUCION ALTERNATIVA] Usar un usuario administrador:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Opcion 1: Configurar pg_hba.conf para permitir conexiones sin contraseña (trust)" -ForegroundColor White
    Write-Host "   Opcion 2: Usar un usuario con privilegios de superusuario" -ForegroundColor White
    Write-Host ""
    Write-Host "   Comando SQL a ejecutar (con usuario administrador):" -ForegroundColor Cyan
    Write-Host "   ALTER USER nexfit_app WITH PASSWORD '$NewPassword';" -ForegroundColor White
    Write-Host ""
    Write-Host "   Ver instrucciones detalladas en: cambiar_contraseña_manual.md" -ForegroundColor Cyan
    exit 1
}

# Limpiar variable de entorno
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[OK] CONTRASEÑA CAMBIADA EXITOSAMENTE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[CREDENCIALES] Nueva contraseña:" -ForegroundColor Cyan
Write-Host "   Usuario: $CurrentUser" -ForegroundColor White
Write-Host "   Contraseña: $NewPassword" -ForegroundColor White
Write-Host ""
Write-Host "[INFO] El archivo .env ya ha sido actualizado con esta contraseña" -ForegroundColor Yellow
Write-Host ""
Write-Host "[SIGUIENTE PASO] Ejecuta el script de pruebas:" -ForegroundColor Cyan
Write-Host "   python test_database_connection.py" -ForegroundColor White
Write-Host ""
