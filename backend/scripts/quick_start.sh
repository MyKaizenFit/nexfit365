#!/bin/bash

# 🚀 Script de Inicio Rápido - MyKaizenFit Backend
# 
# Este script configura y ejecuta el proyecto de forma rápida:
# 1. Configura el entorno
# 2. Ejecuta migraciones
# 3. Crea datos demo
# 4. Inicia el servidor
# 5. Ejecuta tests básicos
#
# Uso:
#     ./scripts/quick_start.sh [--docker] [--test] [--clean]
#
# Autor: Equipo MyKaizenFit
# Versión: 1.0.0

set -e  # Salir en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"
LOGS_DIR="$SCRIPTS_DIR/logs"
VENV_DIR="$PROJECT_ROOT/.venv"
DOCKER_MODE=false
RUN_TESTS=false
CLEAN_MODE=false

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}🚀 Script de Inicio Rápido - MyKaizenFit Backend${NC}"
    echo ""
    echo "Uso: $0 [OPCIONES]"
    echo ""
    echo "Opciones:"
    echo "  --docker     Usar Docker para el despliegue"
    echo "  --test       Ejecutar tests después del setup"
    echo "  --clean      Limpiar antes de configurar"
    echo "  --help       Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0                    # Setup básico"
    echo "  $0 --docker          # Setup con Docker"
    echo "  $0 --test            # Setup + tests"
    echo "  $0 --clean           # Limpiar + setup"
    echo "  $0 --docker --test   # Docker + tests"
    echo ""
}

# Función para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"
}

# Función para verificar versión de Python
check_python_version() {
    local version=$1
    local major=$(echo "$version" | cut -d. -f1)
    local minor=$(echo "$version" | cut -d. -f2)
    
    if [ "$major" -eq 3 ] && [ "$minor" -ge 11 ]; then
        return 0
    else
        return 1
    fi
}

# Función para verificar prerrequisitos
check_prerequisites() {
    log "🔍 Verificando prerrequisitos..."
    
    # Verificar Python
    if ! command -v python3 &> /dev/null; then
        error "Python 3 no está instalado"
        log "💡 Instalando Python 3..."
        
        # Detectar sistema operativo
        if command -v apt-get &> /dev/null; then
            # Ubuntu/Debian
            sudo apt-get update
            sudo apt-get install -y python3 python3-pip python3-venv
        elif command -v yum &> /dev/null; then
            # CentOS/RHEL
            sudo yum install -y python3 python3-pip python3-venv
        elif command -v pacman &> /dev/null; then
            # Arch Linux
            sudo pacman -S python python-pip python-virtualenv
        elif command -v brew &> /dev/null; then
            # macOS
            brew install python3
        else
            error "No se pudo instalar Python automáticamente"
            log "💡 Instala Python 3.11+ manualmente desde https://python.org"
            exit 1
        fi
    fi
    
    # Verificar versión de Python
    PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    if ! check_python_version "$PYTHON_VERSION"; then
        error "Se requiere Python 3.11+ (actual: $PYTHON_VERSION)"
        log "💡 Actualizando Python..."
        
        if command -v apt-get &> /dev/null; then
            sudo apt-get install -y python3.11 python3.11-pip python3.11-venv
        elif command -v yum &> /dev/null; then
            sudo yum install -y python3.11 python3.11-pip python3.11-venv
        else
            error "No se pudo actualizar Python automáticamente"
            exit 1
        fi
    fi
    log "✅ Python $PYTHON_VERSION - OK"
    
    # Verificar pip
    if ! command -v pip3 &> /dev/null; then
        warn "pip3 no está instalado, instalando..."
        
        if command -v apt-get &> /dev/null; then
            sudo apt-get install -y python3-pip
        elif command -v yum &> /dev/null; then
            sudo yum install -y python3-pip
        elif command -v pacman &> /dev/null; then
            sudo pacman -S python-pip
        elif command -v brew &> /dev/null; then
            brew install python-pip
        else
            error "No se pudo instalar pip automáticamente"
            exit 1
        fi
    fi
    log "✅ pip3 - OK"
    
    # Verificar git
    if ! command -v git &> /dev/null; then
        warn "git no está instalado, instalando..."
        
        if command -v apt-get &> /dev/null; then
            sudo apt-get install -y git
        elif command -v yum &> /dev/null; then
            sudo yum install -y git
        elif command -v pacman &> /dev/null; then
            sudo pacman -S git
        elif command -v brew &> /dev/null; then
            brew install git
        else
            warn "No se pudo instalar git automáticamente (opcional)"
        fi
    else
        log "✅ git - OK"
    fi
    
    # Verificar Docker (si se solicita)
    if [ "$DOCKER_MODE" = true ]; then
        if ! command -v docker &> /dev/null; then
            error "Docker no está instalado, instalando..."
            
            if command -v apt-get &> /dev/null; then
                # Instalar Docker en Ubuntu/Debian
                curl -fsSL https://get.docker.com -o get-docker.sh
                sudo sh get-docker.sh
                sudo usermod -aG docker $USER
                rm get-docker.sh
            elif command -v yum &> /dev/null; then
                # Instalar Docker en CentOS/RHEL
                sudo yum install -y yum-utils
                sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
                sudo yum install -y docker-ce docker-ce-cli containerd.io
                sudo systemctl start docker
                sudo systemctl enable docker
                sudo usermod -aG docker $USER
            elif command -v pacman &> /dev/null; then
                sudo pacman -S docker
                sudo systemctl start docker
                sudo systemctl enable docker
                sudo usermod -aG docker $USER
            elif command -v brew &> /dev/null; then
                brew install --cask docker
            else
                error "No se pudo instalar Docker automáticamente"
                exit 1
            fi
        fi
        log "✅ Docker - OK"
        
        if ! command -v docker-compose &> /dev/null; then
            warn "docker-compose no está instalado, instalando..."
            
            if command -v apt-get &> /dev/null; then
                sudo apt-get install -y docker-compose-plugin
            elif command -v yum &> /dev/null; then
                sudo yum install -y docker-compose-plugin
            elif command -v pacman &> /dev/null; then
                sudo pacman -S docker-compose
            elif command -v brew &> /dev/null; then
                brew install docker-compose
            else
                error "No se pudo instalar docker-compose automáticamente"
                exit 1
            fi
        fi
        log "✅ docker-compose - OK"
    fi
}

# Función para limpiar
cleanup() {
    if [ "$CLEAN_MODE" = true ]; then
        log "🧹 Limpiando proyecto..."
        
        # Limpiar archivos temporales
        find "$PROJECT_ROOT" -type f -name "*.pyc" -delete 2>/dev/null || true
        find "$PROJECT_ROOT" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
        find "$PROJECT_ROOT" -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
        rm -rf "$PROJECT_ROOT/.pytest_cache" 2>/dev/null || true
        rm -rf "$PROJECT_ROOT/htmlcov" 2>/dev/null || true
        rm -f "$PROJECT_ROOT/.coverage" 2>/dev/null || true
        rm -f "$PROJECT_ROOT/test.log" 2>/dev/null || true
        rm -rf "$PROJECT_ROOT/test_media" 2>/dev/null || true
        
        # Limpiar Docker si está disponible
        if command -v docker &> /dev/null; then
            docker-compose -f "$PROJECT_ROOT/docker-compose.yml" down -v 2>/dev/null || true
            docker system prune -f 2>/dev/null || true
        fi
        
        log "✅ Limpieza completada"
    fi
}

# Función para configurar entorno virtual
setup_virtualenv() {
    if [ "$DOCKER_MODE" = true ]; then
        log "🐳 Modo Docker - Saltando entorno virtual"
        return 0
    fi
    
    log "🔒 Configurando entorno virtual..."
    
    if [ ! -d "$VENV_DIR" ]; then
        log "📦 Creando entorno virtual..."
        python3 -m venv "$VENV_DIR"
    fi
    
    # Activar entorno virtual
    log "🔓 Activando entorno virtual..."
    source "$VENV_DIR/bin/activate"
    
    # Verificar activación
    if [[ "$VIRTUAL_ENV" != "$VENV_DIR" ]]; then
        error "No se pudo activar el entorno virtual"
        exit 1
    fi
    
    log "✅ Entorno virtual activado: $VIRTUAL_ENV"
}

# Función para instalar dependencias
install_dependencies() {
    if [ "$DOCKER_MODE" = true ]; then
        log "🐳 Modo Docker - Saltando instalación de dependencias"
        return 0
    fi
    
    log "📦 Instalando dependencias..."
    
    # Actualizar pip
    pip install --upgrade pip
    
    # Instalar dependencias
    pip install -r "$PROJECT_ROOT/requirements.txt"
    
    log "✅ Dependencias instaladas"
}

# Función para configurar variables de entorno
setup_environment() {
    log "⚙️  Configurando variables de entorno..."
    
    ENV_FILE="$PROJECT_ROOT/.env"
    ENV_EXAMPLE="$PROJECT_ROOT/env.example"
    
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$ENV_EXAMPLE" ]; then
            log "📋 Copiando archivo de ejemplo..."
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            warn "⚠️  Archivo .env creado. Edítalo con tus credenciales antes de continuar."
            warn "   Presiona Enter cuando hayas configurado el archivo .env..."
            read -r
        else
            error "No se encontró env.example"
            exit 1
        fi
    else
        log "✅ Archivo .env ya existe"
    fi
}

# Función para configurar base de datos
setup_database() {
    if [ "$DOCKER_MODE" = true ]; then
        log "🐳 Configurando base de datos con Docker..."
        
        # Levantar servicios
        cd "$PROJECT_ROOT"
        docker-compose up -d --build
        
        # Esperar a que la base de datos esté lista
        log "⏳ Esperando que la base de datos esté lista..."
        sleep 10
        
        # Ejecutar migraciones
        docker-compose exec -T web python manage.py migrate
        
        # Crear datos demo
        docker-compose exec -T web python manage.py seed_demo
        
        log "✅ Base de datos configurada con Docker"
    else
        log "🗄️  Configurando base de datos..."
        
        # Verificar conexión
        cd "$PROJECT_ROOT"
        python manage.py check --database default
        
        # Ejecutar migraciones
        python manage.py migrate
        
        # Crear datos demo
        python manage.py seed_demo
        
        log "✅ Base de datos configurada"
    fi
}

# Función para ejecutar tests
run_tests() {
    if [ "$RUN_TESTS" = false ]; then
        return 0
    fi
    
    log "🧪 Ejecutando tests..."
    
    if [ "$DOCKER_MODE" = true ]; then
        # Tests con Docker
        cd "$PROJECT_ROOT"
        docker-compose exec -T web python -m pytest --tb=short
    else
        # Tests locales
        cd "$PROJECT_ROOT"
        python -m pytest --tb=short
    fi
    
    log "✅ Tests completados"
}

# Función para iniciar servidor
start_server() {
    if [ "$DOCKER_MODE" = true ]; then
        log "🐳 Servidor ya está ejecutándose con Docker"
        log "🌐 Accede a: http://localhost:8000"
        log "📚 Swagger: http://localhost:8000/api/docs/"
        log "🔧 Admin: http://localhost:8000/admin/"
        log ""
        log "Para detener: docker-compose down"
        log "Para ver logs: docker-compose logs -f"
    else
        log "🚀 Iniciando servidor..."
        log "🌐 Accede a: http://localhost:8000"
        log "📚 Swagger: http://localhost:8000/api/docs/"
        log "🔧 Admin: http://localhost:8000/admin/"
        log ""
        log "Para detener: Ctrl+C"
        log ""
        
        cd "$PROJECT_ROOT"
        python manage.py runserver
    fi
}

# Función para mostrar información final
show_final_info() {
    echo ""
    echo -e "${GREEN}🎉 ¡Proyecto MyKaizenFit configurado exitosamente!${NC}"
    echo ""
    echo -e "${BLUE}📱 URLs principales:${NC}"
    echo "   • API: http://localhost:8000/api/"
    echo "   • Swagger: http://localhost:8000/api/docs/"
    echo "   • Admin: http://localhost:8000/admin/"
    echo "   • Health: http://localhost:8000/api/health/"
    echo ""
    echo -e "${BLUE}👥 Usuarios demo:${NC}"
    echo "   • Admin: admin@example.invalid / ChangeMeAdmin123!"
    echo "   • Trainer: trainer@example.invalid / ChangeMeTrainer123!"
    echo "   • User: user1@example.invalid / ChangeMeUser123!"
    echo ""
    echo -e "${BLUE}🔧 Comandos útiles:${NC}"
    echo "   • Ver logs: tail -f scripts/logs/*.log"
    echo "   • Ejecutar tests: python scripts/run_tests.py"
    echo "   • Mantenimiento: python scripts/maintenance.py"
    echo "   • Limpiar: python scripts/maintenance.py --clean"
    echo ""
    echo -e "${BLUE}📚 Documentación:${NC}"
    echo "   • docs/README.md - Índice de documentación"
    echo "   • docs/deployment.md - Guía de despliegue"
    echo "   • docs/urls.md - Documentación de endpoints"
    echo "   • docs/testing.md - Guía de testing"
    echo ""
}

# Función principal
main() {
    # Parsear argumentos
    while [[ $# -gt 0 ]]; do
        case $1 in
            --docker)
                DOCKER_MODE=true
                shift
                ;;
            --test)
                RUN_TESTS=true
                shift
                ;;
            --clean)
                CLEAN_MODE=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                error "Opción desconocida: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Crear directorios necesarios
    mkdir -p "$LOGS_DIR"
    
    # Banner
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                🚀 MyKaizenFit Backend                      ║"
    echo "║                    Script de Inicio Rápido                 ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Ejecutar pasos
    check_prerequisites
    cleanup
    setup_virtualenv
    install_dependencies
    setup_environment
    setup_database
    
    if [ "$RUN_TESTS" = true ]; then
        run_tests
    fi
    
    show_final_info
    
    # Iniciar servidor si no se ejecutaron tests
    if [ "$RUN_TESTS" = false ]; then
        start_server
    fi
}

# Función de limpieza al salir
cleanup_on_exit() {
    if [ "$DOCKER_MODE" = true ]; then
        log "🛑 Deteniendo servicios Docker..."
        cd "$PROJECT_ROOT"
        docker-compose down 2>/dev/null || true
    fi
}

# Configurar trap para limpieza
trap cleanup_on_exit EXIT

# Ejecutar función principal
main "$@" 