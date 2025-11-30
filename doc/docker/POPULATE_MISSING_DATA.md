# 📦 Poblar Datos Faltantes en la Base de Datos

## 🎯 Objetivo

Poblar los datos que deberían existir en la base de datos pero actualmente faltan:
- Planes nutricionales por defecto
- Comidas por defecto
- (Opcional) Planes de entrenamiento y nutrición asignados a usuarios de prueba

---

## 📋 Datos que Faltan

### **1. Planes Nutricionales por Defecto** (`nutrition_defaultnutritionplan`)
- **Estado actual:** 0 planes
- **Debería haber:** Al menos 5-10 planes predeterminados
- **Ejemplos:**
  - Plan Básico - Pérdida de Peso
  - Plan Pro - Ganancia Muscular
  - Plan Premium - Mantenimiento
  - Plan Vegetariano - Básico
  - Plan Deportivo - Alto Rendimiento

### **2. Comidas por Defecto** (`nutrition_defaultmeal`)
- **Estado actual:** 0 comidas
- **Debería haber:** Comidas asociadas a cada plan nutricional
- **Ejemplos:** Desayunos, almuerzos, cenas, snacks predeterminados

### **3. Planes Asignados a Usuarios**
- **Estado actual:** 0 planes asignados
- **Nota:** Estos se crean automáticamente cuando el usuario selecciona un plan desde el frontend

---

## 🚀 Cómo Poblar los Datos

### **Opción 1: Script Básico (Recomendado para empezar)**

```bash
# Desde el directorio raíz del proyecto
cd backend
python create_basic_nutrition_plans.py
```

Este script crea 5 planes nutricionales básicos:
- Plan Básico - Pérdida de Peso
- Plan Pro - Ganancia Muscular
- Plan Premium - Mantenimiento
- Plan Vegetariano - Básico
- Plan Deportivo - Alto Rendimiento

### **Opción 2: Script Completo (Más planes)**

```bash
# Desde el contenedor backend
docker exec -it reposseparadosparaelhost-backend-1 python manage.py populate_expanded_nutrition_plans
```

Este script crea planes nutricionales basados en todas las combinaciones posibles:
- Objetivos: pérdida de peso, ganancia muscular, recomposición corporal
- Niveles de actividad: sedentario, ligero, moderado, activo, muy activo
- Días de entrenamiento: 1-7 días por semana
- **Resultado:** Más de 100 planes personalizados

### **Opción 3: Comidas por Defecto**

```bash
# Desde el contenedor backend
docker exec -it reposseparadosparaelhost-backend-1 python manage.py create_default_meals
```

Este comando:
- Crea un plan de nutrición básico por defecto (si no existe)
- Crea comidas predeterminadas para ese plan

### **Opción 4: Todo en Uno (Django Management Command)**

```bash
# Desde el contenedor backend
docker exec -it reposseparadosparaelhost-backend-1 python manage.py create_default_data
```

Este comando crea:
- Planes nutricionales por defecto
- Comidas por defecto
- Otros datos básicos del sistema

---

## 📝 Verificar que se Poblaron los Datos

### **Ver planes nutricionales:**
```bash
docker exec -i reposseparadosparaelhost-db-1 psql -U postgres -d mykaizenfit -c "SELECT id, name, daily_calories, is_active FROM nutrition_defaultnutritionplan;"
```

### **Ver comidas por defecto:**
```bash
docker exec -i reposseparadosparaelhost-db-1 psql -U postgres -d mykaizenfit -c "SELECT id, name, plan_id, calories FROM nutrition_defaultmeal LIMIT 10;"
```

### **Contar registros:**
```bash
docker exec -i reposseparadosparaelhost-db-1 psql -U postgres -d mykaizenfit -c "SELECT 'Planes nutricionales' as tipo, COUNT(*) as total FROM nutrition_defaultnutritionplan UNION ALL SELECT 'Comidas por defecto', COUNT(*) FROM nutrition_defaultmeal;"
```

---

## 🔄 Flujo Completo Recomendado

### **1. Poblar Planes Nutricionales Básicos**
```bash
cd backend
python create_basic_nutrition_plans.py
```

### **2. Poblar Comidas por Defecto**
```bash
docker exec -it reposseparadosparaelhost-backend-1 python manage.py create_default_meals
```

### **3. (Opcional) Poblar Planes Expandidos**
```bash
docker exec -it reposseparadosparaelhost-backend-1 python manage.py populate_expanded_nutrition_plans
```

### **4. Verificar**
```bash
docker exec -i reposseparadosparaelhost-db-1 psql -U postgres -d mykaizenfit -c "SELECT COUNT(*) as total_planes FROM nutrition_defaultnutritionplan; SELECT COUNT(*) as total_comidas FROM nutrition_defaultmeal;"
```

---

## ⚠️ Notas Importantes

1. **No duplicar datos:** Los scripts verifican si los planes ya existen antes de crearlos
2. **Dependencias:** Algunos scripts requieren que existan recetas (`nutrition_recipe`) primero
3. **Asignación a usuarios:** Los planes nutricionales y de entrenamiento se asignan automáticamente cuando el usuario los selecciona desde el frontend
4. **Backup:** Antes de poblar datos masivos, hacer un backup de la base de datos

---

## 🎯 Resultado Esperado

Después de poblar los datos, deberías tener:

- ✅ **5-10+ planes nutricionales por defecto** disponibles para que los usuarios seleccionen
- ✅ **20-50+ comidas por defecto** asociadas a esos planes
- ✅ Los usuarios podrán seleccionar planes desde el frontend
- ✅ Se crearán automáticamente `NutritionPlan` y `UserWorkoutPlan` cuando los usuarios seleccionen planes

---

## 📚 Scripts Disponibles

### **En `backend/`:**
- `create_basic_nutrition_plans.py` - Crea 5 planes básicos
- `create_simple_nutrition_plans.py` - Crea planes simples
- `create_sample_nutrition_plans.py` - Crea planes de ejemplo

### **En `backend/nutrition/management/commands/`:**
- `create_default_meals.py` - Crea comidas por defecto
- `populate_expanded_nutrition_plans.py` - Crea planes expandidos (100+)
- `populate_expanded_recipes.py` - Crea recetas expandidas

### **En `backend/api/management/commands/`:**
- `create_default_data.py` - Crea todos los datos por defecto
- `seed_demo.py` - Crea datos de demostración completos

---

## 🔍 Troubleshooting

### **Error: "No hay recetas disponibles"**
```bash
# Primero poblar recetas:
docker exec -it reposseparadosparaelhost-backend-1 python manage.py populate_expanded_recipes
```

### **Error: "Module not found"**
```bash
# Asegúrate de estar en el directorio correcto o usar el contenedor:
docker exec -it reposseparadosparaelhost-backend-1 python manage.py <comando>
```

### **Los planes no aparecen en el frontend**
- Verificar que `is_active=True` en los planes
- Verificar que el usuario tiene el rol adecuado (`min_role_required`)
- Verificar permisos de CORS y autenticación

