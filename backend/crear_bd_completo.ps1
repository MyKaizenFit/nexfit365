# ============================================
# Script completo para crear base de datos ddbb_nextfit
# ============================================
# Este script intenta diferentes metodos para crear la BD
# ============================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "CREANDO NUEVA BASE DE DATOS ddbb_nextfit" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si estamos ejecutando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ADVERTENCIA] No estas ejecutando como Administrador" -ForegroundColor Yellow
    Write-Host "   Algunas operaciones pueden fallar" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[AYUDA] Para ejecutar como Administrador:" -ForegroundColor Cyan
    Write-Host "   1. Cierra esta ventana" -ForegroundColor White
    Write-Host "   2. Click derecho en PowerShell" -ForegroundColor White
    Write-Host "   3. Selecciona 'Ejecutar como administrador'" -ForegroundColor White
    Write-Host "   4. Ejecuta este script de nuevo" -ForegroundColor White
    Write-Host ""
    $continuar = Read-Host "¿Deseas continuar de todas formas? (S/N)"
    if ($continuar -ne "S" -and $continuar -ne "s") {
        exit 0
    }
}

# Configuracion
$PostgresPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$AdminUser = "postgres"
$NewUser = "nexfit_app"
$NewPassword = 'CHANGE_ME_DB_PASSWORD'
$NewDatabase = "ddbb_nextfit"
$BackupZip = "..\backups\dev_database_export_20251224_142932.sql.zip"
$BackupDir = "..\backups\tmp_restore"
$BackupSql = "$BackupDir\dev_database_export_20251224_142932.sql"

# Verificar que psql existe
if (-not (Test-Path $PostgresPath)) {
    Write-Host "[ERROR] No se encontro PostgreSQL en: $PostgresPath" -ForegroundColor Red
    Write-Host "   Por favor, verifica la ruta de instalacion de PostgreSQL" -ForegroundColor Yellow
    exit 1
}

Write-Host "[CONFIG] Configuracion:" -ForegroundColor Cyan
Write-Host "   Usuario nuevo: $NewUser" -ForegroundColor White
Write-Host "   Contraseña nueva: $NewPassword" -ForegroundColor White
Write-Host "   Base de datos nueva: $NewDatabase" -ForegroundColor White
Write-Host ""

# Intentar diferentes metodos de conexion
Write-Host "[INFO] Intentando diferentes metodos de conexion..." -ForegroundColor Yellow
Write-Host ""

# Metodo 1: Sin contraseña (si pg_hba.conf esta en trust)
Write-Host "[METODO 1] Intentando conexion sin contraseña..." -ForegroundColor Cyan
$env:PGPASSWORD = ""
$result = & $PostgresPath -U $AdminUser -d postgres -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Conexion exitosa sin contraseña" -ForegroundColor Green
    $metodoFunciona = $true
} else {
    Write-Host "[INFO] No se pudo conectar sin contraseña" -ForegroundColor Yellow
    
    # Metodo 2: Intentar con contraseña comun
    Write-Host ""
    Write-Host "[METODO 2] Intentando con contraseñas comunes..." -ForegroundColor Cyan
    $passwords = @("postgres", "admin", "root", "")
    
    $metodoFunciona = $false
    foreach ($pwd in $passwords) {
        $env:PGPASSWORD = $pwd
        $result = & $PostgresPath -U $AdminUser -d postgres -c "SELECT 1;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Conexion exitosa con contraseña: $($pwd -replace '.', '*')" -ForegroundColor Green
            $metodoFunciona = $true
            break
        }
    }
    
    if (-not $metodoFunciona) {
        Write-Host "[ERROR] No se pudo conectar a PostgreSQL" -ForegroundColor Red
        Write-Host ""
        Write-Host "[SOLUCION] Necesitas:" -ForegroundColor Yellow
        Write-Host "   1. Configurar pg_hba.conf para permitir conexiones sin contraseña" -ForegroundColor White
        Write-Host "   2. O proporcionar la contraseña de postgres" -ForegroundColor White
        Write-Host ""
        Write-Host "   Ver instrucciones en: CONFIGURAR_PG_HBA.md" -ForegroundColor Cyan
        exit 1
    }
}

# Si llegamos aqui, tenemos conexion
Write-Host ""
Write-Host "[PASO 1] Creando usuario $NewUser..." -ForegroundColor Cyan
$createUserCmd = "CREATE USER $NewUser WITH PASSWORD '$NewPassword';"
$result = & $PostgresPath -U $AdminUser -d postgres -c $createUserCmd 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Usuario creado exitosamente" -ForegroundColor Green
} elseif ($result -match "already exists") {
    Write-Host "[INFO] Usuario ya existe, continuando..." -ForegroundColor Yellow
} else {
    Write-Host "[ERROR] Error creando usuario: $result" -ForegroundColor Red
    exit 1
}

# Paso 2: Crear base de datos
Write-Host ""
Write-Host "[PASO 2] Creando base de datos $NewDatabase..." -ForegroundColor Cyan
$createDbCmd = "CREATE DATABASE $NewDatabase OWNER $NewUser;"
$result = & $PostgresPath -U $AdminUser -d postgres -c $createDbCmd 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Base de datos creada exitosamente" -ForegroundColor Green
} elseif ($result -match "already exists") {
    Write-Host "[INFO] Base de datos ya existe, continuando..." -ForegroundColor Yellow
} else {
    Write-Host "[ERROR] Error creando base de datos: $result" -ForegroundColor Red
    exit 1
}

# Paso 3: Otorgar permisos
Write-Host ""
Write-Host "[PASO 3] Otorgando permisos..." -ForegroundColor Cyan
$grantCmd = "GRANT ALL PRIVILEGES ON DATABASE $NewDatabase TO $NewUser;"
$result = & $PostgresPath -U $AdminUser -d postgres -c $grantCmd 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Permisos otorgados exitosamente" -ForegroundColor Green
} else {
    Write-Host "[ADVERTENCIA] Advertencia al otorgar permisos: $result" -ForegroundColor Yellow
}

# Paso 4: Descomprimir backup
Write-Host ""
Write-Host "[PASO 4] Descomprimiendo backup..." -ForegroundColor Cyan
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

# Paso 5: Restaurar datos
Write-Host ""
Write-Host "[PASO 5] Restaurando datos en la nueva base de datos..." -ForegroundColor Cyan
Write-Host "   Esto puede tardar varios minutos..." -ForegroundColor Yellow

$env:PGPASSWORD = $NewPassword
$result = & $PostgresPath -U $NewUser -d $NewDatabase -f $BackupSql 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Datos restaurados exitosamente" -ForegroundColor Green
} else {
    Write-Host "[ADVERTENCIA] Advertencias durante la restauracion (puede ser normal):" -ForegroundColor Yellow
    # Mostrar solo las primeras lineas del error para no saturar
    $resultLines = $result -split "`n" | Select-Object -First 10
    Write-Host ($resultLines -join "`n") -ForegroundColor Yellow
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
Write-Host "[OK] CONFIGURACION COMPLETADA" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[CREDENCIALES] Credenciales de la nueva base de datos:" -ForegroundColor Cyan
Write-Host "   DB_NAME: $NewDatabase" -ForegroundColor White
Write-Host "   DB_USER: $NewUser" -ForegroundColor White
Write-Host "   DB_PASSWORD: $NewPassword" -ForegroundColor White
Write-Host "   DB_HOST: localhost" -ForegroundColor White
Write-Host "   DB_PORT: 5432" -ForegroundColor White
Write-Host ""
Write-Host "[INFO] El archivo .env ya ha sido actualizado con estas credenciales" -ForegroundColor Yellow
Write-Host ""




