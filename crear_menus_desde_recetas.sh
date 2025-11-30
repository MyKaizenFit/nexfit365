#!/bin/bash
echo "🍽️ Creando menús desde recetas..."
echo ""

# Ejecutar el comando Django para crear menús
docker exec nexfit-pro-backend-1 python manage.py create_meals_from_recipes

echo ""
echo "✅ Proceso completado"
