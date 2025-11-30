# Script para configurar el repositorio remoto
# USAR ESTE SCRIPT CON LA URL DE TU REPOSITORIO

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUrl
)

Write-Host "=== Configurando repositorio remoto ===" -ForegroundColor Cyan

# Configurar el repositorio remoto
Write-Host "Configurando repositorio remoto..." -ForegroundColor Yellow
git remote add origin $GitHubUrl

# Verificar configuración
Write-Host "Verificando configuración..." -ForegroundColor Yellow
git remote -v

# Subir todas las ramas
Write-Host "`nSubiendo rama main..." -ForegroundColor Green
git push -u origin main

Write-Host "Subiendo rama dev..." -ForegroundColor Green
git push -u origin dev

Write-Host "Subiendo rama pre..." -ForegroundColor Green
git push -u origin pre

Write-Host "Subiendo rama pro..." -ForegroundColor Green
git push -u origin pro

Write-Host "`n✅ Todas las ramas subidas exitosamente!" -ForegroundColor Green

Write-Host "`n📋 Ramas disponibles en GitHub:" -ForegroundColor Cyan
Write-Host "- main (rama principal)" -ForegroundColor White
Write-Host "- dev (desarrollo)" -ForegroundColor White
Write-Host "- pre (staging)" -ForegroundColor White
Write-Host "- pro (producción)" -ForegroundColor White
















