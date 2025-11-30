# Script de inicialización del Git Flow
# Ejecutar una sola vez para configurar todo

Write-Host "=== Configurando Git Flow para Sara Aitor Project ===" -ForegroundColor Cyan

# Verificar que estamos en el directorio correcto
if (!(Test-Path "frontend" -PathType Container) -or !(Test-Path "backend" -PathType Container)) {
    Write-Host "❌ Error: Ejecutar este script desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Directorio correcto detectado" -ForegroundColor Green

# Configurar ramas
Write-Host "`n=== Configurando ramas ===" -ForegroundColor Yellow
& ".\scripts\git-flow.ps1" setup

# Verificar estado
Write-Host "`n=== Estado final ===" -ForegroundColor Yellow
& ".\scripts\git-flow.ps1" status

Write-Host "`n=== ✅ Configuración completada ===" -ForegroundColor Green
Write-Host "`n📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Configurar protección de ramas en GitHub (ver .github/BRANCH_PROTECTION.md)" -ForegroundColor White
Write-Host "2. Configurar secrets en GitHub para deployment" -ForegroundColor White
Write-Host "3. Usar scripts de git-flow.ps1 para mover cambios entre ramas" -ForegroundColor White

Write-Host "`n🚀 Comandos útiles:" -ForegroundColor Magenta
Write-Host ".\scripts\git-flow.ps1 dev-to-pre  # Mover desarrollo → staging" -ForegroundColor White
Write-Host ".\scripts\git-flow.ps1 pre-to-pro  # Mover staging → producción" -ForegroundColor White
Write-Host ".\scripts\git-flow.ps1 status      # Ver estado de ramas" -ForegroundColor White
