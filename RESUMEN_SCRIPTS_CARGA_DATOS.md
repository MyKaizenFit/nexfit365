# 📚 Resumen de Scripts de Carga de Datos

Este documento describe todos los scripts disponibles para cargar datos en la base de datos de desarrollo.

---

## 🎯 Scripts Principales (Recomendados para empezar)

### 1. `seed_demo` - Datos Demo Completos
**Ubicación:** `backend/api/management/commands/seed_demo.py`

**Comando:**
```bash
docker compose exec backend python manage.py seed_demo [--users 5] [--clear]
```

**Datos que carga:**
- ✅ **Usuarios:**
  - Admin: `admin@mykaizenfit.com` (password: `admin123`)
  - Trainer: `trainer@mykaizenfit.com` (password: `trainer123`)
  - 5 usuarios demo: `user1@mykaizenfit.com` a `user5@mykaizenfit.com` (password: `user123`)
- ✅ **Nutrición:**
  - 5 alimentos básicos (Pollo, Arroz, Brócoli, Huevo, Avena)
  - 1 plan nutricional completo con 4 comidas para el primer usuario
- ✅ **Entrenamiento:**
  - 5 ejercicios básicos (Press de Banca, Sentadillas, Peso Muerto, Pull-ups, Plancha)
  - 1 programa de entrenamiento completo (4 días/semana) para el primer usuario
- ✅ **Progreso:**
  - 7 entradas de peso (últimos 7 días)
  - 1 medición corporal
- ✅ **Notificaciones:**
  - 3 notificaciones de ejemplo
- ✅ **Logros:**
  - 3 logros disponibles
  - 1 logro asignado al primer usuario

**Cuándo usarlo:** Para tener un entorno completo de prueba con usuarios, planes y datos de progreso.

---

### 2. `create_default_data` - Datos por Defecto Básicos
**Ubicación:** `backend/api/management/commands/create_default_data.py`

**Comando:**
```bash
docker compose exec backend python manage.py create_default_data
```

**Datos que carga:**
- ✅ **Plan Nutricional por Defecto:**
  - 1 plan básico (2000 calorías/día)
  - 4 comidas por defecto (Desayuno, Almuerzo, Merienda, Cena)
- ✅ **Programa de Entrenamiento por Defecto:**
  - 1 programa básico (4 semanas)
  - 7 días de entrenamiento (5 activos, 2 descanso)
- ✅ **Consejos Motivacionales:**
  - 5 consejos motivacionales
- ✅ **Ejercicios Básicos:**
  - 5 ejercicios básicos (Flexiones, Sentadillas, Plancha, Burpees, Mountain climbers)
- ✅ **Alimentos Básicos:**
  - 5 alimentos básicos (Pollo, Arroz integral, Brócoli, Huevo, Avena)

**Cuándo usarlo:** Para tener datos mínimos necesarios para que la aplicación funcione.

---

## 🏋️ Scripts de Entrenamiento

### 3. `populate_workouts` - Ejercicios y Planes Básicos
**Ubicación:** `backend/workouts/management/commands/populate_workouts.py`

**Comando:**
```bash
docker compose exec backend python manage.py populate_workouts
```

**Datos que carga:**
- ✅ **Ejercicios:**
  - ~50+ ejercicios organizados por grupos musculares:
    - Pecho (10 ejercicios)
    - Espalda (10+ ejercicios)
    - Piernas (10+ ejercicios)
    - Hombros (10+ ejercicios)
    - Bíceps/Tríceps (10+ ejercicios)
    - Core/Abdominales (10+ ejercicios)
- ✅ **Planes de Entrenamiento:**
  - Varios planes de entrenamiento completos con días y ejercicios

**Cuándo usarlo:** Para tener una biblioteca completa de ejercicios y planes de entrenamiento.

---

### 4. `populate_expanded_workouts` - Planes Expandidos
**Ubicación:** `backend/workouts/management/commands/populate_expanded_workouts.py`

**Comando:**
```bash
docker compose exec backend python manage.py populate_expanded_workouts
```

**Datos que carga:**
- ✅ **Planes de Entrenamiento Expandidos:**
  - Múltiples planes según diferentes combinaciones de:
    - Nivel de dificultad (principiante, intermedio, avanzado)
    - Objetivos (pérdida de peso, ganancia muscular, etc.)
    - Días por semana (1-7 días)
    - Equipamiento (gimnasio, casa, etc.)

**Cuándo usarlo:** Para tener una gran variedad de planes de entrenamiento personalizados.

---

### 5. `populate_exercises` - Solo Ejercicios
**Ubicación:** `backend/workouts/management/commands/populate_exercises.py`

**Comando:**
```bash
docker compose exec backend python manage.py populate_exercises
```

**Datos que carga:**
- ✅ **Ejercicios:**
  - Lista completa de ejercicios con instrucciones detalladas

**Cuándo usarlo:** Si solo necesitas ejercicios sin planes completos.

---

### 6. `populate_exercises_simple` - Ejercicios Básicos
**Ubicación:** `backend/workouts/management/commands/populate_exercises_simple.py`

**Comando:**
```bash
docker compose exec backend python manage.py populate_exercises_simple
```

**Datos que carga:**
- ✅ **Ejercicios Básicos:**
  - Lista reducida de ejercicios esenciales

**Cuándo usarlo:** Para tener solo los ejercicios más comunes.

---

## 🍎 Scripts de Nutrición

### 7. `populate_expanded_recipes` - Recetas Expandidas
**Ubicación:** `backend/nutrition/management/commands/populate_expanded_recipes.py`

**Comando:**
```bash
docker compose exec backend python manage.py populate_expanded_recipes [--clear]
```

**Datos que carga:**
- ✅ **Recetas:**
  - 100+ recetas organizadas por categorías:
    - Desayunos (20+ recetas)
    - Almuerzos (20+ recetas)
    - Cenas (20+ recetas)
    - Meriendas/Snacks (20+ recetas)
    - Postres saludables (10+ recetas)
    - Batidos/Smoothies (10+ recetas)
  - Cada receta incluye: ingredientes, instrucciones, calorías, macros, tiempo de preparación

**Cuándo usarlo:** Para tener una biblioteca completa de recetas nutricionales.

---

### 8. `populate_expanded_nutrition_plans` - Planes Nutricionales Expandidos
**Ubicación:** `backend/nutrition/management/commands/populate_expanded_nutrition_plans.py`

**Comando:**
```bash
docker compose exec backend python manage.py populate_expanded_nutrition_plans [--clear]
```

**⚠️ Requisito:** Necesita que existan recetas (ejecutar `populate_expanded_recipes` primero)

**Datos que carga:**
- ✅ **Planes Nutricionales:**
  - 100+ planes personalizados basados en combinaciones de:
    - Objetivos: pérdida de peso, ganancia muscular, recomposición corporal
    - Nivel de actividad: sedentario, ligero, moderado, activo, muy activo
    - Días de entrenamiento: 1-7 días/semana
  - Cada plan incluye:
    - Calorías diarias calculadas
    - Macros (proteína, carbohidratos, grasas)
    - Comidas asociadas con recetas

**Cuándo usarlo:** Para tener una gran variedad de planes nutricionales personalizados.

---

### 9. `create_default_meals` - Comidas por Defecto
**Ubicación:** `backend/nutrition/management/commands/create_default_meals.py`

**Comando:**
```bash
docker compose exec backend python manage.py create_default_meals
```

**Datos que carga:**
- ✅ **Comidas por Defecto:**
  - Crea un plan nutricional básico si no existe
  - Crea comidas predeterminadas para ese plan

**Cuándo usarlo:** Para tener comidas básicas asociadas a un plan nutricional.

---

### 10. `populate_more_recipes` - Más Recetas
**Ubicación:** `backend/nutrition/management/commands/populate_more_recipes.py`

**Comando:**
```bash
docker compose exec backend python manage.py populate_more_recipes
```

**Datos que carga:**
- ✅ **Recetas Adicionales:**
  - Más recetas para ampliar la biblioteca existente

**Cuándo usarlo:** Para agregar más recetas a las ya existentes.

---

### 11. `populate_more_snacks` - Más Snacks
**Ubicación:** `backend/nutrition/management/commands/populate_more_snacks.py`

**Comando:**
```bash
docker compose exec backend python manage.py populate_more_snacks
```

**Datos que carga:**
- ✅ **Snacks/Meriendas:**
  - Recetas adicionales de snacks saludables

**Cuándo usarlo:** Para agregar más opciones de snacks.

---

## 👤 Scripts de Usuarios y Configuración

### 12. `create_admin_data` - Datos para Admin
**Ubicación:** `backend/accounts/management/commands/create_admin_data.py`

**Comando:**
```bash
docker compose exec backend python manage.py create_admin_data
```

**⚠️ Requisito:** Busca el usuario `iagoadmin@gmail.com`

**Datos que carga:**
- ✅ **Perfil del Administrador:**
  - Actualiza perfil completo del admin
- ✅ **Ejercicios de Ejemplo:**
  - 6 ejercicios básicos
- ✅ **Plantillas de Planes de Entrenamiento:**
  - 1 plan principiante completo (3 días/semana)
- ✅ **Plan Nutricional:**
  - 1 plan básico de mantenimiento
  - 6 alimentos básicos
- ✅ **Datos de Progreso:**
  - 30 entradas de peso (últimos 30 días)
  - 1 medición corporal

**Cuándo usarlo:** Para crear datos de prueba específicos para el usuario administrador.

---

### 13. `create_detailed_test_data` - Datos de Prueba Detallados
**Ubicación:** `backend/accounts/management/commands/create_detailed_test_data.py`

**Comando:**
```bash
docker compose exec backend python manage.py create_detailed_test_data
```

**Datos que carga:**
- ✅ **Planes de Entrenamiento Detallados:**
  - 2 programas de entrenamiento completos (principiante e intermedio)
  - 2 templates de entrenamiento con días y ejercicios
- ✅ **Plan de Nutrición Completo:**
  - 1 plan nutricional con 5 comidas diarias
  - 5 recetas detalladas asociadas
- ✅ **Configuraciones por Defecto:**
  - 2 configuraciones para formularios de prueba:
    - Principiante - Pérdida de Peso - Gimnasio
    - Intermedio - Ganancia Muscular - Casa

**Cuándo usarlo:** Para tener datos completos y detallados para pruebas de formularios y asignación de planes.

---

### 14. `seed_default_plan_configurations` - Configuraciones por Defecto
**Ubicación:** `backend/accounts/management/commands/seed_default_plan_configurations.py`

**Comando:**
```bash
docker compose exec backend python manage.py seed_default_plan_configurations
```

**Datos que carga:**
- ✅ **Configuraciones por Defecto:**
  - Múltiples configuraciones que relacionan:
    - Objetivos de usuario
    - Niveles de actividad
    - Ubicación de entrenamiento
    - Con planes nutricionales y de entrenamiento correspondientes

**Cuándo usarlo:** Para tener configuraciones que permitan asignar automáticamente planes según las preferencias del usuario.

---

## 📊 Orden Recomendado de Ejecución

### Opción 1: Carga Completa (Recomendada)
```bash
# 1. Datos básicos por defecto
docker compose exec backend python manage.py create_default_data

# 2. Recetas (necesario antes de planes nutricionales)
docker compose exec backend python manage.py populate_expanded_recipes

# 3. Planes nutricionales expandidos
docker compose exec backend python manage.py populate_expanded_nutrition_plans

# 4. Ejercicios y planes de entrenamiento
docker compose exec backend python manage.py populate_workouts

# 5. Configuraciones por defecto
docker compose exec backend python manage.py seed_default_plan_configurations

# 6. Datos demo completos (usuarios, progreso, etc.)
docker compose exec backend python manage.py seed_demo --users 5
```

### Opción 2: Carga Rápida (Mínima)
```bash
# Solo lo esencial
docker compose exec backend python manage.py create_default_data
docker compose exec backend python manage.py seed_demo --users 3
```

### Opción 3: Carga para Pruebas Detalladas
```bash
# Datos detallados para pruebas
docker compose exec backend python manage.py create_default_data
docker compose exec backend python manage.py populate_expanded_recipes
docker compose exec backend python manage.py populate_expanded_nutrition_plans
docker compose exec backend python manage.py populate_workouts
docker compose exec backend python manage.py create_detailed_test_data
```

---

## ⚠️ Notas Importantes

1. **Orden de ejecución:** Algunos scripts dependen de otros:
   - `populate_expanded_nutrition_plans` requiere que existan recetas
   - `create_detailed_test_data` requiere ejercicios

2. **Limpiar datos:** Algunos scripts tienen la opción `--clear` para eliminar datos existentes antes de crear nuevos.

3. **Usuarios:** Los scripts que crean usuarios usan contraseñas por defecto. Cambia las contraseñas en producción.

4. **Datos de prueba:** Estos scripts están diseñados para desarrollo. No ejecutes en producción sin revisar primero.

---

## 🔍 Verificar Datos Cargados

```bash
# Contar planes nutricionales
docker compose exec backend python manage.py shell -c "from nutrition.models import DefaultNutritionPlan; print(f'Planes: {DefaultNutritionPlan.objects.count()}')"

# Contar recetas
docker compose exec backend python manage.py shell -c "from nutrition.models import Recipe; print(f'Recetas: {Recipe.objects.count()}')"

# Contar ejercicios
docker compose exec backend python manage.py shell -c "from workouts.models import Exercise; print(f'Ejercicios: {Exercise.objects.count()}')"

# Contar usuarios
docker compose exec backend python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); print(f'Usuarios: {User.objects.count()}')"
```

