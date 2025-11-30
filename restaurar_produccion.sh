#!/bin/bash
# Script para verificar y restaurar producción si es necesario

echo "=========================================="
echo "  VERIFICANDO PRODUCCIÓN (Puerto 3000)"
echo "=========================================="
echo ""

# Ir al directorio de producción
cd /srv/mykaizenfit 2>/dev/null || {
    echo "⚠️  No se encontró el directorio de producción en /srv/mykaizenfit"
    echo "Por favor, verifica la ruta correcta"
    exit 1
}

# Verificar si docker-compose.yml existe
if [ ! -f "docker-compose.yml" ]; then
    echo "⚠️  No se encontró docker-compose.yml en /srv/mykaizenfit"
    echo "Verificando estructura..."
    ls -la
    exit 1
fi

echo "1. Verificando estado de contenedores de producción..."
docker compose ps

echo ""
echo "2. Verificando si los servicios están corriendo..."
STATUS=$(docker compose ps --services --filter "status=running" | wc -l)
if [ "$STATUS" -eq "0" ]; then
    echo "⚠️  Los servicios de producción NO están corriendo"
    echo ""
    echo "¿Quieres levantarlos? (s/n)"
    read -r response
    if [ "$response" = "s" ] || [ "$response" = "S" ]; then
        echo "Levantando servicios de producción..."
        docker compose up -d
        echo "Esperando 10 segundos para que los servicios inicien..."
        sleep 10
        docker compose ps
    fi
else
    echo "✓ Los servicios de producción están corriendo"
fi

echo ""
echo "3. Verificando puertos..."
if netstat -tuln 2>/dev/null | grep -q ":3000 "; then
    echo "✓ Puerto 3000 está en uso"
else
    echo "⚠️  Puerto 3000 NO está en uso"
fi

if netstat -tuln 2>/dev/null | grep -q ":8000 "; then
    echo "✓ Puerto 8000 está en uso"
else
    echo "⚠️  Puerto 8000 NO está en uso"
fi

echo ""
echo "=========================================="
echo "  VERIFICACIÓN COMPLETA"
echo "=========================================="

