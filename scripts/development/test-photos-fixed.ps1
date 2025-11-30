# Script para probar la funcionalidad de fotos después de la corrección
Write-Host "🚀 Test de funcionalidad de fotos CORREGIDA" -ForegroundColor Green
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

Write-Host ""
Write-Host "🎉 Backend funcionando correctamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Pasos para probar:" -ForegroundColor Cyan
Write-Host "1. Ve a http://localhost:3000 y inicia sesión" -ForegroundColor White
Write-Host "2. Navega a la sección 'Mi Progreso'" -ForegroundColor White
Write-Host "3. Haz clic en 'Subir Primera Foto'" -ForegroundColor White
Write-Host "4. Selecciona una imagen y especifica el peso" -ForegroundColor White
Write-Host "5. Haz clic en 'Subir Foto'" -ForegroundColor White
Write-Host "6. Verifica que la foto aparezca en el carrusel" -ForegroundColor White
Write-Host "7. Recarga la página para confirmar que persiste" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Si hay problemas, revisa la consola del navegador para logs detallados" -ForegroundColor Yellow
Write-Host "🔍 Ahora deberías ver el contenido completo de la respuesta JSON" -ForegroundColor Yellow
Write-Host ""
Write-Host "🎯 Cambios implementados:" -ForegroundColor Magenta
Write-Host "- Serializer ahora recibe el request en el contexto" -ForegroundColor White
Write-Host "- URLs de fotos se construyen correctamente" -ForegroundColor White
Write-Host "- Logging detallado en el frontend para debugging" -ForegroundColor White
