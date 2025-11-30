# Script para probar la funcionalidad de fotos completa
Write-Host "🚀 Test de funcionalidad de fotos completa" -ForegroundColor Green
Write-Host "=" * 50

# Verificar que el backend esté funcionando
Write-Host "🔍 Verificando backend..." -ForegroundColor Blue
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/progress-photos/test_upload/" -Method Get -TimeoutSec 10
    Write-Host "✅ Backend funcionando" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend no responde: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Asegúrate de que el backend esté ejecutándose en http://localhost:8000" -ForegroundColor Yellow
    exit 1
}

# Verificar que el frontend esté funcionando
Write-Host "🔍 Verificando frontend..." -ForegroundColor Blue
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000" -Method Get -TimeoutSec 10
    Write-Host "✅ Frontend funcionando" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend no responde: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Asegúrate de que el frontend esté ejecutándose en http://localhost:3000" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🎉 Ambos servicios están funcionando correctamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Pasos para probar:" -ForegroundColor Cyan
Write-Host "1. Ve a http://localhost:3000 y inicia sesión" -ForegroundColor White
Write-Host "2. Navega a la sección 'Mi Progreso'" -ForegroundColor White
Write-Host "3. Haz clic en 'Subir Primera Foto'" -ForegroundColor White
Write-Host "4. Selecciona una imagen y especifica el peso" -ForegroundColor White
Write-Host "5. Haz clic en 'Subir Foto'" -ForegroundColor White
Write-Host "6. Verifica que la foto aparezca en el carrusel" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Si hay problemas, revisa la consola del navegador para logs detallados" -ForegroundColor Yellow
Write-Host "🔍 También revisa los logs del backend en backend/logs/django.log" -ForegroundColor Yellow







