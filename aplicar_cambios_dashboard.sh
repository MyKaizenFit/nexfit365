#!/bin/bash
echo "🔄 APLICANDO CAMBIOS DEL NUEVO DASHBOARD"
echo "========================================"
echo ""

echo "1️⃣ Reiniciando contenedor frontend..."
sudo docker restart nexfit-pro-frontend-1

echo ""
echo "⏳ Esperando 15 segundos para que el contenedor inicie..."
sleep 15

echo ""
echo "📊 Verificando estado del contenedor..."
if sudo docker ps | grep -q "frontend"; then
  echo "✅ Contenedor frontend está corriendo"
else
  echo "❌ Contenedor frontend NO está corriendo"
  exit 1
fi

echo ""
echo "✅ PASOS SIGUIENTES:"
echo "==================="
echo "1. Espera a ver 'compiled successfully' en los logs (30-60 segundos)"
echo "2. Abre http://localhost:3001/dashboard en tu navegador"
echo "3. Presiona Ctrl+Shift+R (o Cmd+Shift+R en Mac) para limpiar caché"
echo "4. Deberías ver un badge verde que dice 'Dashboard Nuevo - Versión Mejorada'"
echo ""
echo "💡 Para ver los logs en tiempo real:"
echo "   sudo docker logs -f nexfit-pro-frontend-1"
