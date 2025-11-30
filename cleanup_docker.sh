#!/bin/bash
# Script para limpiar Docker y liberar recursos

echo "🧹 Limpiando Docker..."

echo "1️⃣ Deteniendo contenedores..."
sudo docker stop $(sudo docker ps -aq) 2>/dev/null || true

echo "2️⃣ Eliminando contenedores detenidos..."
sudo docker container prune -f

echo "3️⃣ Eliminando imágenes no utilizadas..."
sudo docker image prune -af

echo "4️⃣ Eliminando volúmenes no utilizados..."
sudo docker volume prune -f

echo "5️⃣ Eliminando redes no utilizadas..."
sudo docker network prune -f

echo "6️⃣ Limpiando build cache (opcional, puede tardar)..."
read -p "¿Limpiar build cache? Esto puede tardar pero libera más espacio (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    sudo docker builder prune -af
fi

echo ""
echo "📊 Espacio liberado:"
sudo docker system df

echo ""
echo "✅ Limpieza completada"

