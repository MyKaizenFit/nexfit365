#!/bin/bash
# Script para copiar el build de .next-local a .next
# Este script debe ejecutarse con sudo si .next tiene permisos de root

set -e

echo "🔄 Copiando build de .next-local a .next..."

if [ -d ".next-local" ]; then
    # Intentar copiar sin sudo primero
    if rm -rf .next 2>/dev/null && cp -r .next-local .next 2>/dev/null; then
        echo "✅ Build copiado exitosamente"
    else
        echo "⚠️  No se pudo copiar sin permisos. Ejecuta con sudo:"
        echo "   sudo rm -rf .next && sudo cp -r .next-local .next && sudo chown -R iago:iago .next"
        exit 1
    fi
else
    echo "❌ No se encontró el directorio .next-local"
    echo "   Ejecuta primero: NEXT_DIST_DIR=.next-local npm run build"
    exit 1
fi


