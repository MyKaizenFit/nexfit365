# Script para configurar el repositorio remoto de GitHub
# Ejecutar este script con la URL de tu repositorio

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUrl
)

Write-Host "=== Configurando repositorio remoto de GitHub ===" -ForegroundColor Cyan

# Verificar que estamos en un repositorio Git
if (!(Test-Path ".git" -PathType Container)) {
    Write-Host "❌ Error: No estás en un repositorio Git" -ForegroundColor Red
    exit 1
}

# Configurar el repositorio remoto
Write-Host "Configurando repositorio remoto..." -ForegroundColor Yellow
git remote add origin $GitHubUrl

# Cambiar nombre de master a main
Write-Host "Renombrando rama master a main..." -ForegroundColor Yellow
git branch -M main

# Subir todas las ramas
Write-Host "Subiendo rama main..." -ForegroundColor Yellow
git push -u origin main

Write-Host "Subiendo rama dev..." -ForegroundColor Yellow
git push -u origin dev

Write-Host "Subiendo rama pre..." -ForegroundColor Yellow
git push -u origin pre

Write-Host "Subiendo rama pro..." -ForegroundColor Yellow
git push -u origin pro

Write-Host "`n✅ Todas las ramas subidas exitosamente a GitHub!" -ForegroundColor Green

Write-Host "`n📋 Ramas disponibles en GitHub:" -ForegroundColor Cyan
Write-Host "- main (rama principal)" -ForegroundColor White
Write-Host "- dev (desarrollo)" -ForegroundColor White
Write-Host "- pre (staging)" -ForegroundColor White
Write-Host "- pro (producción)" -ForegroundColor White

Write-Host "`n🚀 Próximos pasos:" -ForegroundColor Magenta
Write-Host "1. Configurar protección de ramas en GitHub" -ForegroundColor White
Write-Host "2. Configurar secrets para deployment" -ForegroundColor White
Write-Host "3. Usar scripts de git-flow.ps1 para desarrollo" -ForegroundColor White
