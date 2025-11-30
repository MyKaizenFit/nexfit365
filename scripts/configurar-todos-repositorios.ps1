# Script para configurar todos los repositorios remotos
# Ejecutar este script para configurar todos los repositorios

Write-Host "=== Configurando todos los repositorios remotos ===" -ForegroundColor Cyan

# Repositorio Principal
Write-Host "`n1. Configurando repositorio PRINCIPAL..." -ForegroundColor Yellow
Write-Host "¿Tienes un repositorio para el proyecto principal? (s/n)" -ForegroundColor White
$response = Read-Host
if ($response -eq "s" -or $response -eq "S") {
    Write-Host "Introduce la URL del repositorio principal:" -ForegroundColor White
    $mainRepo = Read-Host
    git remote add origin $mainRepo
    git push -u origin main
    git push -u origin dev
    git push -u origin pre
    git push -u origin pro
    Write-Host "✅ Repositorio principal configurado" -ForegroundColor Green
} else {
    Write-Host "⚠️ Saltando repositorio principal" -ForegroundColor Yellow
}

# Frontend
Write-Host "`n2. Configurando FRONTEND..." -ForegroundColor Yellow
cd frontend
git push -u origin main
git push -u origin dev
git push -u origin pre
git push -u origin pro
Write-Host "✅ Frontend configurado" -ForegroundColor Green
cd ..

# Backend
Write-Host "`n3. Configurando BACKEND..." -ForegroundColor Yellow
cd backend
git push -u origin main
git push -u origin dev
git push -u origin pre
git push -u origin pro
Write-Host "✅ Backend configurado" -ForegroundColor Green
cd ..

# Doc
Write-Host "`n4. Configurando DOCUMENTACIÓN..." -ForegroundColor Yellow
cd doc
git push -u origin main
git push -u origin dev
git push -u origin pre
git push -u origin pro
Write-Host "✅ Documentación configurada" -ForegroundColor Green
cd ..

Write-Host "`n🎉 Todos los repositorios configurados exitosamente!" -ForegroundColor Green

Write-Host "`n📋 Ramas disponibles en cada repositorio:" -ForegroundColor Cyan
Write-Host "- main (rama principal)" -ForegroundColor White
Write-Host "- dev (desarrollo)" -ForegroundColor White
Write-Host "- pre (staging)" -ForegroundColor White
Write-Host "- pro (producción)" -ForegroundColor White
















