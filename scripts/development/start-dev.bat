@echo off
REM start-dev.bat
REM Script para inicializar el entorno de desarrollo completo de MyKaizenFit
REM Inicia tanto el backend Django como el frontend Next.js

setlocal enabledelayedexpansion

REM Configurar título de la ventana
title MyKaizenFit - Entorno de Desarrollo

REM Colores ANSI (funciona en Windows 10+)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "MAGENTA=[95m"
set "CYAN=[96m"
set "WHITE=[97m"
set "BOLD=[1m"
set "RESET=[0m"

REM Función para imprimir texto con color
:print_color
echo %~1%~2%~3
goto :eof

REM Mostrar banner
call :print_color %BOLD% "🏋️  MyKaizenFit - Tu Compañero de Fitness"
call :print_color %BOLD% "============================================="
echo.

REM Verificar que estamos en el directorio correcto
if not exist "backend\manage.py" (
    call :print_color %RED% "❌ Error: No se encontró manage.py en el directorio backend/"
    call :print_color %YELLOW% "   Asegúrate de ejecutar este script desde la raíz del proyecto"
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    call :print_color %RED% "❌ Error: No se encontró package.json en el directorio frontend/"
    call :print_color %YELLOW% "   Asegúrate de ejecutar este script desde la raíz del proyecto"
    pause
    exit /b 1
)

REM Mostrar información del proyecto
call :print_color %CYAN% "📋 INFORMACIÓN DEL PROYECTO"
call :print_color %CYAN% "---------------------------"
echo   🏋️  Nombre: MyKaizenFit
echo   📱 Tipo: Aplicación Web de Fitness
echo   🔧 Backend: Django + DRF + PostgreSQL
echo   🎨 Frontend: Next.js + TypeScript + Tailwind
echo   🔐 Autenticación: JWT
echo   📊 Base de Datos: Neon PostgreSQL
echo.

REM Mostrar rutas disponibles
call :print_color %MAGENTA% "🌐 RUTAS DISPONIBLES DEL SISTEMA"
call :print_color %MAGENTA% "================================="
echo.

call :print_color %GREEN% "🔧 BACKEND (Django) - Puerto 8000"
call :print_color %GREEN% "--------------------------------"
echo   🏠 Página Principal:     http://localhost:8000/
echo   🔐 Admin Django:         http://localhost:8000/admin/
echo   📚 API Docs (Swagger):   http://localhost:8000/api/docs/
echo   🔑 API Auth:             http://localhost:8000/api/auth/
echo   👤 API Usuario:          http://localhost:8000/api/me/
echo   💪 API Entrenamientos:   http://localhost:8000/api/workout-programs/
echo   🥗 API Nutrición:        http://localhost:8000/api/nutrition-plans/
echo   📈 API Progreso:         http://localhost:8000/api/progress-photos/
echo   🏆 API Logros:           http://localhost:8000/api/achievements/
echo   🔔 API Notificaciones:   http://localhost:8000/api/notifications/
echo   📊 API Dashboard:        http://localhost:8000/api/dashboard/
echo.

call :print_color %BLUE% "🎨 FRONTEND (Next.js) - Puerto 3000"
call :print_color %BLUE% "----------------------------------"
echo   🏠 Página Principal:     http://localhost:3000/
echo   🔐 Autenticación:        http://localhost:3000/auth
echo   📊 Dashboard:            http://localhost:3000/dashboard
echo   ⚙️  Panel Admin:          http://localhost:3000/admin
echo   👤 Perfil Usuario:       http://localhost:3000/profile
echo   💪 Entrenamientos:       http://localhost:3000/workouts
echo   🥗 Nutrición:            http://localhost:3000/nutrition
echo   📈 Progreso:             http://localhost:3000/progress
echo   🏆 Logros:               http://localhost:3000/achievements
echo.

call :print_color %YELLOW% "🔑 CREDENCIALES DE ACCESO"
call :print_color %YELLOW% "-------------------------"
echo   👑 Superusuario Django:
echo      Email: admin@example.invalid
echo      Contraseña: AdminMyKaizenFit
echo.

call :print_color %CYAN% "📁 ESTRUCTURA DEL PROYECTO"
call :print_color %CYAN% "---------------------------"
echo   📂 backend/              - API Django + DRF
echo   📂 frontend/             - Aplicación Next.js
echo   📂 docs/                 - Documentación completa
echo   📄 start-dev.bat         - Este script
echo   📄 README.md             - Documentación principal
echo.

REM Preguntar qué servicio iniciar
echo.
call :print_color %YELLOW% "🎯 ¿Qué servicio quieres iniciar?"
echo   1. Backend + Frontend en terminales separadas (RECOMENDADO)
echo   2. Solo Backend
echo   3. Solo Frontend
echo   4. Solo mostrar información
echo   5. Salir
echo.
set /p choice="Selecciona una opción (1-5): "

if "%choice%"=="1" goto start_both_separate
if "%choice%"=="2" goto start_backend
if "%choice%"=="3" goto start_frontend
if "%choice%"=="4" goto show_info
if "%choice%"=="5" goto exit_script
goto invalid_choice

:start_both_separate
call :print_color %MAGENTA% "🚀 Iniciando MyKaizenFit - Backend + Frontend en Terminales Separadas"
call :print_color %MAGENTA% "=================================================================="
echo.
call :print_color %YELLOW% "🎯 INICIANDO SERVICIOS EN TERMINALES SEPARADAS..."
echo.

REM Iniciar backend en nueva terminal
call :print_color %GREEN% "1️⃣  Iniciando Backend en nueva terminal..."
start "MyKaizenFit - Backend Django" cmd /k "cd backend && echo 🚀 Iniciando Backend Django... && echo 📁 Directorio: %CD%\backend && python manage.py runserver 8000"

REM Esperar un poco para que el backend se inicie
timeout /t 3 /nobreak >nul

REM Verificar que el backend esté funcionando
call :print_color %CYAN% "🔍 Verificando backend..."
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:8000/' -TimeoutSec 5 | Out-Null; Write-Host '✅ Backend funcionando en http://localhost:8000/' } catch { Write-Host '⚠️  Backend no responde, pero continuando...' }"

echo.
call :print_color %BLUE% "2️⃣  Iniciando Frontend en nueva terminal..."
start "MyKaizenFit - Frontend Next.js" cmd /k "cd frontend && echo 🎨 Iniciando Frontend Next.js... && echo 📁 Directorio: %CD%\frontend && npm run dev"

echo.
call :print_color %GREEN% "✅ SERVICIOS INICIADOS EN TERMINALES SEPARADAS"
call :print_color %GREEN% "============================================="
echo.
call :print_color %CYAN% "🌐 Backend:  http://localhost:8000/"
call :print_color %CYAN% "🎨 Frontend: http://localhost:3000/"
echo.
call :print_color %YELLOW% "💡 Cada servicio tiene su propia terminal"
call :print_color %YELLOW% "   Puedes cerrar esta terminal principal"
echo.
call :print_color %YELLOW% "🔑 Credenciales de Prueba:"
echo    Usuario: test@mykaizenfit.com / TestUser123!
echo    Admin:  admin@example.invalid / AdminTest123!
echo.
call :print_color %MAGENTA% "🎯 Próximos pasos:"
echo    1. Espera a que ambos servicios estén funcionando
echo    2. Abre http://localhost:3000 en tu navegador
echo    3. Usa las credenciales de prueba para login
echo.
call :print_color %CYAN% "✅ Script completado! Servicios iniciados en terminales separadas."
echo.
pause
goto end

:start_both
call :print_color %MAGENTA% "🚀 Iniciando MyKaizenFit - Backend + Frontend"
call :print_color %MAGENTA% "============================================="
echo.
call :print_color %YELLOW% "🎯 INICIANDO SERVICIOS..."
echo.

REM Iniciar backend en segundo plano
call :print_color %GREEN% "1️⃣  Iniciando Backend..."
start "Backend Django" cmd /k "cd backend && python manage.py runserver 8000"

REM Esperar un poco para que el backend se inicie
timeout /t 3 /nobreak >nul

REM Verificar que el backend esté funcionando
call :print_color %CYAN% "🔍 Verificando backend..."
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:8000/' -TimeoutSec 5 | Out-Null; Write-Host '✅ Backend funcionando en http://localhost:8000/' } catch { Write-Host '⚠️  Backend no responde, pero continuando...' }"

echo.
call :print_color %BLUE% "2️⃣  Iniciando Frontend..."
echo.

REM Iniciar frontend
call :print_color %BLUE% "🎨 Iniciando Frontend Next.js..."
echo.

REM Verificar dependencias del frontend
if not exist "frontend\node_modules" (
    call :print_color %CYAN% "📦 Instalando dependencias de Node.js..."
    cd frontend
    npm install
    cd ..
)

REM Verificar archivo .env.local
if not exist "frontend\.env.local" (
    if exist "frontend\env.example" (
        call :print_color %CYAN% "📝 Creando archivo .env.local desde env.example..."
        copy "frontend\env.example" "frontend\.env.local" >nul
        call :print_color %CYAN% "✅ Archivo .env.local creado"
    )
)

REM Iniciar frontend
call :print_color %BLUE% "🌐 Iniciando servidor Next.js en puerto 3000..."
call :print_color %YELLOW% "   Presiona Ctrl+C para detener"
echo.

call :print_color %BLUE% "✅ Frontend iniciado correctamente!"
call :print_color %CYAN% "   🌐 URL: http://localhost:3000/"
call :print_color %CYAN% "   🔐 Auth: http://localhost:3000/auth"
call :print_color %CYAN% "   📊 Dashboard: http://localhost:3000/dashboard"
echo.

cd frontend
npm run dev
cd ..
goto end

:start_backend
call :print_color %GREEN% "🚀 Iniciando Backend Django..."
echo.

cd backend

REM Verificar dependencias
if not exist "requirements.txt" (
    call :print_color %RED% "❌ Error: No se encontró requirements.txt"
    cd ..
    pause
    exit /b 1
)

call :print_color %CYAN% "📦 Verificando dependencias..."

REM Intentar activar entorno virtual si existe
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    call :print_color %GREEN% "✅ Entorno virtual activado"
)

REM Verificar que Django esté instalado
python -c "import django; print(f'Django {django.get_version()}')" 2>nul
if %errorlevel% neq 0 (
    call :print_color %CYAN% "📦 Instalando dependencias..."
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        call :print_color %RED% "❌ Error instalando dependencias"
        cd ..
        pause
        exit /b 1
    )
)

REM Verificar configuración
call :print_color %CYAN% "🔍 Verificando configuración..."
python manage.py check
if %errorlevel% neq 0 (
    call :print_color %RED% "❌ Error en la configuración de Django"
    cd ..
    pause
    exit /b 1
)

REM Verificar migraciones
call :print_color %CYAN% "🗄️  Verificando migraciones..."
python manage.py showmigrations --list
echo.

REM Crear usuarios de prueba si no existen
call :print_color %CYAN% "🧪 Creando usuarios de prueba para desarrollo..."
if exist "create_test_users.py" (
    python create_test_users.py
    echo.
) else (
    call :print_color %YELLOW% "Script de usuarios de prueba no encontrado"
)

REM Iniciar servidor
call :print_color %GREEN% "🌐 Iniciando servidor Django en puerto 8000..."
call :print_color %YELLOW% "   Presiona Ctrl+C para detener"
echo.

call :print_color %GREEN% "✅ Backend iniciado correctamente!"
call :print_color %CYAN% "   🌐 URL: http://localhost:8000/"
call :print_color %CYAN% "   🔐 Admin: http://localhost:8000/admin/"
call :print_color %CYAN% "   📚 API Docs: http://localhost:8000/api/docs/"
echo.

python manage.py runserver 8000
cd ..
goto end

:start_frontend
call :print_color %BLUE% "🎨 Iniciando Frontend Next.js..."
echo.

cd frontend

REM Verificar dependencias
if not exist "package.json" (
    call :print_color %RED% "❌ Error: No se encontró package.json"
    cd ..
    pause
    exit /b 1
)

REM Verificar dependencias de Node.js
if not exist "node_modules" (
    call :print_color %CYAN% "📦 Instalando dependencias de Node.js..."
    npm install
    if %errorlevel% neq 0 (
        call :print_color %RED% "❌ Error instalando dependencias"
        cd ..
        pause
        exit /b 1
    )
)

REM Verificar archivo .env.local
if not exist ".env.local" (
    if exist "env.example" (
        call :print_color %CYAN% "📝 Creando archivo .env.local desde env.example..."
        copy env.example .env.local >nul
        call :print_color %GREEN% "✅ Archivo .env.local creado"
    )
)

REM Iniciar servidor de desarrollo
call :print_color %BLUE% "🌐 Iniciando servidor Next.js en puerto 3000..."
call :print_color %YELLOW% "   Presiona Ctrl+C para detener"
echo.

call :print_color %BLUE% "✅ Frontend iniciado correctamente!"
call :print_color %CYAN% "   🌐 URL: http://localhost:3000/"
call :print_color %CYAN% "   🔐 Auth: http://localhost:3000/auth"
call :print_color %CYAN% "   📊 Dashboard: http://localhost:3000/dashboard"
echo.

npm run dev
cd ..
goto end

:show_info
call :print_color %CYAN% "📚 INFORMACIÓN COMPLETA DEL PROYECTO"
call :print_color %CYAN% "====================================="
echo.
call :print_color %YELLOW% "🚀 Para iniciar los servicios:"
echo   1. Ejecuta este script y selecciona opción 1
echo   2. O ejecuta manualmente:
echo      - Backend: cd backend ^&^& python manage.py runserver 8000
echo      - Frontend: cd frontend ^&^& npm run dev
echo.
call :print_color %YELLOW% "🔗 Enlaces útiles:"
echo   - Documentación: docs/
echo   - Backend API: http://localhost:8000/api/docs/
echo   - Frontend: http://localhost:3000/
echo   - Admin Django: http://localhost:8000/admin/
echo.
call :print_color %YELLOW% "🔑 Credenciales:"
echo   - Email: admin@example.invalid
echo   - Contraseña: AdminMyKaizenFit
echo.
pause
goto end

:invalid_choice
call :print_color %RED% "❌ Opción inválida. Selecciona 1-5."
echo.
pause
goto :eof

:end
echo.
call :print_color %GREEN% "✅ Script completado!"
echo.
call :print_color %CYAN% "🌐 Servicios disponibles:"
echo   - Backend: http://localhost:8000/
echo   - Frontend: http://localhost:3000/
echo   - Admin: http://localhost:8000/admin/
echo.
call :print_color %YELLOW% "💡 Tip: Mantén las ventanas abiertas para ver los logs"
echo.
pause

:exit_script
call :print_color %CYAN% "👋 ¡Hasta luego!"
timeout /t 2 /nobreak >nul
exit /b 0
