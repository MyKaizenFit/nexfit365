#!/bin/bash
# Script completo para reconstruir y reiniciar el frontend con HTTPS
# Ejecutar con: sudo ./reconstruir-y-reiniciar.sh

set -e

echo "🔄 Reconstruyendo y reiniciando frontend con configuración HTTPS..."
echo ""

cd /srv/mykaizenfit/pro/frontend

# Obtener el usuario que ejecutó sudo
CURRENT_USER=${SUDO_USER:-$(whoami)}
if [ "$CURRENT_USER" = "root" ]; then
    CURRENT_USER="iago"
fi

echo "👤 Usuario: $CURRENT_USER"
echo ""

# 1. Detener todos los procesos de Next.js
echo "🛑 Deteniendo procesos de Next.js..."
pkill -f "next dev|next-server|node.*next" 2>/dev/null || true
sleep 2

# Verificar que se detuvieron
if pgrep -f "next dev|next-server|node.*next" > /dev/null; then
    echo "⚠️  Algunos procesos aún están corriendo, forzando detención..."
    pkill -9 -f "next dev|next-server|node.*next" 2>/dev/null || true
    sleep 1
fi
echo "✅ Procesos detenidos"
echo ""

# 2. Verificar configuración
echo "📋 Verificando configuración..."
if [ -f .env.local ]; then
    echo "✅ Archivo .env.local encontrado:"
    cat .env.local
    echo ""
else
    echo "❌ Error: No se encuentra .env.local"
    exit 1
fi

# 3. Limpiar directorio .next y archivos de pnpm
echo "🧹 Limpiando directorio .next y archivos de pnpm..."
rm -rf .next
rm -f pnpm-lock.yaml
echo "✅ Limpieza completada"
echo ""

# 4. Cambiar permisos del directorio frontend
echo "🔐 Cambiando permisos del directorio a $CURRENT_USER..."
chown -R $CURRENT_USER:$CURRENT_USER /srv/mykaizenfit/pro/frontend
echo "✅ Permisos actualizados"
echo ""

# 5. Reconstruir (como usuario normal, no root)
echo "🔨 Construyendo frontend (esto puede tardar varios minutos)..."
echo "   Por favor, espera..."
sudo -u $CURRENT_USER npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Frontend reconstruido exitosamente"
    echo ""
    
    # 6. Asegurar permisos del .next generado
    echo "🔐 Ajustando permisos del directorio .next..."
    chown -R $CURRENT_USER:$CURRENT_USER /srv/mykaizenfit/pro/frontend/.next
    echo "✅ Permisos ajustados"
    echo ""
    
    # 7. Iniciar servidor en modo producción
    echo "🚀 Iniciando servidor de Next.js en modo producción..."
    echo "   Puerto: 3001"
    echo ""
    
    # Detener cualquier proceso que pueda estar usando el puerto 3001
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    sleep 1
    
    # Iniciar en background como usuario normal
    cd /srv/mykaizenfit/pro/frontend
    sudo -u $CURRENT_USER nohup npm run start -- -p 3001 > /tmp/nextjs-frontend.log 2>&1 &
    
    sleep 3
    
    # Verificar que está corriendo
    if pgrep -f "next.*3001|node.*3001" > /dev/null; then
        echo "✅ Servidor iniciado correctamente"
        echo ""
        echo "📋 Configuración aplicada:"
        echo "   - API URL: https://api.nexfit365.dpdns.org/api"
        echo "   - Puerto: 3001"
        echo "   - Modo: Producción"
        echo ""
        echo "📝 Logs del servidor: /tmp/nextjs-frontend.log"
        echo "   Ver logs: tail -f /tmp/nextjs-frontend.log"
    else
        echo "⚠️  El servidor no parece estar corriendo. Verifica los logs:"
        echo "   tail -f /tmp/nextjs-frontend.log"
    fi
else
    echo ""
    echo "❌ Error al reconstruir el frontend"
    exit 1
fi

