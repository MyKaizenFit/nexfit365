# Script para subir todas las ramas a GitHub
# USO: Ejecutar estos comandos uno por uno en PowerShell

Write-Host "=== COMANDOS PARA SUBIR TODAS LAS RAMAS ===" -ForegroundColor Cyan
Write-Host "`n1. Primero, configura tu repositorio remoto:" -ForegroundColor Yellow
Write-Host "   git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git" -ForegroundColor White

Write-Host "`n2. Cambia el nombre de master a main:" -ForegroundColor Yellow
Write-Host "   git branch -M main" -ForegroundColor White

Write-Host "`n3. Sube todas las ramas:" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor White
Write-Host "   git push -u origin dev" -ForegroundColor White
Write-Host "   git push -u origin pre" -ForegroundColor White
Write-Host "   git push -u origin pro" -ForegroundColor White

Write-Host "`n4. Verifica que todas las ramas estén subidas:" -ForegroundColor Yellow
Write-Host "   git branch -a" -ForegroundColor White

Write-Host "`n📝 INSTRUCCIONES:" -ForegroundColor Magenta
Write-Host "1. Reemplaza 'TU-USUARIO' con tu nombre de usuario de GitHub" -ForegroundColor White
Write-Host "2. Reemplaza 'TU-REPOSITORIO' con el nombre de tu repositorio" -ForegroundColor White
Write-Host "3. Ejecuta cada comando en orden" -ForegroundColor White

Write-Host "`n🔗 Si no tienes repositorio en GitHub:" -ForegroundColor Red
Write-Host "1. Ve a https://github.com/new" -ForegroundColor White
Write-Host "2. Crea un nuevo repositorio" -ForegroundColor White
Write-Host "3. Copia la URL del repositorio" -ForegroundColor White
Write-Host "4. Úsala en el comando git remote add origin" -ForegroundColor White
