#!/bin/bash
# Script completo para solucionar el problema del frontend
# Ejecutar con: sudo ./solucion-completa.sh

set -e

echo "🔧 Solución completa para el frontend"
echo "======================================"
echo ""

# Obtener el usuario que ejecutó sudo
CURRENT_USER=${SUDO_USER:-$(whoami)}
if [ "$CURRENT_USER" = "root" ]; then
    CURRENT_USER="iago"
fi

echo "👤 Usuario: $CURRENT_USER"
echo ""

# 1. Detener TODOS los procesos de Next.js
echo "🛑 Paso 1: Deteniendo TODOS los procesos de Next.js..."

# Obtener todos los PIDs de procesos de Next.js
NEXT_PIDS=$(pgrep -f "next|node.*next" 2>/dev/null || true)

if [ -n "$NEXT_PIDS" ]; then
    echo "   Encontrados procesos: $NEXT_PIDS"
    # Matar cada proceso individualmente
    for pid in $NEXT_PIDS; do
        kill -9 $pid 2>/dev/null || true
    done
    sleep 3
fi

# Intentar matar de nuevo por nombre
pkill -9 -f "next" 2>/dev/null || true
pkill -9 -f "node.*next" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "next start" 2>/dev/null || true
sleep 3

# Verificar una vez más
REMAINING=$(pgrep -f "next|node.*next" 2>/dev/null || true)
if [ -n "$REMAINING" ]; then
    echo "⚠️  Algunos procesos aún están corriendo, intentando detenerlos por PID..."
    for pid in $REMAINING; do
        echo "   Intentando detener PID: $pid"
        kill -9 $pid 2>/dev/null || true
    done
    sleep 2
fi

# Verificación final
if pgrep -f "next|node.*next" > /dev/null; then
    echo "⚠️  Algunos procesos aún están corriendo:"
    ps aux | grep -E "next|node.*next" | grep -v grep
    echo ""
    echo "   Continuando de todas formas..."
else
    echo "✅ Todos los procesos detenidos"
fi

echo "✅ Todos los procesos detenidos"
echo ""

# 2. Liberar el puerto 3001
echo "🔌 Paso 2: Liberando puerto 3001..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1
echo "✅ Puerto 3001 liberado"
echo ""

# 3. Cambiar al directorio correcto
cd /srv/mykaizenfit/pro/frontend
echo "📁 Directorio de trabajo: $(pwd)"
echo ""

# 4. Verificar configuración
echo "📋 Paso 3: Verificando configuración..."
if [ -f .env.local ]; then
    echo "✅ Archivo .env.local encontrado:"
    cat .env.local
    echo ""
else
    echo "❌ Error: No se encuentra .env.local"
    exit 1
fi

# 5. Limpiar completamente
echo "🧹 Paso 4: Limpiando directorio .next y archivos temporales..."
rm -rf .next
rm -f pnpm-lock.yaml
rm -rf node_modules/.cache
echo "✅ Limpieza completada"
echo ""

# 6. Cambiar permisos
echo "🔐 Paso 5: Cambiando permisos del directorio a $CURRENT_USER..."
chown -R $CURRENT_USER:$CURRENT_USER /srv/mykaizenfit/pro/frontend
echo "✅ Permisos actualizados"
echo ""

# 7. Reconstruir
echo "🔨 Paso 6: Construyendo frontend (esto puede tardar varios minutos)..."
echo "   Por favor, espera..."
echo ""

sudo -u $CURRENT_USER npm run build 2>&1 | tee /tmp/build-frontend.log

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Error al reconstruir el frontend"
    echo "   Ver logs: cat /tmp/build-frontend.log"
    exit 1
fi

echo ""
echo "✅ Frontend reconstruido exitosamente"
echo ""

# 8. Verificar que el build se completó
echo "🔍 Paso 7: Verificando que el build se completó..."
if [ -f .next/server/app/page.js ]; then
    echo "✅ Archivo page.js encontrado en el directorio correcto"
    ls -lh .next/server/app/page.js
else
    echo "⚠️  Archivo page.js no encontrado, buscando alternativas..."
    find .next -name "page.js" 2>/dev/null | head -5
    if [ $? -ne 0 ]; then
        echo "❌ Error: El build no se completó correctamente"
        exit 1
    fi
fi
echo ""

# 9. Asegurar permisos del .next generado
echo "🔐 Paso 8: Ajustando permisos del directorio .next..."
chown -R $CURRENT_USER:$CURRENT_USER /srv/mykaizenfit/pro/frontend/.next
echo "✅ Permisos ajustados"
echo ""

# 10. Iniciar servidor en modo producción
echo "🚀 Paso 9: Iniciando servidor de Next.js en modo producción..."
echo "   Puerto: 3001"
echo "   Directorio: $(pwd)"
echo ""

# Asegurar que el puerto esté libre
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1

# Iniciar en background como usuario normal desde el directorio correcto
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
    echo "   - Directorio: /srv/mykaizenfit/pro/frontend"
    echo ""
    echo "🔍 Proceso corriendo:"
    ps aux | grep -E "next.*start|node.*next.*start" | grep -v grep | head -2
    echo ""
    echo "📝 Logs del servidor: /tmp/nextjs-frontend.log"
    echo "   Ver logs: tail -f /tmp/nextjs-frontend.log"
    echo ""
    echo "🌐 Verificar que funciona:"
    echo "   curl -I http://localhost:3001"
else
    echo "⚠️  El servidor no parece estar corriendo"
    echo ""
    echo "📝 Últimas líneas del log:"
    tail -30 /tmp/nextjs-frontend.log 2>/dev/null || echo "   No hay logs disponibles"
    echo ""
    echo "🔍 Verificando procesos:"
    ps aux | grep -E "next|node.*next" | grep -v grep
fi

