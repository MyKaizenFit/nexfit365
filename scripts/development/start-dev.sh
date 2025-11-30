#!/bin/bash
# start-dev.sh
# Script para inicializar el entorno de desarrollo completo de MyKaizenFit
# Inicia tanto el backend Django como el frontend Next.js

# Colores para la consola
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Función para imprimir texto con color
print_color() {
    local color=$1
    local text=$2
    echo -e "${color}${text}${NC}"
}

# Función para mostrar ayuda
show_help() {
    print_color $CYAN "🚀 MyKaizenFit - Script de Inicialización de Desarrollo"
    print_color $CYAN "=================================================="
    echo ""
    print_color $YELLOW "Uso:"
    echo "  ./start-dev.sh                    # Inicia backend y frontend"
    echo "  ./start-dev.sh --backend-only     # Solo inicia el backend"
    echo "  ./start-dev.sh --frontend-only    # Solo inicia el frontend"
    echo "  ./start-dev.sh --help             # Muestra esta ayuda"
    echo ""
    print_color $YELLOW "Requisitos:"
    echo "  - Python 3.8+ instalado"
    echo "  - Node.js 18+ instalado"
    echo "  - Dependencias instaladas (pip install -r requirements.txt, npm install)"
    echo ""
}

# Función para mostrar rutas
show_routes() {
    print_color $MAGENTA "🌐 RUTAS DISPONIBLES DEL SISTEMA"
    print_color $MAGENTA "================================="
    echo ""
    
    print_color $GREEN "🔧 BACKEND (Django) - Puerto 8000"
    print_color $GREEN "--------------------------------"
    echo "  🏠 Página Principal:     http://localhost:8000/"
    echo "  🔐 Admin Django:         http://localhost:8000/admin/"
    echo "  📚 API Docs (Swagger):   http://localhost:8000/api/docs/"
    echo "  🔑 API Auth:             http://localhost:8000/api/auth/"
    echo "  👤 API Usuario:          http://localhost:8000/api/me/"
    echo "  💪 API Entrenamientos:   http://localhost:8000/api/workout-programs/"
    echo "  🥗 API Nutrición:        http://localhost:8000/api/nutrition-plans/"
    echo "  📈 API Progreso:         http://localhost:8000/api/progress-photos/"
    echo "  🏆 API Logros:           http://localhost:8000/api/achievements/"
    echo "  🔔 API Notificaciones:   http://localhost:8000/api/notifications/"
    echo "  📊 API Dashboard:        http://localhost:8000/api/dashboard/"
    echo ""
    
    print_color $BLUE "🎨 FRONTEND (Next.js) - Puerto 3000"
    print_color $BLUE "----------------------------------"
    echo "  🏠 Página Principal:     http://localhost:3000/"
    echo "  🔐 Autenticación:        http://localhost:3000/auth"
    echo "  📊 Dashboard:            http://localhost:3000/dashboard"
    echo "  ⚙️  Panel Admin:          http://localhost:3000/admin"
    echo "  👤 Perfil Usuario:       http://localhost:3000/profile"
    echo "  💪 Entrenamientos:       http://localhost:3000/workouts"
    echo "  🥗 Nutrición:            http://localhost:3000/nutrition"
    echo "  📈 Progreso:             http://localhost:3000/progress"
    echo "  🏆 Logros:               http://localhost:3000/achievements"
    echo ""
    
    print_color $YELLOW "🔑 CREDENCIALES DE ACCESO"
    print_color $YELLOW "-------------------------"
    echo "  👑 Superusuario Django:"
    echo "     Email: admin@example.invalid"
    echo "     Contraseña: AdminMyKaizenFit"
    echo ""
    
    print_color $CYAN "📁 ESTRUCTURA DEL PROYECTO"
    print_color $CYAN "---------------------------"
    echo "  📂 backend/              - API Django + DRF"
    echo "  📂 frontend/             - Aplicación Next.js"
    echo "  📂 docs/                 - Documentación completa"
    echo "  📄 start-dev.sh          - Este script"
    echo "  📄 README.md             - Documentación principal"
    echo ""
}

# Función para iniciar backend
start_backend() {
    print_color $GREEN "🚀 Iniciando Backend Django..."
    echo ""
    
    # Verificar que estamos en el directorio correcto
    if [ ! -f "backend/manage.py" ]; then
        print_color $RED "❌ Error: No se encontró manage.py en el directorio backend/"
        print_color $YELLOW "   Asegúrate de ejecutar este script desde la raíz del proyecto"
        return 1
    fi
    
    # Verificar que existe el entorno virtual
    if [ ! -d "backend/venv" ]; then
        print_color $YELLOW "⚠️  Advertencia: No se encontró entorno virtual en backend/venv/"
        print_color $YELLOW "   Se recomienda crear uno con: python3 -m venv venv"
        echo ""
    fi
    
    # Cambiar al directorio backend
    cd backend
    
    # Verificar dependencias
    if [ ! -f "requirements.txt" ]; then
        print_color $RED "❌ Error: No se encontró requirements.txt"
        return 1
    fi
    
    print_color $CYAN "📦 Verificando dependencias..."
    
    # Intentar activar entorno virtual si existe
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        print_color $GREEN "✅ Entorno virtual activado"
    elif [ -f "venv/Scripts/activate" ]; then
        source venv/Scripts/activate
        print_color $GREEN "✅ Entorno virtual activado"
    else
        print_color $YELLOW "⚠️  No se pudo activar el entorno virtual, continuando..."
    fi
    
    # Verificar que Django esté instalado
    if python -c "import django; print(f'Django {django.get_version()}')" 2>/dev/null; then
        print_color $GREEN "✅ Django encontrado"
    else
        print_color $CYAN "📦 Instalando dependencias..."
        pip install -r requirements.txt
        if [ $? -ne 0 ]; then
            print_color $RED "❌ Error instalando dependencias"
            return 1
        fi
    fi
    
    # Verificar configuración
    print_color $CYAN "🔍 Verificando configuración..."
    python manage.py check
    if [ $? -ne 0 ]; then
        print_color $RED "❌ Error en la configuración de Django"
        return 1
    fi
    
    # Verificar migraciones
    print_color $CYAN "🗄️  Verificando migraciones..."
    python manage.py showmigrations --list
    echo ""
    
    # Iniciar servidor
    print_color $GREEN "🌐 Iniciando servidor Django en puerto 8000..."
    print_color $YELLOW "   Presiona Ctrl+C para detener"
    echo ""
    
    # Mostrar información de inicio
    print_color $GREEN "✅ Backend iniciado correctamente!"
    print_color $CYAN "   🌐 URL: http://localhost:8000/"
    print_color $CYAN "   🔐 Admin: http://localhost:8000/admin/"
    print_color $CYAN "   📚 API Docs: http://localhost:8000/api/docs/"
    echo ""
    
    # Iniciar servidor
    python manage.py runserver 8000
    
    # Volver al directorio raíz
    cd ..
}

# Función para iniciar frontend
start_frontend() {
    print_color $BLUE "🎨 Iniciando Frontend Next.js..."
    echo ""
    
    # Verificar que estamos en el directorio correcto
    if [ ! -f "frontend/package.json" ]; then
        print_color $RED "❌ Error: No se encontró package.json en el directorio frontend/"
        print_color $YELLOW "   Asegúrate de ejecutar este script desde la raíz del proyecto"
        return 1
    fi
    
    # Cambiar al directorio frontend
    cd frontend
    
    # Verificar dependencias
    if [ ! -d "node_modules" ]; then
        print_color $CYAN "📦 Instalando dependencias de Node.js..."
        npm install
        if [ $? -ne 0 ]; then
            print_color $RED "❌ Error instalando dependencias"
            return 1
        fi
    fi
    
    # Verificar que Next.js esté instalado
    if [ -f "package.json" ]; then
        VERSION=$(node -p "require('./package.json').version")
        print_color $GREEN "✅ Next.js $VERSION encontrado"
    else
        print_color $RED "❌ Error leyendo package.json"
        return 1
    fi
    
    # Verificar archivo .env.local
    if [ ! -f ".env.local" ]; then
        if [ -f "env.example" ]; then
            print_color $CYAN "📝 Creando archivo .env.local desde env.example..."
            cp env.example .env.local
            print_color $GREEN "✅ Archivo .env.local creado"
        else
            print_color $YELLOW "⚠️  No se encontró env.example, verifica la configuración"
        fi
    fi
    
    # Iniciar servidor de desarrollo
    print_color $BLUE "🌐 Iniciando servidor Next.js en puerto 3000..."
    print_color $YELLOW "   Presiona Ctrl+C para detener"
    echo ""
    
    # Mostrar información de inicio
    print_color $BLUE "✅ Frontend iniciado correctamente!"
    print_color $CYAN "   🌐 URL: http://localhost:3000/"
    print_color $CYAN "   🔐 Auth: http://localhost:3000/auth"
    print_color $CYAN "   📊 Dashboard: http://localhost:3000/dashboard"
    echo ""
    
    # Iniciar servidor
    npm run dev
    
    # Volver al directorio raíz
    cd ..
}

# Función para iniciar ambos servicios
start_both() {
    print_color $MAGENTA "🚀 Iniciando MyKaizenFit - Backend + Frontend"
    print_color $MAGENTA "============================================="
    echo ""
    
    # Mostrar información del proyecto
    print_color $CYAN "📋 INFORMACIÓN DEL PROYECTO"
    print_color $CYAN "---------------------------"
    echo "  🏋️  Nombre: MyKaizenFit"
    echo "  📱 Tipo: Aplicación Web de Fitness"
    echo "  🔧 Backend: Django + DRF + PostgreSQL"
    echo "  🎨 Frontend: Next.js + TypeScript + Tailwind"
    echo "  🔐 Autenticación: JWT"
    echo "  📊 Base de Datos: Neon PostgreSQL"
    echo ""
    
    # Mostrar rutas
    show_routes
    
    print_color $YELLOW "🎯 INICIANDO SERVICIOS..."
    echo ""
    
    # Iniciar backend en segundo plano
    print_color $GREEN "1️⃣  Iniciando Backend..."
    start_backend &
    BACKEND_PID=$!
    
    # Esperar un poco para que el backend se inicie
    sleep 3
    
    # Verificar que el backend esté funcionando
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
        print_color $GREEN "✅ Backend funcionando en http://localhost:8000/"
    else
        print_color $YELLOW "⚠️  Backend no responde, pero continuando..."
    fi
    
    echo ""
    print_color $BLUE "2️⃣  Iniciando Frontend..."
    
    # Iniciar frontend
    start_frontend
    
    # Limpiar proceso del backend
    kill $BACKEND_PID 2>/dev/null
}

# Función principal
main() {
    # Verificar argumentos
    case "$1" in
        --help|-h)
            show_help
            exit 0
            ;;
        --backend-only)
            start_backend
            ;;
        --frontend-only)
            start_frontend
            ;;
        "")
            start_both
            ;;
        *)
            print_color $RED "❌ Opción desconocida: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Verificar que estamos en el directorio correcto
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_color $RED "❌ Error: Este script debe ejecutarse desde la raíz del proyecto"
    print_color $YELLOW "   Estructura esperada:"
    echo "   📁 proyecto/"
    echo "   ├── 📁 backend/"
    echo "   ├── 📁 frontend/"
    echo "   └── 📄 start-dev.sh"
    echo ""
    print_color $CYAN "   Navega al directorio raíz y ejecuta: ./start-dev.sh"
    exit 1
fi

# Hacer el script ejecutable
chmod +x start-dev.sh

# Mostrar banner
print_color $BOLD "🏋️  MyKaizenFit - Tu Compañero de Fitness"
print_color $BOLD "============================================="
echo ""

# Ejecutar función principal
main "$@"
