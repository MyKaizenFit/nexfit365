# 🔄 Sistema de Actualización Automática de Planes

## 📋 Resumen

Se ha implementado un sistema completo de actualización automática de planes nutricionales que se ajusta automáticamente cuando el usuario cambia su peso, objetivos o nivel de actividad.

## ✨ Funcionalidades Implementadas

### 1. ✅ Actualización Automática de Planes

**Archivos creados/modificados:**
- `backend/nutrition/services.py` - Servicio `PlanAutoUpdateService` y método `update_existing_plan`
- `backend/nutrition/signals.py` - Signals de Django para detectar cambios automáticamente
- `backend/nutrition/apps.py` - Registro de signals

**Cómo funciona:**
- Detecta cambios en peso (>2kg o >5% del peso)
- Detecta cambios en objetivo (`main_goal`)
- Detecta cambios en nivel de actividad (`activity_level`)
- Recalcula automáticamente calorías y macros usando fórmula Harris-Benedict
- Actualiza el plan nutricional activo manteniendo la estructura de comidas
- Registra cambios en el historial de planes

**Umbrales de actualización:**
- Cambio de peso: >2kg o >5% del peso actual
- Cambio de objetivo: Cualquier cambio
- Cambio de actividad: Cualquier cambio
- Cambio mínimo de calorías: >5% o >100 calorías

### 2. ✅ Modificación de Planes por Usuario

**Archivos modificados:**
- `backend/accounts/views.py` - Endpoint `/api/accounts/profile/` mejorado

**Funcionalidad:**
- Los usuarios pueden cambiar sus objetivos (`main_goal`, `activity_level`, `weight`, `target_weight`)
- El sistema recalcula automáticamente el plan nutricional
- No requiere intervención del administrador
- Los administradores siguen gestionando planes premium manualmente

**Campos que activan actualización automática:**
- `main_goal` - Objetivo principal
- `activity_level` - Nivel de actividad
- `weight` - Peso actual
- `target_weight` - Peso objetivo

### 3. ✅ Planificación Semanal de Comidas

**Archivos creados/modificados:**
- `backend/nutrition/views.py` - Nuevo endpoint `weekly_meal_selections`
- `backend/nutrition/urls.py` - Ruta agregada

**Endpoints:**
- `GET /api/nutrition/weekly-meal-selections/?start_date=2025-12-23` - Obtener selecciones de la semana
- `POST /api/nutrition/weekly-meal-selections/` - Guardar selecciones para múltiples días

**Ejemplo de uso POST:**
```json
{
  "selections": [
    {
      "date": "2025-12-23",
      "meal_type": "breakfast",
      "recipe_id": "uuid-de-receta",
      "calories": 500,
      "protein": 30,
      "carbs": 50,
      "fat": 20
    },
    {
      "date": "2025-12-23",
      "meal_type": "lunch",
      "recipe_id": "uuid-de-receta",
      "calories": 700,
      "protein": 40,
      "carbs": 60,
      "fat": 25
    }
  ]
}
```

### 4. ✅ Análisis Automático de Progreso

**Archivos creados:**
- `backend/progress/services.py` - Servicio `ProgressAnalysisService`
- `backend/progress/views.py` - Endpoint de análisis agregado

**Funcionalidades:**
- Análisis de progreso de peso (últimas 4 semanas por defecto)
- Análisis de consistencia de entrenamientos
- Análisis de consistencia nutricional
- Detección de estancamiento
- Recomendaciones automáticas de ajuste

**Endpoint:**
- `GET /api/progress/progress-stats/analysis/?weeks=4`

**Respuesta incluye:**
- Análisis de peso (cambio, porcentaje, ritmo semanal)
- Análisis de entrenamientos (consistencia)
- Análisis nutricional (seguimiento)
- Recomendaciones priorizadas (warnings, info, success)
- Sugerencias de ajuste de plan si es necesario

## 🔧 Detalles Técnicos

### Signals Implementados

1. **`pre_save` en `CustomUser`**
   - Almacena valores anteriores antes de guardar
   - Permite comparar cambios después

2. **`post_save` en `CustomUser`**
   - Detecta cambios en peso, objetivo, actividad
   - Llama a `PlanAutoUpdateService` automáticamente

3. **`post_save` en `WeightEntry`**
   - Detecta nuevas entradas de peso
   - Actualiza peso del usuario
   - Actualiza plan si es necesario

### Servicios Creados

1. **`PlanAutoUpdateService`**
   - `should_update_plan()` - Determina si se debe actualizar
   - `update_plan_if_needed()` - Actualiza si es necesario

2. **`ProgressAnalysisService`**
   - `analyze_weight_progress()` - Analiza progreso de peso
   - `analyze_workout_consistency()` - Analiza entrenamientos
   - `analyze_nutrition_consistency()` - Analiza nutrición
   - `get_comprehensive_analysis()` - Análisis completo
   - `should_suggest_plan_adjustment()` - Sugiere ajustes

## 📊 Flujo de Actualización Automática

```
Usuario cambia peso/objetivo/actividad
         ↓
Signal detecta cambio
         ↓
PlanAutoUpdateService.should_update_plan()
         ↓
¿Cambio significativo? (>2kg, >5%, cambio objetivo)
         ↓ SÍ
PlanAutoUpdateService.update_plan_if_needed()
         ↓
PersonalizedNutritionService.update_existing_plan()
         ↓
Recalcula calorías y macros
         ↓
Actualiza plan nutricional activo
         ↓
Registra cambio en historial
         ↓
Plan actualizado automáticamente ✅
```

## 🎯 Casos de Uso

### Caso 1: Usuario cambia de peso
1. Usuario registra nuevo peso en "Progreso"
2. Signal detecta cambio >2kg
3. Plan se actualiza automáticamente
4. Calorías y macros recalculados
5. Usuario ve plan actualizado en dashboard

### Caso 2: Usuario cambia objetivo
1. Usuario va a "Perfil" → Cambia objetivo de "perder peso" a "ganar músculo"
2. Signal detecta cambio de objetivo
3. Plan se actualiza automáticamente
4. Calorías aumentan (superávit en lugar de déficit)
5. Distribución de macros cambia (más carbohidratos)

### Caso 3: Usuario planifica semana
1. Usuario va a "Comidas" → Vista semanal
2. Selecciona comidas para toda la semana
3. POST a `/api/nutrition/weekly-meal-selections/`
4. Todas las selecciones guardadas
5. Usuario puede ver plan completo de la semana

### Caso 4: Sistema detecta estancamiento
1. Usuario no ha perdido peso en 3 semanas
2. `ProgressAnalysisService` detecta estancamiento
3. Genera recomendación de reducir 200 calorías
4. Usuario ve recomendación en dashboard
5. Puede aplicar ajuste automáticamente

## 🚀 Próximos Pasos (Frontend)

Para completar la integración, se necesita:

1. **Componente de Vista Semanal**
   - Crear `WeeklyMealPlan` component
   - Mostrar calendario semanal
   - Permitir selección de comidas por día

2. **Panel de Análisis de Progreso**
   - Mostrar análisis completo
   - Mostrar recomendaciones
   - Botón para aplicar ajustes sugeridos

3. **Notificaciones de Actualización**
   - Mostrar toast cuando plan se actualiza automáticamente
   - Explicar qué cambió y por qué

4. **Mejoras en Perfil**
   - Preview de cambios antes de guardar
   - Mostrar impacto en calorías/macros
   - Confirmación antes de actualizar plan

## 📝 Notas Importantes

- Los planes se actualizan automáticamente pero **mantienen la misma estructura de comidas**
- Solo se ajustan las **cantidades y macros**, no se cambia el plan base
- Los cambios se registran en `NutritionPlanHistory` para auditoría
- Los administradores pueden seguir gestionando planes premium manualmente
- El sistema es **no invasivo**: si hay error, no falla la operación principal

## 🔍 Testing

Para probar las funcionalidades:

1. **Actualización por peso:**
   ```python
   # En Django shell
   user = CustomUser.objects.get(email='test@example.com')
   user.weight = 75.0
   user.save()  # Debería actualizar plan automáticamente
   ```

2. **Análisis de progreso:**
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
     http://localhost:8001/api/progress/progress-stats/analysis/?weeks=4
   ```

3. **Planificación semanal:**
   ```bash
   curl -X POST -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"selections": [...]}' \
     http://localhost:8001/api/nutrition/weekly-meal-selections/
   ```




