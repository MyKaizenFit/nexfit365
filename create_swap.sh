#!/bin/bash
# Script para crear swap temporal para el build
# Ejecutar como root: sudo bash create_swap.sh

set -e

SWAP_SIZE=4G
SWAP_FILE=/swapfile

echo "=========================================="
echo "  CREANDO SWAP TEMPORAL"
echo "  Tamaño: $SWAP_SIZE"
echo "=========================================="
echo ""

# Verificar si ya existe swap
if [ -f "$SWAP_FILE" ]; then
    echo "⚠️  Ya existe un archivo de swap en $SWAP_FILE"
    echo "   Eliminando el anterior..."
    swapoff $SWAP_FILE 2>/dev/null || true
    rm -f $SWAP_FILE
fi

# Crear archivo de swap
echo "1. Creando archivo de swap de $SWAP_SIZE..."
fallocate -l $SWAP_SIZE $SWAP_FILE || dd if=/dev/zero of=$SWAP_FILE bs=1M count=4096
chmod 600 $SWAP_FILE

# Formatear como swap
echo "2. Formateando como swap..."
mkswap $SWAP_FILE

# Activar swap
echo "3. Activando swap..."
swapon $SWAP_FILE

# Verificar
echo ""
echo "✅ Swap creado y activado"
echo ""
free -h
echo ""
echo "Para eliminar el swap después del build:"
echo "  sudo swapoff $SWAP_FILE && sudo rm $SWAP_FILE"
echo ""

