# Script simple para verificar archivos de despliegue
Write-Host "🔍 Verificando archivos de despliegue..." -ForegroundColor Green

$files = @(
    "backend/render.yaml",
    "backend/requirements-prod.txt",
    "backend/Dockerfile",
    "backend/env.production.example",
    "frontend/vercel.json",
    "frontend/Dockerfile",
    "frontend/env.production.example",
    ".github/workflows/deploy.yml",
    "docker-compose.prod.yml",
    "nginx.prod.conf",
    "deploy.ps1",
    "deploy.sh",
    "DEPLOYMENT.md",
    "DEPLOYMENT_STEPS.md"
)

$allFound = $true

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✓ $file" -ForegroundColor Green
    } else {
        Write-Host "✗ $file" -ForegroundColor Red
        $allFound = $false
    }
}

Write-Host ""
if ($allFound) {
    Write-Host "🎉 ¡Todos los archivos están presentes!" -ForegroundColor Cyan
    Write-Host "🚀 El proyecto está listo para desplegar." -ForegroundColor Cyan
} else {
    Write-Host "❌ Algunos archivos faltan. Revisa los errores arriba." -ForegroundColor Red
}

