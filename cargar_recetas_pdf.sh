#!/bin/bash
echo "🍳 Cargando recetas desde PDF..."
echo ""

# Ejecutar el comando Django para cargar recetas
docker exec nexfit-pro-backend-1 python manage.py load_recipes_from_pdf

echo ""
echo "✅ Proceso completado"
