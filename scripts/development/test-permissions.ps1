# Script para probar permisos del backend
Write-Host "🔐 Test de permisos del backend" -ForegroundColor Green
Write-Host "=" * 40

# Verificar que el backend esté funcionando
Write-Host "🔍 Verificando backend..." -ForegroundColor Blue
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/health/" -Method Get -TimeoutSec 10
    Write-Host "✅ Backend funcionando" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend no responde: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Asegúrate de que el backend esté ejecutándose en http://localhost:8000" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🎯 Pasos para probar los permisos:" -ForegroundColor Cyan
Write-Host "1. Ve a http://localhost:3000" -ForegroundColor White
Write-Host "2. Inicia sesión con tu usuario" -ForegroundColor White
Write-Host "3. Abre la consola del navegador (F12)" -ForegroundColor White
Write-Host "4. Ve a 'Mi Progreso'" -ForegroundColor White
Write-Host "5. Intenta subir una foto" -ForegroundColor White
Write-Host "6. Revisa los logs del backend en la terminal" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Busca estos logs en el backend:" -ForegroundColor Yellow
Write-Host "- Usuario autenticado" -ForegroundColor White
Write-Host "- Verificación de permisos" -ForegroundColor White
Write-Host "- Razón del rechazo" -ForegroundColor White
Write-Host ""
Write-Host "💡 Si el error persiste, revisa:" -ForegroundColor Yellow
Write-Host "- El archivo backend/progress/permissions.py" -ForegroundColor White
Write-Host "- Los logs del backend (django.log)" -ForegroundColor White
Write-Host "- La configuración de autenticación" -ForegroundColor White







