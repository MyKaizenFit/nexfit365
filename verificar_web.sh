#!/bin/bash

# Script para verificar el estado de la web
PROJECT_NAME="nexfit-pro"
COMPOSE_FILE="docker-compose.prod.yml"

cd /srv/mykaizenfit/pro

echo "🔍 VERIFICANDO ESTADO DE LA WEB"
echo "================================"
echo ""

echo "1️⃣  Estado de los contenedores:"
echo "--------------------------------"
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE ps
echo ""

echo "2️⃣  Últimos logs del frontend (20 líneas):"
echo "--------------------------------"
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE logs frontend --tail=20
echo ""

echo "3️⃣  Últimos logs del backend (20 líneas):"
echo "--------------------------------"
sudo COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose -f $COMPOSE_FILE logs backend --tail=20
echo ""

echo "4️⃣  Verificando puertos:"
echo "--------------------------------"
if sudo netstat -tlnp 2>/dev/null | grep -q ":3001"; then
    echo "✅ Puerto 3001 (frontend) está escuchando"
    sudo netstat -tlnp | grep ":3001"
else
    echo "❌ Puerto 3001 (frontend) NO está escuchando"
fi
echo ""

if sudo netstat -tlnp 2>/dev/null | grep -q ":8001"; then
    echo "✅ Puerto 8001 (backend) está escuchando"
    sudo netstat -tlnp | grep ":8001"
else
    echo "❌ Puerto 8001 (backend) NO está escuchando"
fi
echo ""

echo "5️⃣  Probando conectividad local:"
echo "--------------------------------"
if curl -s -o /dev/null -w "Frontend: HTTP %{http_code}\n" http://localhost:3001; then
    echo "✅ Frontend responde"
else
    echo "❌ Frontend NO responde"
fi

if curl -s http://localhost:8001/api/health/ | grep -q "ok"; then
    echo "✅ Backend responde"
else
    echo "❌ Backend NO responde"
fi
echo ""

echo "6️⃣  Verificando firewall:"
echo "--------------------------------"
if command -v ufw &> /dev/null; then
    echo "Estado UFW:"
    sudo ufw status | head -3
elif command -v firewall-cmd &> /dev/null; then
    echo "Puertos abiertos en firewalld:"
    sudo firewall-cmd --list-ports 2>&1 | head -5
else
    echo "No se encontró firewall configurado"
fi
echo ""

echo "📝 RESUMEN:"
echo "  - Frontend debería estar en: http://45.136.19.91:3001"
echo "  - Backend debería estar en: http://45.136.19.91:8001"
echo ""
echo "Si no puedes acceder desde fuera, verifica:"
echo "  1. Que el firewall permita los puertos 3001 y 8001"
echo "  2. Que Docker esté exponiendo en 0.0.0.0"
echo "  3. Que el router/proxy permita el tráfico"

