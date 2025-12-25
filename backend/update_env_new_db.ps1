# ============================================
# Script para actualizar .env con nuevas credenciales
# ============================================

$envPath = ".\backend\.env"
$newDbName = "ddbb_nextfit"
$newDbUser = "nexfit_app"
$newDbPassword = 'CHANGE_ME_DB_PASSWORD'
$newDbHost = "localhost"
$newDbPort = "5432"
$newDbSslMode = "disable"

Write-Host "📝 Actualizando archivo .env..." -ForegroundColor Cyan

# Leer archivo .env si existe
$lines = @()
if (Test-Path $envPath) {
    $lines = Get-Content $envPath
}

# Variables a actualizar/agregar
$dbVars = @{
    'DB_NAME' = $newDbName
    'DB_USER' = $newDbUser
    'DB_PASSWORD' = $newDbPassword
    'DB_HOST' = $newDbHost
    'DB_PORT' = $newDbPort
    'DB_SSLMODE' = $newDbSslMode
}

# Actualizar o agregar variables
$updated = $false
$newLines = @()
$foundVars = @{}

foreach ($line in $lines) {
    $lineStripped = $line.Trim()
    $updatedLine = $false
    
    foreach ($varName in $dbVars.Keys) {
        if ($lineStripped -match "^$varName=") {
            $newLines += "$varName=$($dbVars[$varName])"
            $foundVars[$varName] = $true
            $updatedLine = $true
            $updated = $true
            break
        }
    }
    
    if (-not $updatedLine) {
        $newLines += $line
    }
}

# Agregar variables que no existían
foreach ($varName in $dbVars.Keys) {
    if (-not $foundVars.ContainsKey($varName)) {
        $newLines += "$varName=$($dbVars[$varName])"
        $updated = $true
    }
}

# Escribir archivo
try {
    $newLines | Set-Content -Path $envPath -Encoding UTF8
    Write-Host "✅ Archivo .env actualizado exitosamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Credenciales configuradas:" -ForegroundColor Cyan
    Write-Host "   DB_NAME=$newDbName" -ForegroundColor White
    Write-Host "   DB_USER=$newDbUser" -ForegroundColor White
    Write-Host "   DB_PASSWORD=$newDbPassword" -ForegroundColor White
    Write-Host "   DB_HOST=$newDbHost" -ForegroundColor White
    Write-Host "   DB_PORT=$newDbPort" -ForegroundColor White
    Write-Host "   DB_SSLMODE=$newDbSslMode" -ForegroundColor White
} catch {
    Write-Host "❌ Error actualizando .env: $_" -ForegroundColor Red
    exit 1
}




