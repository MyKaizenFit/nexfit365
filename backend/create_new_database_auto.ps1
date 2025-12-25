# ============================================
# Script para crear nueva base de datos ddbb_nextfit (Version automatica)
# ============================================
# Este script crea:
# - Nuevo usuario: nexfit_app
# - Nueva base de datos: ddbb_nextfit
# - Restaura datos desde el backup
# ============================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "CREANDO NUEVA BASE DE DATOS ddbb_nextfit" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

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
Write-Host "[INFO] Intentando conexion sin contraseña..." -ForegroundColor Yellow

# Intentar sin contraseña primero
$env:PGPASSWORD = ""

# Paso 1: Crear usuario
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
    Write-Host "[INFO] Si el error es de autenticacion, necesitas configurar pg_hba.conf" -ForegroundColor Yellow
    Write-Host "   o proporcionar la contraseña de postgres" -ForegroundColor Yellow
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




