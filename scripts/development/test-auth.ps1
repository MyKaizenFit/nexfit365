# Script simple para probar la autenticación
Write-Host "🔐 Test de autenticación del backend" -ForegroundColor Green
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
Write-Host "🎯 Pasos para probar la autenticación:" -ForegroundColor Cyan
Write-Host "1. Ve a http://localhost:3000" -ForegroundColor White
Write-Host "2. Inicia sesión con tu usuario" -ForegroundColor White
Write-Host "3. Abre la consola del navegador (F12)" -ForegroundColor White
Write-Host "4. Ve a 'Mi Progreso'" -ForegroundColor White
Write-Host "5. Intenta subir una foto" -ForegroundColor White
Write-Host "6. Revisa los logs de autenticación en la consola" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Busca estos logs en la consola:" -ForegroundColor Yellow
Write-Host "- Estado de autenticación" -ForegroundColor White
Write-Host "- Token de acceso" -ForegroundColor White
Write-Host "- Usuario actual" -ForegroundColor White
Write-Host "- Headers de autenticación" -ForegroundColor White







