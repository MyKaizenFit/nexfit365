#!/bin/bash
# Script para detener TODOS los procesos de Next.js de forma agresiva
# Ejecutar con: sudo ./detener-todo.sh

echo "🛑 Deteniendo TODOS los procesos de Next.js..."
echo ""

# Obtener todos los PIDs
ALL_PIDS=$(pgrep -f "next" 2>/dev/null || true)
ALL_NODE_PIDS=$(pgrep -f "node.*next" 2>/dev/null || true)

if [ -n "$ALL_PIDS" ] || [ -n "$ALL_NODE_PIDS" ]; then
    echo "Procesos encontrados:"
    ps aux | grep -E "next|node.*next" | grep -v grep
    echo ""
    
    # Matar todos los procesos
    for pid in $ALL_PIDS $ALL_NODE_PIDS; do
        echo "Matando PID: $pid"
        kill -9 $pid 2>/dev/null || true
    done
    
    # También usar pkill
    pkill -9 -f "next" 2>/dev/null || true
    pkill -9 -f "node.*next" 2>/dev/null || true
    pkill -9 -f "next-server" 2>/dev/null || true
    pkill -9 -f "next dev" 2>/dev/null || true
    pkill -9 -f "next start" 2>/dev/null || true
    
    sleep 3
    
    # Verificar
    REMAINING=$(pgrep -f "next|node.*next" 2>/dev/null || true)
    if [ -n "$REMAINING" ]; then
        echo "⚠️  Procesos restantes, matando de nuevo..."
        for pid in $REMAINING; do
            kill -9 $pid 2>/dev/null || true
        done
        sleep 2
    fi
fi

# Verificación final
if pgrep -f "next|node.*next" > /dev/null; then
    echo "❌ Aún hay procesos corriendo:"
    ps aux | grep -E "next|node.*next" | grep -v grep
else
    echo "✅ Todos los procesos detenidos"
fi

# Liberar puerto 3001
echo ""
echo "🔌 Liberando puerto 3001..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1
echo "✅ Puerto 3001 liberado"

