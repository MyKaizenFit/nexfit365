#!/bin/bash
echo "🔄 Reiniciando frontend para aplicar cambios del nuevo dashboard..."
echo ""

# Reiniciar el contenedor
echo "1️⃣ Reiniciando contenedor frontend..."
sudo docker restart nexfit-pro-frontend-1

echo "⏳ Esperando 10 segundos para que el contenedor inicie..."
sleep 10

echo "📊 Verificando estado del contenedor..."
sudo docker ps | grep frontend

echo ""
echo "✅ Siguiente paso:"
echo "   1. Espera a ver 'compiled successfully' en los logs"
echo "   2. Abre http://localhost:3001/dashboard"
echo "   3. Presiona Ctrl+Shift+R para limpiar caché"
echo ""
echo "💡 Para ver los logs en tiempo real:"
echo "   sudo docker logs -f nexfit-pro-frontend-1"
