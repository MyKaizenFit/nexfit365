#!/bin/bash
# Script para reconstruir el frontend con la nueva URL HTTPS
# Ejecutar con: sudo ./build-con-https.sh

set -e

echo "🔨 Reconstruyendo frontend con configuración HTTPS..."
echo "======================================================"
echo ""

# Obtener el usuario que ejecutó sudo
CURRENT_USER=${SUDO_USER:-$(whoami)}
if [ "$CURRENT_USER" = "root" ]; then
    CURRENT_USER="iago"
fi

echo "👤 Usuario: $CURRENT_USER"
echo ""

cd /srv/mykaizenfit/pro/frontend

# 1. Verificar configuración
echo "📋 Paso 1: Verificando configuración..."
if [ -f .env.local ]; then
    echo "✅ Archivo .env.local encontrado:"
    cat .env.local
    echo ""
    
    # Verificar que tenga la URL HTTPS
    if grep -q "https://api.nexfit365.dpdns.org" .env.local; then
        echo "✅ URL HTTPS configurada correctamente"
    else
        echo "⚠️  La URL HTTPS no está en .env.local, actualizando..."
        echo "NEXT_PUBLIC_API_URL=https://api.nexfit365.dpdns.org/api" > .env.local
        echo "✅ .env.local actualizado con URL HTTPS"
    fi
else
    echo "⚠️  No se encuentra .env.local, creándolo..."
    echo "NEXT_PUBLIC_API_URL=https://api.nexfit365.dpdns.org/api" > .env.local
    echo "✅ .env.local creado con URL HTTPS"
fi
echo ""

# 2. Detener procesos de Next.js
echo "🛑 Paso 2: Deteniendo procesos de Next.js..."
pkill -9 -f "next" 2>/dev/null || true
pkill -9 -f "node.*next" 2>/dev/null || true
sleep 2
echo "✅ Procesos detenidos"
echo ""

# 3. Limpiar completamente
echo "🧹 Paso 3: Limpiando directorio .next y archivos temporales..."
rm -rf .next
rm -f pnpm-lock.yaml
rm -rf node_modules/.cache
echo "✅ Limpieza completada"
echo ""

# 4. Cambiar permisos
echo "🔐 Paso 4: Asegurando permisos correctos..."
chown -R $CURRENT_USER:$CURRENT_USER /srv/mykaizenfit/pro/frontend
echo "✅ Permisos actualizados"
echo ""

# 5. Reconstruir
echo "🔨 Paso 5: Construyendo frontend con nueva URL HTTPS..."
echo "   Esto puede tardar varios minutos..."
echo ""

sudo -u $CURRENT_USER npm run build 2>&1 | tee /tmp/build-frontend-https.log

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Error al reconstruir el frontend"
    echo "   Ver logs: cat /tmp/build-frontend-https.log"
    exit 1
fi

echo ""
echo "✅ Frontend reconstruido exitosamente"
echo ""

# 6. Verificar que el build tiene la URL correcta
echo "🔍 Paso 6: Verificando que el build usa la URL HTTPS..."
if grep -r "https://api.nexfit365.dpdns.org" .next 2>/dev/null | head -1 > /dev/null; then
    echo "✅ Build contiene la URL HTTPS correcta"
elif grep -r "45.136.19.91" .next 2>/dev/null | head -1 > /dev/null; then
    echo "⚠️  El build todavía contiene la URL antigua"
    echo "   Esto puede ser normal si solo está en archivos de cache"
else
    echo "✅ No se encontró la URL antigua en el build"
fi
echo ""

# 7. Ajustar permisos del .next generado
echo "🔐 Paso 7: Ajustando permisos del directorio .next..."
chown -R $CURRENT_USER:$CURRENT_USER /srv/mykaizenfit/pro/frontend/.next
echo "✅ Permisos ajustados"
echo ""

# 8. Iniciar servidor
echo "🚀 Paso 8: Iniciando servidor de Next.js en modo producción..."
echo "   Puerto: 3001"
echo ""

# Liberar puerto
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1

# Iniciar en background
cd /srv/mykaizenfit/pro/frontend
sudo -u $CURRENT_USER bash -c "cd /srv/mykaizenfit/pro/frontend && PORT=3001 npm run start > /tmp/nextjs-frontend.log 2>&1 &"

sleep 5

# Verificar que está corriendo
if pgrep -f "next.*start|node.*next.*start" > /dev/null; then
    echo "✅ Servidor iniciado correctamente"
    echo ""
    echo "📋 Configuración aplicada:"
    echo "   - API URL: https://api.nexfit365.dpdns.org/api"
    echo "   - Puerto: 3001"
    echo "   - Modo: Producción"
    echo ""
    echo "📝 Logs del servidor: /tmp/nextjs-frontend.log"
    echo "   Ver logs: tail -f /tmp/nextjs-frontend.log"
    echo ""
    echo "🌐 Verificar que funciona:"
    echo "   curl -I http://localhost:3001"
else
    echo "⚠️  El servidor no parece estar corriendo"
    echo "   Verifica los logs: tail -f /tmp/nextjs-frontend.log"
fi

