# Script de despliegue para MyKaizenFit (Windows PowerShell)
# Uso: .\deploy.ps1 [backend|frontend|all]

param(
    [Parameter(Position=0)]
    [ValidateSet("backend", "frontend", "all", "test", "docker", "render", "vercel", "help")]
    [string]$Action = "help"
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

# Función para verificar dependencias
function Test-Dependencies {
    Write-Info "Verificando dependencias..."
    
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Error "Git no está instalado"
        exit 1
    }
    
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Warning "Docker no está instalado. Algunas funciones pueden no estar disponibles."
    }
    
    Write-Info "Dependencias verificadas ✓"
}

# Función para ejecutar tests
function Invoke-Tests {
    Write-Info "Ejecutando tests..."
    
    # Tests del backend
    if (Test-Path "backend") {
        Write-Info "Ejecutando tests del backend..."
        Set-Location backend
        python manage.py test --settings=test_settings
        Set-Location ..
        Write-Info "Tests del backend completados ✓"
    }
    
    # Tests del frontend
    if (Test-Path "frontend") {
        Write-Info "Ejecutando tests del frontend..."
        Set-Location frontend
        npm test -- --coverage --watchAll=false
        Set-Location ..
        Write-Info "Tests del frontend completados ✓"
    }
}

# Función para construir imágenes Docker
function Build-DockerImages {
    Write-Info "Construyendo imágenes Docker..."
    
    if (Test-Path "backend") {
        Write-Info "Construyendo imagen del backend..."
        docker build -t mykaizenfit-backend ./backend
        Write-Info "Imagen del backend construida ✓"
    }
    
    if (Test-Path "frontend") {
        Write-Info "Construyendo imagen del frontend..."
        docker build -t mykaizenfit-frontend ./frontend
        Write-Info "Imagen del frontend construida ✓"
    }
}

# Función para desplegar con Docker Compose
function Deploy-Docker {
    Write-Info "Desplegando con Docker Compose..."
    
    # Verificar si existe el archivo de configuración
    if (-not (Test-Path "docker-compose.prod.yml")) {
        Write-Error "Archivo docker-compose.prod.yml no encontrado"
        exit 1
    }
    
    # Crear archivo .env si no existe
    if (-not (Test-Path ".env")) {
        Write-Warning "Creando archivo .env desde ejemplo..."
        Copy-Item env.production.example .env
        Write-Warning "Por favor, configura las variables en .env antes de continuar"
        exit 1
    }
    
    # Desplegar
    docker-compose -f docker-compose.prod.yml up -d
    
    Write-Info "Despliegue con Docker completado ✓"
    Write-Info "Backend: http://localhost:8000"
    Write-Info "Frontend: http://localhost:3000"
}

# Función para desplegar en Render
function Deploy-Render {
    Write-Info "Desplegando backend en Render..."
    
    if (-not (Test-Path "backend/render.yaml")) {
        Write-Error "Archivo render.yaml no encontrado"
        exit 1
    }
    
    Write-Info "Para desplegar en Render:"
    Write-Info "1. Conecta tu repositorio en https://render.com"
    Write-Info "2. Selecciona el archivo render.yaml"
    Write-Info "3. Configura las variables de entorno"
    Write-Info "4. Despliega"
}

# Función para desplegar en Vercel
function Deploy-Vercel {
    Write-Info "Desplegando frontend en Vercel..."
    
    if (-not (Test-Path "frontend/vercel.json")) {
        Write-Error "Archivo vercel.json no encontrado"
        exit 1
    }
    
    Write-Info "Para desplegar en Vercel:"
    Write-Info "1. Instala Vercel CLI: npm i -g vercel"
    Write-Info "2. Ejecuta: cd frontend && vercel"
    Write-Info "3. Sigue las instrucciones"
}

# Función para mostrar ayuda
function Show-Help {
    Write-Host "Uso: .\deploy.ps1 [OPCIÓN]"
    Write-Host ""
    Write-Host "Opciones:"
    Write-Host "  backend     Desplegar solo el backend"
    Write-Host "  frontend    Desplegar solo el frontend"
    Write-Host "  all         Desplegar todo (backend + frontend)"
    Write-Host "  test        Solo ejecutar tests"
    Write-Host "  docker      Desplegar con Docker Compose"
    Write-Host "  render      Mostrar instrucciones para Render"
    Write-Host "  vercel      Mostrar instrucciones para Vercel"
    Write-Host "  help        Mostrar esta ayuda"
    Write-Host ""
    Write-Host "Ejemplos:"
    Write-Host "  .\deploy.ps1 test                    # Ejecutar tests"
    Write-Host "  .\deploy.ps1 docker                  # Desplegar con Docker"
    Write-Host "  .\deploy.ps1 all                     # Desplegar todo"
}

# Función principal
function Main {
    switch ($Action) {
        "backend" {
            Test-Dependencies
            Invoke-Tests
            Deploy-Render
        }
        "frontend" {
            Test-Dependencies
            Invoke-Tests
            Deploy-Vercel
        }
        "all" {
            Test-Dependencies
            Invoke-Tests
            Deploy-Render
            Deploy-Vercel
        }
        "test" {
            Test-Dependencies
            Invoke-Tests
        }
        "docker" {
            Test-Dependencies
            Invoke-Tests
            Build-DockerImages
            Deploy-Docker
        }
        "render" {
            Deploy-Render
        }
        "vercel" {
            Deploy-Vercel
        }
        "help" {
            Show-Help
        }
    }
}

# Ejecutar función principal
Main

