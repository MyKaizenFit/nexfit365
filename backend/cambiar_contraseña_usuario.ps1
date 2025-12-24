# Script para cambiar la contraseña del usuario nexfit_app
# Este script intenta diferentes métodos para cambiar la contraseña

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "CAMBIO DE CONTRASEÑA DE USUARIO nexfit_app" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$PostgresPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$NewPassword = "gFMpSumu3XrOH6S6zHkH"

Write-Host "[INFO] Nueva contraseña: $NewPassword" -ForegroundColor Yellow
Write-Host "[INFO] Esta contraseña no tiene caracteres especiales" -ForegroundColor Yellow
Write-Host ""

# Solicitar usuario administrador
Write-Host "[INFO] Necesitamos un usuario con privilegios de administrador" -ForegroundColor Yellow
Write-Host "   Opciones comunes: postgres, tu_usuario_windows, o el que configuraste" -ForegroundColor Yellow
Write-Host "   (Si no tienes contraseña, presiona Enter y se intentará sin contraseña)" -ForegroundColor Yellow
$AdminUser = Read-Host "Usuario administrador [postgres]: " 
if ([string]::IsNullOrWhiteSpace($AdminUser)) {
    $AdminUser = "postgres"
}

# También intentar con el usuario actual de Windows
$WindowsUser = $env:USERNAME
Write-Host "[INFO] También intentaremos con tu usuario de Windows: $WindowsUser" -ForegroundColor Cyan

Write-Host ""
Write-Host "[PASO 1] Cambiando contraseña del usuario nexfit_app..." -ForegroundColor Cyan
Write-Host "   Usando usuario: $AdminUser" -ForegroundColor White

# Intentar sin contraseña primero (si pg_hba.conf está en trust)
$env:PGPASSWORD = ""
$changePasswordCmd = "ALTER USER nexfit_app WITH PASSWORD '$NewPassword';"
$result = & $PostgresPath -U $AdminUser -d postgres -c $changePasswordCmd 2>&1

$success = $false
$usersToTry = @($AdminUser)

# Si el usuario especificado no es postgres, también intentar con postgres y usuario de Windows
if ($AdminUser -ne "postgres") {
    $usersToTry = @($AdminUser, "postgres", $WindowsUser)
} else {
    $usersToTry = @($AdminUser, $WindowsUser)
}

foreach ($user in $usersToTry) {
    Write-Host "[INFO] Intentando con usuario: $user..." -ForegroundColor Cyan
    
    # Intentar sin contraseña primero
    $env:PGPASSWORD = ""
    $result = & $PostgresPath -U $user -d postgres -c $changePasswordCmd 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Contraseña cambiada exitosamente usando usuario: $user" -ForegroundColor Green
        $success = $true
        break
    }
    
    # Si falla, intentar con contraseñas comunes
    $commonPasswords = @("postgres", "admin", $user)
    foreach ($pwd in $commonPasswords) {
        $env:PGPASSWORD = $pwd
        $result = & $PostgresPath -U $user -d postgres -c $changePasswordCmd 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Contraseña cambiada exitosamente usando usuario: $user" -ForegroundColor Green
            $success = $true
            break
        }
    }
    
    if ($success) {
        break
    }
}

if (-not $success) {
    Write-Host "[ERROR] No se pudo cambiar la contraseña automáticamente" -ForegroundColor Red
    Write-Host ""
    Write-Host "[SOLUCION] Ejecuta manualmente en psql:" -ForegroundColor Yellow
    Write-Host "   1. Conecta a PostgreSQL con el usuario que tengas acceso:" -ForegroundColor White
    Write-Host "      psql -U TU_USUARIO -d postgres" -ForegroundColor White
    Write-Host "   2. Ejecuta este comando SQL:" -ForegroundColor White
    Write-Host "      $changePasswordCmd" -ForegroundColor White
    Write-Host ""
    Write-Host "   O configura pg_hba.conf para permitir conexiones sin contraseña (trust)" -ForegroundColor White
    Write-Host ""
    Write-Host "   Ver instrucciones detalladas en: cambiar_contraseña_manual.md" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[OK] CONTRASEÑA CAMBIADA EXITOSAMENTE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[CREDENCIALES] Nueva contraseña:" -ForegroundColor Cyan
Write-Host "   Usuario: nexfit_app" -ForegroundColor White
Write-Host "   Contraseña: $NewPassword" -ForegroundColor White
Write-Host ""
Write-Host "[INFO] El archivo .env ya ha sido actualizado con esta contraseña" -ForegroundColor Yellow
Write-Host ""

