# Script simple para iniciar el entorno de desarrollo
Write-Host "Starting development environment..." -ForegroundColor Green

# Start backend
Write-Host "Starting Django backend..." -ForegroundColor Blue
Set-Location backend
Start-Process python -ArgumentList "manage.py", "runserver" -WindowStyle Minimized
Set-Location ..

# Start frontend
Write-Host "Starting Next.js frontend..." -ForegroundColor Blue
Set-Location frontend
Start-Process npm -ArgumentList "run", "dev" -WindowStyle Minimized
Set-Location ..

Write-Host "Development environment started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
