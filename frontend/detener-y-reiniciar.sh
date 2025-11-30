#!/bin/bash
# Script para detener TODOS los procesos de Next.js y reiniciar correctamente
# Ejecutar con: sudo ./detener-y-reiniciar.sh

set -e

echo "🛑 Deteniendo TODOS los procesos de Next.js..."
echo ""

# Obtener el usuario que ejecutó sudo
CURRENT_USER=${SUDO_USER:-$(whoami)}
if [ "$CURRENT_USER" = "root" ]; then
    CURRENT_USER="iago"
fi

echo "👤 Usuario: $CURRENT_USER"
echo ""

# 1. Detener TODOS los procesos de Next.js (incluso los de root)
echo "🛑 Deteniendo procesos de Next.js..."
pkill -9 -f "next" 2>/dev/null || true
pkill -9 -f "node.*next" 2>/dev/null || true
sleep 3

# Verificar que se detuvieron
if pgrep -f "next|node.*next" > /dev/null; then
    echo "⚠️  Algunos procesos aún están corriendo, intentando de nuevo..."
    sleep 2
    pkill -9 -f "next" 2>/dev/null || true
    pkill -9 -f "node.*next" 2>/dev/null || true
    sleep 2
fi

# Verificar una vez más
if pgrep -f "next|node.*next" > /dev/null; then
    echo "❌ Error: No se pudieron detener todos los procesos"
    echo "   Procesos restantes:"
    ps aux | grep -E "next|node.*next" | grep -v grep
    exit 1
fi

echo "✅ Todos los procesos detenidos"
echo ""

# 2. Liberar el puerto 3001
echo "🔌 Liberando puerto 3001..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1
echo "✅ Puerto 3001 liberado"
echo ""

# 3. Cambiar al directorio correcto
cd /srv/mykaizenfit/pro/frontend

# 4. Verificar configuración
echo "📋 Verificando configuración..."
if [ -f .env.local ]; then
    echo "✅ Archivo .env.local encontrado:"
    cat .env.local
    echo ""
else
    echo "❌ Error: No se encuentra .env.local"
    exit 1
fi

# 5. Limpiar directorio .next
echo "🧹 Limpiando directorio .next..."
rm -rf .next
rm -f pnpm-lock.yaml
echo "✅ Limpieza completada"
echo ""

# 6. Cambiar permisos
echo "🔐 Cambiando permisos del directorio a $CURRENT_USER..."
chown -R $CURRENT_USER:$CURRENT_USER /srv/mykaizenfit/pro/frontend
echo "✅ Permisos actualizados"
echo ""

# 7. Reconstruir
echo "🔨 Construyendo frontend (esto puede tardar varios minutos)..."
echo "   Por favor, espera..."
sudo -u $CURRENT_USER npm run build

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Error al reconstruir el frontend"
    exit 1
fi

echo ""
echo "✅ Frontend reconstruido exitosamente"
echo ""

# 8. Asegurar permisos del .next generado
echo "🔐 Ajustando permisos del directorio .next..."
chown -R $CURRENT_USER:$CURRENT_USER /srv/mykaizenfit/pro/frontend/.next
echo "✅ Permisos ajustados"
echo ""

# 9. Iniciar servidor en modo producción
echo "🚀 Iniciando servidor de Next.js en modo producción..."
echo "   Puerto: 3001"
echo "   Directorio: /srv/mykaizenfit/pro/frontend"
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
    echo "📝 Logs del servidor: /tmp/nextjs-frontend.log"
    echo "   Ver logs: tail -f /tmp/nextjs-frontend.log"
    echo ""
    echo "🔍 Verificando proceso:"
    ps aux | grep -E "next.*start|node.*next.*start" | grep -v grep | head -2
else
    echo "⚠️  El servidor no parece estar corriendo. Verifica los logs:"
    echo "   tail -f /tmp/nextjs-frontend.log"
    echo ""
    echo "   Últimas líneas del log:"
    tail -20 /tmp/nextjs-frontend.log 2>/dev/null || echo "   No hay logs disponibles"
fi

