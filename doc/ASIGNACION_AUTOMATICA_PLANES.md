# 📋 Sistema de Asignación Automática de Planes

## 🔍 Resumen Ejecutivo

Cuando se crea un usuario nuevo, el sistema **asigna automáticamente** planes nutricionales y de entrenamiento basándose en su perfil. Este documento explica **exactamente qué planes se asignan, cómo funciona el sistema y dónde modificarlo**.

---

## 🎯 ¿Qué Planes se Asignan?

### 1. **Plan Nutricional**
- Se crea un plan **personalizado** para el usuario basado en un **template** (plan del sistema)
- El plan incluye:
  - Calorías diarias, proteínas, carbohidratos y grasas
  - Comidas del día (desayuno, comida, cena, etc.)
  - **3 recetas sugeridas** por cada comida (seleccionadas aleatoriamente del template)

### 2. **Programa de Entrenamiento**
- Se crea un programa **personalizado** basado en un **template** (programa del sistema)
- El programa se ajusta a:
  - Los días de entrenamiento que el usuario marcó
  - La ubicación de entrenamiento (casa, gimnasio, aire libre)
  - El objetivo del usuario

---

## ⚙️ ¿Cómo Funciona el Sistema?

### Flujo de Asignación

```
Usuario se registra
    ↓
Completa formulario inicial (objetivo, actividad, ubicación, etc.)
    ↓
Sistema busca DefaultPlanConfiguration que coincida
    ↓
¿Encuentra configuración?
    ├─ SÍ → Asigna planes de la configuración
    └─ NO → Usa método legacy (busca planes del sistema directamente)
```

### Criterios de Coincidencia

El sistema busca una `DefaultPlanConfiguration` que coincida con:

1. **Objetivo principal** (`main_goal`): lose_weight, gain_muscle, body_recomposition, maintain
2. **Ubicación de entrenamiento** (`training_location`): home, gym, outdoor
3. **Nivel de actividad** (`activity_level`): sedentary, light, moderate, active, very_active
4. **Género** (`gender`): male, female, other (o null para todos)
5. **Días de entrenamiento** (`min_training_days_per_week`, `max_training_days_per_week`)
6. **Edad** (`age_min`, `age_max`)

### Prioridad

- **Menor número = Mayor prioridad**
- El sistema evalúa las configuraciones en orden de prioridad
- Se aplica la **primera configuración que coincide** con el perfil del usuario

---

## 📍 Dónde se Modifica

### 1. **Panel de Administración (Frontend)**

**Ruta:** `/admin/config-por-defecto`

**Funcionalidades:**
- ✅ Ver todas las configuraciones (activas e inactivas)
- ✅ Crear nuevas configuraciones
- ✅ Editar configuraciones existentes
- ✅ Activar/desactivar configuraciones
- ✅ Cambiar prioridad
- ✅ Asignar planes nutricionales y programas de entrenamiento

**Cómo crear una configuración:**
1. Click en "Nueva configuración"
2. Completa los campos:
   - **Nombre**: Ej: "Pérdida de Peso - Gimnasio - Activo"
   - **Prioridad**: Número menor = mayor prioridad
   - **Criterios**: Objetivo, ubicación, actividad, género, edad, días de entrenamiento
   - **Planes**: Selecciona el plan nutricional y programa de entrenamiento
3. Guarda

### 2. **Base de Datos (Modelo)**

**Modelo:** `dashboard.models.DefaultPlanConfiguration`

**Ubicación del código:**
- `backend/dashboard/models.py` (líneas 182-326)
- `backend/dashboard/views.py` (líneas 664-741)
- `backend/dashboard/serializers.py` (líneas 138-230)

**Campos principales:**
```python
- name: Nombre de la configuración
- priority: Prioridad (menor = mayor prioridad)
- is_active: Si está activa
- main_goal: Objetivo principal
- training_location: Ubicación de entrenamiento
- activity_level: Nivel de actividad
- gender: Género (null = todos)
- age_min, age_max: Rango de edad
- min_training_days_per_week, max_training_days_per_week: Rango de días
- default_nutrition_plan: Plan nutricional a asignar
- default_workout_program: Programa de entrenamiento a asignar
```

### 3. **Lógica de Asignación (Servicio)**

**Servicio:** `accounts.services.DefaultPlanAssignmentService`

**Ubicación del código:**
- `backend/accounts/services.py` (líneas 311-541)

**Métodos principales:**
- `find_best_configuration()`: Busca la mejor configuración para el usuario
- `assign()`: Asigna los planes al usuario

### 4. **Script de Creación Masiva**

**Script:** `backend/scripts/create_default_configurations.py`

**Uso:**
```bash
# Desde dentro del contenedor backend
python manage.py shell
>>> exec(open('scripts/create_default_configurations.py').read())
```

**Qué hace:**
- Crea configuraciones para todas las combinaciones posibles:
  - 4 objetivos × 3 ubicaciones × 5 niveles de actividad × 3 géneros × 5 rangos de edad
  - Total: ~900 configuraciones potenciales

---

## 🔧 Cómo Modificar Manualmente

### Opción 1: Panel de Administración (Recomendado)

1. Ve a `/admin/config-por-defecto`
2. Busca la configuración que quieres modificar
3. Click en "Editar"
4. Modifica los campos necesarios:
   - Cambiar prioridad
   - Cambiar planes asignados
   - Activar/desactivar
   - Modificar criterios
5. Guarda

### Opción 2: Django Admin

1. Accede a Django Admin: `/admin/`
2. Ve a `Dashboard → Default Plan Configurations`
3. Edita la configuración deseada

### Opción 3: API REST

**Endpoint:** `/api/dashboard/default-plan-configurations/`

**Ver todas:**
```bash
GET /api/dashboard/default-plan-configurations/
```

**Crear nueva:**
```bash
POST /api/dashboard/default-plan-configurations/
{
  "name": "Nueva Configuración",
  "priority": 10,
  "is_active": true,
  "main_goal": "lose_weight",
  "training_location": "gym",
  "activity_level": "active",
  "default_nutrition_plan_id": "uuid-del-plan",
  "default_workout_program_id": "uuid-del-programa"
}
```

**Editar:**
```bash
PUT /api/dashboard/default-plan-configurations/{id}/
```

### Opción 4: Script Python

```python
from dashboard.models import DefaultPlanConfiguration
from nutrition.models import NutritionPlan
from workouts.models import WorkoutProgram

# Obtener configuración
config = DefaultPlanConfiguration.objects.get(name="...")

# Cambiar plan nutricional
new_plan = NutritionPlan.objects.get(name="...")
config.default_nutrition_plan = new_plan
config.save()

# Cambiar prioridad
config.priority = 5
config.save()

# Desactivar
config.is_active = False
config.save()
```

---

## 🎯 Ejemplo Práctico

### Escenario: Usuario nuevo con perfil específico

**Perfil del usuario:**
- Objetivo: `lose_weight` (Pérdida de peso)
- Ubicación: `gym` (Gimnasio)
- Actividad: `active` (Activo)
- Género: `female` (Mujer)
- Edad: 28 años
- Días de entrenamiento: 4 días/semana

**Proceso:**
1. Sistema busca configuraciones activas ordenadas por prioridad
2. Evalúa cada configuración con `matches_user_profile(user)`
3. Encuentra: "Pérdida de Peso - Gimnasio - Activo - Mujeres" (Prioridad: 15)
4. Asigna:
   - Plan nutricional: "Plan Pérdida de Peso - Déficit Calórico"
   - Programa: "Programa Full Body - Gimnasio"

**Resultado:**
- Se crea un plan nutricional personalizado con 3 recetas por comida
- Se crea un programa de entrenamiento ajustado a 4 días/semana

---

## ⚠️ Problemas Comunes

### 1. "No se asignan planes automáticamente"

**Causas posibles:**
- No hay configuraciones activas en la base de datos
- Ninguna configuración coincide con el perfil del usuario
- Los planes asignados en la configuración no existen o están inactivos

**Solución:**
1. Verifica que existan configuraciones activas:
   ```python
   from dashboard.models import DefaultPlanConfiguration
   DefaultPlanConfiguration.objects.filter(is_active=True).count()
   ```
2. Crea configuraciones para los perfiles más comunes
3. Verifica que los planes asignados existan y estén activos

### 2. "Se asigna el plan incorrecto"

**Causas posibles:**
- Prioridad incorrecta (configuración más específica tiene menor prioridad)
- Criterios de coincidencia demasiado estrictos o demasiado amplios

**Solución:**
1. Revisa el orden de prioridad (menor número = mayor prioridad)
2. Ajusta los criterios de las configuraciones
3. Usa configuraciones más específicas con menor prioridad

### 3. "No aparecen configuraciones en el panel de admin"

**Causas posibles:**
- No hay configuraciones en la base de datos
- Error en la API o frontend

**Solución:**
1. Ejecuta el script de creación: `create_default_configurations.py`
2. Verifica que la API funcione: `GET /api/dashboard/default-plan-configurations/`
3. Revisa los logs del frontend y backend

---

## 📊 Método Legacy (Fallback)

Si no se encuentra ninguna `DefaultPlanConfiguration`, el sistema usa el método legacy:

**Función:** `accounts.services.assign_default_plans_to_user(user)`

**Cómo funciona:**
1. Busca un plan nutricional del sistema (`is_system=True`) que coincida con:
   - Objetivo del usuario
   - Restricciones dietéticas (vegetariano, vegano, etc.)
2. Busca un programa de entrenamiento del sistema que coincida con:
   - Objetivo del usuario
   - Días de entrenamiento del usuario

**Ubicación:** `backend/accounts/services.py` (líneas 113-300)

---

## 🔍 Verificar Configuraciones Existentes

### Desde Django Shell

```python
from dashboard.models import DefaultPlanConfiguration

# Ver todas
configs = DefaultPlanConfiguration.objects.all()
for config in configs:
    print(f"{config.name} - Prioridad: {config.priority} - Activa: {config.is_active}")

# Ver solo activas
active = DefaultPlanConfiguration.objects.filter(is_active=True)
print(f"Total activas: {active.count()}")

# Ver por objetivo
lose_weight = DefaultPlanConfiguration.objects.filter(main_goal='lose_weight', is_active=True)
print(f"Pérdida de peso: {lose_weight.count()}")
```

### Desde API

```bash
# Ver todas
curl http://localhost:8000/api/dashboard/default-plan-configurations/

# Ver solo activas (filtrar en frontend)
```

---

## 📝 Resumen

1. **¿Qué se asigna?**
   - Plan nutricional personalizado (basado en template)
   - Programa de entrenamiento personalizado (basado en template)

2. **¿Cómo funciona?**
   - Busca `DefaultPlanConfiguration` que coincida con el perfil
   - Evalúa por prioridad (menor número = mayor prioridad)
   - Asigna planes de la primera configuración que coincide

3. **¿Dónde modificar?**
   - **Panel Admin Frontend:** `/admin/config-por-defecto` (Recomendado)
   - **Django Admin:** `/admin/dashboard/defaultplanconfiguration/`
   - **API REST:** `/api/dashboard/default-plan-configurations/`
   - **Código:** `backend/dashboard/models.py`, `backend/accounts/services.py`

4. **¿Cómo crear configuraciones?**
   - Manualmente desde el panel de admin
   - Masivamente con el script `create_default_configurations.py`

---

## 🚀 Próximos Pasos

Si no hay configuraciones en la base de datos, ejecuta:

```bash
# Desde el contenedor backend
docker exec -it reposseparadosparaelhost-backend-1 python manage.py shell
>>> exec(open('scripts/create_default_configurations.py').read())
```

Esto creará configuraciones para todas las combinaciones comunes.


