# Script de verificación para despliegue de MyKaizenFit
# Verifica que todos los archivos necesarios estén presentes y configurados correctamente

param(
    [switch]$Verbose
)

# Función para imprimir mensajes
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Cyan
}

# Función para verificar archivos
function Test-File {
    param(
        [string]$Path,
        [string]$Description
    )
    
    if (Test-Path $Path) {
        Write-Success "✓ $Description"
        return $true
    } else {
        Write-Error "✗ $Description - Archivo no encontrado: $Path"
        return $false
    }
}

# Función para verificar contenido de archivos
function Test-FileContent {
    param(
        [string]$Path,
        [string]$SearchText,
        [string]$Description
    )
    
    if (Test-Path $Path) {
        $content = Get-Content $Path -Raw
        if ($content -like "*$SearchText*") {
            Write-Success "✓ $Description"
            return $true
        } else {
            Write-Warning "⚠ $Description - Contenido no encontrado: $SearchText"
            return $false
        }
    } else {
        Write-Error "✗ $Description - Archivo no encontrado: $Path"
        return $false
    }
}

# Función principal
function Main {
    Write-Info "🔍 Verificando configuración para despliegue de MyKaizenFit..."
    Write-Info ""

    $allChecksPassed = $true

    # Verificar archivos del backend
    Write-Info "📁 Verificando archivos del backend..."
    $allChecksPassed = (Test-File "backend/render.yaml" "Configuración de Render") -and $allChecksPassed
    $allChecksPassed = (Test-File "backend/requirements-prod.txt" "Requirements de producción") -and $allChecksPassed
    $allChecksPassed = (Test-File "backend/Dockerfile" "Dockerfile del backend") -and $allChecksPassed
    $allChecksPassed = (Test-File "backend/env.production.example" "Variables de entorno de ejemplo") -and $allChecksPassed
    $allChecksPassed = (Test-File "backend/manage.py" "Archivo manage.py") -and $allChecksPassed
    $allChecksPassed = (Test-File "backend/backend/settings.py" "Configuración de Django") -and $allChecksPassed
    Write-Info ""

    # Verificar archivos del frontend
    Write-Info "📁 Verificando archivos del frontend..."
    $allChecksPassed = (Test-File "frontend/vercel.json" "Configuración de Vercel") -and $allChecksPassed
    $allChecksPassed = (Test-File "frontend/package.json" "Package.json del frontend") -and $allChecksPassed
    $allChecksPassed = (Test-File "frontend/Dockerfile" "Dockerfile del frontend") -and $allChecksPassed
    $allChecksPassed = (Test-File "frontend/env.production.example" "Variables de entorno de ejemplo") -and $allChecksPassed
    $allChecksPassed = (Test-File "frontend/next.config.mjs" "Configuración de Next.js") -and $allChecksPassed
    Write-Info ""

    # Verificar archivos de CI/CD
    Write-Info "📁 Verificando archivos de CI/CD..."
    $allChecksPassed = (Test-File ".github/workflows/deploy.yml" "GitHub Actions") -and $allChecksPassed
    $allChecksPassed = (Test-File "docker-compose.prod.yml" "Docker Compose de producción") -and $allChecksPassed
    $allChecksPassed = (Test-File "nginx.prod.conf" "Configuración de Nginx") -and $allChecksPassed
    Write-Info ""

    # Verificar archivos de despliegue
    Write-Info "📁 Verificando archivos de despliegue..."
    $allChecksPassed = (Test-File "deploy.ps1" "Script de despliegue para Windows") -and $allChecksPassed
    $allChecksPassed = (Test-File "deploy.sh" "Script de despliegue para Linux/macOS") -and $allChecksPassed
    $allChecksPassed = (Test-File "DEPLOYMENT.md" "Documentación de despliegue") -and $allChecksPassed
    $allChecksPassed = (Test-File "DEPLOYMENT_STEPS.md" "Pasos de despliegue") -and $allChecksPassed
    Write-Info ""

    # Verificar contenido específico
    Write-Info "🔍 Verificando contenido de archivos..."
    $allChecksPassed = (Test-FileContent "backend/render.yaml" "mykaizenfit-backend" "Nombre del servicio en Render") -and $allChecksPassed
    $allChecksPassed = (Test-FileContent "frontend/vercel.json" "mykaizenfit-backend.onrender.com" "URL del backend en Vercel") -and $allChecksPassed
    $allChecksPassed = (Test-FileContent ".github/workflows/deploy.yml" "test-backend" "Tests del backend en CI/CD") -and $allChecksPassed
    $allChecksPassed = (Test-FileContent ".github/workflows/deploy.yml" "test-frontend" "Tests del frontend en CI/CD") -and $allChecksPassed
    Write-Info ""

    # Verificar estructura de directorios
    Write-Info "📁 Verificando estructura de directorios..."
    $allChecksPassed = (Test-Path "backend/workouts" "Directorio de workouts") -and $allChecksPassed
    $allChecksPassed = (Test-Path "backend/accounts" "Directorio de accounts") -and $allChecksPassed
    $allChecksPassed = (Test-Path "frontend/app" "Directorio app del frontend") -and $allChecksPassed
    $allChecksPassed = (Test-Path "frontend/components" "Directorio components del frontend") -and $allChecksPassed
    Write-Info ""

    # Verificar archivos de testing
    Write-Info "🧪 Verificando archivos de testing..."
    $allChecksPassed = (Test-File "backend/workouts/tests.py" "Tests de workouts") -and $allChecksPassed
    $allChecksPassed = (Test-File "backend/accounts/tests.py" "Tests de accounts") -and $allChecksPassed
    $allChecksPassed = (Test-File "backend/test_settings.py" "Configuración de testing") -and $allChecksPassed
    Write-Info ""

    # Resultado final
    Write-Info "📊 Resultado de la verificación:"
    if ($allChecksPassed) {
        Write-Success "🎉 ¡Todos los checks pasaron! El proyecto está listo para desplegar."
        Write-Info ""
        Write-Info "🚀 Próximos pasos:"
        Write-Info "1. Haz commit de todos los cambios: git add . && git commit -m 'feat: configuración completa para despliegue'"
        Write-Info "2. Sube los cambios: git push origin main"
        Write-Info "3. Sigue la guía en DEPLOYMENT_STEPS.md"
        Write-Info ""
        Write-Info "📚 Archivos importantes:"
        Write-Info "- DEPLOYMENT_STEPS.md: Guía paso a paso"
        Write-Info "- DEPLOYMENT.md: Documentación completa"
        Write-Info "- deploy.ps1: Script de despliegue para Windows"
        Write-Info "- deploy.sh: Script de despliegue para Linux/macOS"
    } else {
        Write-Error "❌ Algunos checks fallaron. Por favor, revisa los errores arriba antes de desplegar."
        Write-Info ""
        Write-Info "🔧 Comandos útiles:"
        Write-Info "- Ver logs: Get-Content -Path 'archivo.log' -Tail 50"
        Write-Info "- Verificar archivos: Test-Path 'ruta/archivo'"
        Write-Info "- Buscar texto: Select-String -Path 'archivo' -Pattern 'texto'"
    }
}

# Ejecutar función principal
Main