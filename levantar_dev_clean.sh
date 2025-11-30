#!/bin/bash
# Script para levantar el entorno de desarrollo limpio
# Usa docker-compose.dev-clean.yml (sin volúmenes montados)

set -e  # Salir si hay errores

PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.dev-clean.yml"

echo "🧹 Levantando entorno de desarrollo LIMPIO"
echo "=========================================="
echo ""
echo "📋 Configuración:"
echo "   - Archivo: $COMPOSE_FILE"
echo "   - Proyecto: $PROJECT_NAME"
echo "   - Base de datos: mykaizenfit_dev"
echo "   - Puertos: Backend 8001, Frontend 3001, DB 5434"
echo ""

cd /srv/mykaizenfit/pro

# Verificar que estamos en el directorio correcto
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: No se encuentra $COMPOSE_FILE"
    echo "   Asegúrate de estar en /srv/mykaizenfit/pro"
    exit 1
fi

# Opciones
BUILD=false
FORCE_REBUILD=false
DOWN=false

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --build|-b)
            BUILD=true
            shift
            ;;
        --force-rebuild|-f)
            FORCE_REBUILD=true
            shift
            ;;
        --down|-d)
            DOWN=true
            shift
            ;;
        --help|-h)
            echo "Uso: $0 [opciones]"
            echo ""
            echo "Opciones:"
            echo "  --build, -b        Construir imágenes antes de levantar"
            echo "  --force-rebuild    Construir imágenes sin caché"
            echo "  --down, -d         Parar servicios"
            echo "  --help, -h         Mostrar esta ayuda"
            echo ""
            echo "Ejemplos:"
            echo "  $0                 # Levantar servicios"
            echo "  $0 --build         # Construir y levantar"
            echo "  $0 --force-rebuild # Reconstruir sin caché y levantar"
            echo "  $0 --down          # Parar servicios"
            exit 0
            ;;
        *)
            echo "❌ Opción desconocida: $1"
            echo "   Usa --help para ver las opciones disponibles"
            exit 1
            ;;
    esac
done

# Si se pide parar
if [ "$DOWN" = true ]; then
    echo "🛑 Parando servicios..."
    COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE down
    echo "✅ Servicios parados"
    exit 0
fi

# Construir si es necesario
if [ "$FORCE_REBUILD" = true ]; then
    echo "🔨 Reconstruyendo imágenes (sin caché)..."
    COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE build --no-cache
    BUILD=true
elif [ "$BUILD" = true ]; then
    echo "🔨 Construyendo imágenes..."
    COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE build
fi

# Levantar servicios
echo ""
echo "🚀 Levantando servicios..."
COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE up -d

# Esperar un poco
echo ""
echo "⏳ Esperando a que los servicios inicien..."
sleep 5

# Verificar estado
echo ""
echo "📊 Estado de los servicios:"
COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE ps

echo ""
echo "✅ Servicios levantados"
echo ""
echo "📝 URLs:"
echo "   - Backend: http://localhost:8001/api/health/"
echo "   - Frontend: http://localhost:3001/"
echo "   - Base de datos: localhost:5434"
echo ""
echo "🔍 Ver logs:"
echo "   COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE logs -f"
echo ""
echo "🛑 Parar servicios:"
echo "   COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE down"
echo ""
