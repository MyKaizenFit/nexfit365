# Script para iniciar el entorno de desarrollo
# Ejecutar desde la raíz del proyecto

Write-Host "🚀 Iniciando entorno de desarrollo..." -ForegroundColor Green

# Verificar si estamos en el directorio correcto
if (-not (Test-Path "frontend") -or -not (Test-Path "backend")) {
    Write-Host "❌ Error: Debes ejecutar este script desde la raíz del proyecto" -ForegroundColor Red
    Write-Host "   Estructura esperada:" -ForegroundColor Yellow
    Write-Host "   📁 proyecto/" -ForegroundColor Cyan
    Write-Host "   ├── 📁 frontend/" -ForegroundColor Cyan
    Write-Host "   └── 📁 backend/" -ForegroundColor Cyan
    exit 1
}

# Función para verificar dependencias
function Test-Dependency {
    param([string]$command, [string]$name)
    
    try {
        $null = Get-Command $command -ErrorAction Stop
        Write-Host "✅ $name encontrado" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ $name no encontrado. Por favor instálalo primero." -ForegroundColor Red
        return $false
    }
}
    
    # Verificar dependencias
Write-Host "🔍 Verificando dependencias..." -ForegroundColor Yellow

$deps = @(
    @{ Command = "node"; Name = "Node.js" },
    @{ Command = "npm"; Name = "npm" },
    @{ Command = "python"; Name = "Python" }
)

$allDepsOk = $true
foreach ($dep in $deps) {
    if (-not (Test-Dependency $dep.Command $dep.Name)) {
        $allDepsOk = $false
    }
}

if (-not $allDepsOk) {
    Write-Host "❌ Faltan dependencias. Por favor instálalas antes de continuar." -ForegroundColor Red
    exit 1
}

# Verificar versión de Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "🐍 $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ No se pudo obtener la versión de Python" -ForegroundColor Yellow
}

# Verificar versión de Node.js
try {
    $nodeVersion = node --version
    Write-Host "📦 Node.js $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ No se pudo obtener la versión de Node.js" -ForegroundColor Yellow
}

Write-Host "✅ Todas las dependencias están disponibles" -ForegroundColor Green

# Función para iniciar backend
function Start-Backend {
    Write-Host "🔧 Iniciando backend Django..." -ForegroundColor Blue
    
    # Cambiar al directorio del backend
    Set-Location backend
    
    # Verificar si existe el entorno virtual
    if (Test-Path "venv") {
        Write-Host "🐍 Activando entorno virtual..." -ForegroundColor Yellow
        & "venv\Scripts\Activate.ps1"
    }
    elseif (Test-Path ".venv") {
        Write-Host "🐍 Activando entorno virtual..." -ForegroundColor Yellow
        & ".venv\Scripts\Activate.ps1"
    }
    else {
        Write-Host "⚠️ No se encontró entorno virtual. Creando uno nuevo..." -ForegroundColor Yellow
        python -m venv venv
        & "venv\Scripts\Activate.ps1"
        
        Write-Host "📦 Instalando dependencias de Python..." -ForegroundColor Yellow
        pip install -r requirements.txt
    }
    
    # Verificar si hay migraciones pendientes
    Write-Host "🗄️ Verificando migraciones..." -ForegroundColor Yellow
    python manage.py makemigrations
    python manage.py migrate
    
    # Iniciar servidor en segundo plano
    Write-Host "🚀 Iniciando servidor Django en http://localhost:8000..." -ForegroundColor Green
    Start-Process python -ArgumentList "manage.py", "runserver" -WindowStyle Minimized
    
    # Volver al directorio raíz
    Set-Location ..
}

# Función para iniciar frontend
function Start-Frontend {
    Write-Host "🎨 Iniciando frontend Next.js..." -ForegroundColor Blue
    
    # Cambiar al directorio del frontend
    Set-Location frontend
    
    # Verificar si node_modules existe
    if (-not (Test-Path "node_modules")) {
        Write-Host "📦 Instalando dependencias de Node.js..." -ForegroundColor Yellow
        npm install
    }
    
    # Iniciar servidor en segundo plano
    Write-Host "🚀 Iniciando servidor Next.js en http://localhost:3000..." -ForegroundColor Green
    Start-Process npm -ArgumentList "run", "dev" -WindowStyle Minimized
    
    # Volver al directorio raíz
    Set-Location ..
}

# Función para testear endpoints
function Test-Endpoints {
    Write-Host "🧪 Testeando endpoints..." -ForegroundColor Blue
    
    # Esperar un poco para que los servidores se inicien
    Start-Sleep -Seconds 5
    
    # Test del endpoint de health
    try {
        Write-Host "🔍 Probando endpoint de health..." -ForegroundColor Yellow
        $healthResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/health/" -Method Get -TimeoutSec 10
        Write-Host "✅ Backend funcionando: $($healthResponse.status)" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Backend no responde: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test del endpoint de progress photos
    try {
        Write-Host "🔍 Probando endpoint de progress photos..." -ForegroundColor Yellow
        $progressResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/progress-photos/test_upload/" -Method Get -TimeoutSec 10
        Write-Host "✅ Endpoint de progress photos funcionando: $($progressResponse.message)" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Endpoint de progress photos no responde: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Función principal
function Start-Development {
    Write-Host "🚀 Iniciando entorno de desarrollo..." -ForegroundColor Green
    
    # Iniciar backend
    Start-Backend
    
    # Esperar un poco para que el backend se inicie
    Start-Sleep -Seconds 3
    
    # Iniciar frontend
    Start-Frontend
    
    # Esperar un poco para que el frontend se inicie
    Start-Sleep -Seconds 3
    
    # Testear endpoints
    Test-Endpoints
    
    Write-Host "🎉 Entorno de desarrollo iniciado!" -ForegroundColor Green
    Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "🔧 Backend: http://localhost:8000" -ForegroundColor Cyan
    Write-Host "📚 API Docs: http://localhost:8000/api/docs/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 Para detener los servidores, cierra las ventanas minimizadas" -ForegroundColor Yellow
    Write-Host "💡 O presiona Ctrl+C en cada terminal" -ForegroundColor Yellow
}

# Ejecutar función principal
Start-Development

