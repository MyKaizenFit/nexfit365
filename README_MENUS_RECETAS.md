# 🍽️ Crear Menús desde Recetas

Este documento explica cómo crear menús (DefaultMeal) a partir de las recetas cargadas en la base de datos.

## 📋 Proceso

1. **Cargar recetas desde PDF**: Primero debes cargar las recetas usando el comando `load_recipes_from_pdf`
2. **Crear menús**: Luego ejecuta el comando `create_meals_from_recipes` para convertir las recetas en menús

## 🚀 Uso

### Opción 1: Usar el script (recomendado)

```bash
cd /srv/mykaizenfit/pro
./crear_menus_desde_recetas.sh
```

### Opción 2: Ejecutar directamente en Docker

```bash
docker exec nexfit-pro-backend-1 python manage.py create_meals_from_recipes
```

## ⚙️ Opciones del comando

```bash
# Usar un nombre de plan personalizado
python manage.py create_meals_from_recipes --plan-name "Menú Premium"

# Eliminar menús existentes del plan antes de crear nuevos
python manage.py create_meals_from_recipes --clear-existing
```

## 📊 Qué hace el comando

1. **Obtiene o crea un plan nutricional** llamado "Menú General de Recetas" (o el que especifiques)
2. **Procesa todas las recetas** de la base de datos
3. **Agrupa las recetas por categoría**:
   - Desayuno → 08:00
   - Comida/Almuerzo → 13:00
   - Cena → 20:00
   - Snack → 16:00
   - Pre-entrenamiento → 10:30
   - Post-entrenamiento → 16:00
4. **Crea DefaultMeal para cada receta** con:
   - Nombre: `{Tipo de comida}: {Nombre de la receta}`
   - Hora según la categoría
   - Calorías de la receta
   - Macronutrientes calculados (proteína, carbohidratos, grasa)
   - Descripción con ingredientes principales y tags
5. **Calcula macronutrientes** basándose en las calorías de la receta:
   - Distribución estándar: 25% proteína, 45% carbohidratos, 30% grasa
   - Recetas "PROTEICAS" ajustadas a: 35% proteína, 40% carbohidratos, 25% grasa

## 📝 Notas

- El comando **no duplica** menús si ya existen (por nombre)
- Las recetas se agrupan automáticamente según su categoría
- Los macronutrientes son aproximados basados en las calorías de la receta
- Si una receta tiene múltiples categorías (ej: "COMIDA - CENA"), se usa la primera que coincida

## 🔄 Proceso completo

```bash
# 1. Cargar recetas desde PDF
./cargar_recetas_pdf.sh

# 2. Crear menús desde las recetas
./crear_menus_desde_recetas.sh

# 3. Verificar en el panel admin que los menús se crearon correctamente
```

## 📈 Estadísticas

Al finalizar, el comando mostrará:
- Número de menús creados
- Número de menús omitidos (ya existían)
- Total de menús en el plan
- Estadísticas por categoría de recetas

