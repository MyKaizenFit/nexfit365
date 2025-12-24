#!/bin/bash

# Script de despliegue para MyKaizenFit
# Uso: ./deploy.sh [backend|frontend|all]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para verificar dependencias
check_dependencies() {
    print_message "Verificando dependencias..."
    
    if ! command -v git &> /dev/null; then
        print_error "Git no está instalado"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_warning "Docker no está instalado. Algunas funciones pueden no estar disponibles."
    fi
    
    print_message "Dependencias verificadas ✓"
}

# Función para ejecutar tests
run_tests() {
    print_message "Ejecutando tests..."
    
    # Tests del backend
    if [ -d "backend" ]; then
        print_message "Ejecutando tests del backend..."
        cd backend
        python manage.py test --settings=test_settings
        cd ..
        print_message "Tests del backend completados ✓"
    fi
    
    # Tests del frontend
    if [ -d "frontend" ]; then
        print_message "Ejecutando tests del frontend..."
        cd frontend
        npm test -- --coverage --watchAll=false
        cd ..
        print_message "Tests del frontend completados ✓"
    fi
}

# Función para construir imágenes Docker
build_docker_images() {
    print_message "Construyendo imágenes Docker..."
    
    if [ -d "backend" ]; then
        print_message "Construyendo imagen del backend..."
        docker build -t mykaizenfit-backend ./backend
        print_message "Imagen del backend construida ✓"
    fi
    
    if [ -d "frontend" ]; then
        print_message "Construyendo imagen del frontend..."
        docker build -t mykaizenfit-frontend ./frontend
        print_message "Imagen del frontend construida ✓"
    fi
}

# Función para desplegar con Docker Compose
deploy_docker() {
    print_message "Desplegando con Docker Compose..."
    
    # Verificar si existe el archivo de configuración
    if [ ! -f "docker-compose.prod.yml" ]; then
        print_error "Archivo docker-compose.prod.yml no encontrado"
        exit 1
    fi
    
    # Crear archivo .env si no existe
    if [ ! -f ".env" ]; then
        print_warning "Creando archivo .env desde ejemplo..."
        cp env.production.example .env
        print_warning "Por favor, configura las variables en .env antes de continuar"
        exit 1
    fi
    
    # Desplegar
    docker-compose -f docker-compose.prod.yml up -d
    
    print_message "Despliegue con Docker completado ✓"
    print_message "Backend: http://localhost:8000"
    print_message "Frontend: http://localhost:3000"
}

# Función para desplegar en Render
deploy_render() {
    print_message "Desplegando backend en Render..."
    
    if [ ! -f "backend/render.yaml" ]; then
        print_error "Archivo render.yaml no encontrado"
        exit 1
    fi
    
    print_message "Para desplegar en Render:"
    print_message "1. Conecta tu repositorio en https://render.com"
    print_message "2. Selecciona el archivo render.yaml"
    print_message "3. Configura las variables de entorno"
    print_message "4. Despliega"
}

# Función para desplegar en Vercel
deploy_vercel() {
    print_message "Desplegando frontend en Vercel..."
    
    if [ ! -f "frontend/vercel.json" ]; then
        print_error "Archivo vercel.json no encontrado"
        exit 1
    fi
    
    print_message "Para desplegar en Vercel:"
    print_message "1. Instala Vercel CLI: npm i -g vercel"
    print_message "2. Ejecuta: cd frontend && vercel"
    print_message "3. Sigue las instrucciones"
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [OPCIÓN]"
    echo ""
    echo "Opciones:"
    echo "  backend     Desplegar solo el backend"
    echo "  frontend    Desplegar solo el frontend"
    echo "  all         Desplegar todo (backend + frontend)"
    echo "  test        Solo ejecutar tests"
    echo "  docker      Desplegar con Docker Compose"
    echo "  render      Mostrar instrucciones para Render"
    echo "  vercel      Mostrar instrucciones para Vercel"
    echo "  help        Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 test                    # Ejecutar tests"
    echo "  $0 docker                  # Desplegar con Docker"
    echo "  $0 all                     # Desplegar todo"
}

# Función principal
main() {
    case "${1:-help}" in
        "backend")
            check_dependencies
            run_tests
            deploy_render
            ;;
        "frontend")
            check_dependencies
            run_tests
            deploy_vercel
            ;;
        "all")
            check_dependencies
            run_tests
            deploy_render
            deploy_vercel
            ;;
        "test")
            check_dependencies
            run_tests
            ;;
        "docker")
            check_dependencies
            run_tests
            build_docker_images
            deploy_docker
            ;;
        "render")
            deploy_render
            ;;
        "vercel")
            deploy_vercel
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Ejecutar función principal
main "$@"

