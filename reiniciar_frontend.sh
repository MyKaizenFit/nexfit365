#!/bin/bash
# Script para reiniciar el frontend de desarrollo

echo "🔄 Reiniciando contenedor frontend..."
sudo docker restart nexfit-pro-frontend-1

echo "⏳ Esperando a que el contenedor esté listo..."
sleep 5

echo "✅ Contenedor reiniciado. El frontend debería estar recompilando..."
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Espera unos segundos para que Next.js recompile"
echo "2. Limpia la caché del navegador: Ctrl+Shift+R (o Cmd+Shift+R en Mac)"
echo "3. O abre las herramientas de desarrollador (F12) y haz click derecho en recargar > 'Vaciar caché y volver a cargar'"
echo ""
echo "🔍 Para ver los logs del frontend:"
echo "   sudo docker logs -f nexfit-pro-frontend-1"
