#!/bin/bash
# Script para reconstruir el frontend con las nuevas variables de entorno HTTPS
# Ejecutar con: sudo ./reconstruir-frontend.sh

set -e

echo "🔨 Reconstruyendo frontend con configuración HTTPS..."
echo ""

cd /srv/mykaizenfit/pro/frontend

# Verificar que las variables de entorno están configuradas
echo "📋 Verificando configuración..."
if [ -f .env.local ]; then
    echo "✅ Archivo .env.local encontrado:"
    cat .env.local
    echo ""
else
    echo "❌ Error: No se encuentra .env.local"
    exit 1
fi

# Limpiar directorio .next y archivos de pnpm (requiere sudo)
echo "🧹 Limpiando directorio .next y archivos de pnpm..."
rm -rf .next
rm -f pnpm-lock.yaml
echo "✅ Directorio .next y pnpm-lock.yaml eliminados"
echo ""

# Cambiar permisos del directorio frontend al usuario que ejecutó sudo
# Si SUDO_USER está definido, usarlo; si no, usar el usuario actual
CURRENT_USER=${SUDO_USER:-$(whoami)}
echo "🔐 Cambiando permisos del directorio a $CURRENT_USER..."
chown -R $CURRENT_USER:$CURRENT_USER /srv/mykaizenfit/pro/frontend
echo "✅ Permisos actualizados"
echo ""

# Reconstruir (como usuario normal, no root)
echo "🔨 Construyendo frontend (esto puede tardar varios minutos)..."
sudo -u $CURRENT_USER npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Frontend reconstruido exitosamente con HTTPS"
    echo ""
    echo "📋 Nueva configuración:"
    echo "   API URL: https://api.nexfit365.dpdns.org/api"
    echo ""
    echo "⚠️  IMPORTANTE: Reinicia el servidor de Next.js para aplicar los cambios"
    echo "   Si está corriendo en modo desarrollo: reinicia el proceso 'npm run dev'"
    echo "   Si está corriendo en modo producción: reinicia el proceso 'npm run start'"
else
    echo ""
    echo "❌ Error al reconstruir el frontend"
    exit 1
fi

