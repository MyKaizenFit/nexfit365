# 🔧 Cómo Modificar Templates de Planes (Como Administrador)

## 📍 Ubicación en el Panel de Administración

### **Panel Principal: `/admin`**

Una vez dentro del panel de administración, encontrarás estas secciones en el menú horizontal:

---

## 🍎 **1. Planes Nutricionales (Templates)**

### **Ruta en el Panel:**
```
Panel de Administrador → "Planes de Menús" (en el menú horizontal)
```

### **Qué puedes hacer:**
- ✅ Ver todos los planes nutricionales (templates y planes de usuarios)
- ✅ Crear nuevos templates
- ✅ Editar templates existentes
- ✅ Eliminar templates
- ✅ Activar/desactivar templates
- ✅ Gestionar comidas del plan
- ✅ Asignar recetas a cada comida
- ✅ Modificar macros (calorías, proteínas, carbohidratos, grasas)

### **Cómo identificar un Template:**
Los templates tienen:
- `is_template=True` o `is_system=True`
- `user=None` (no pertenecen a un usuario específico)

### **API Endpoint:**
```
GET/POST/PUT/DELETE /api/admin/nutrition/plans/
```

### **Componente Frontend:**
- `frontend/app/admin/components/nutrition-plan-management.tsx`

---

## 💪 **2. Programas de Entrenamiento (Templates)**

### **Ruta en el Panel:**
```
Panel de Administrador → "Planes de Entrenamiento" (en el menú horizontal)
```

### **Qué puedes hacer:**
- ✅ Ver todos los programas de entrenamiento (templates y programas de usuarios)
- ✅ Crear nuevos templates
- ✅ Editar templates existentes
- ✅ Eliminar templates
- ✅ Activar/desactivar templates
- ✅ Gestionar días de entrenamiento
- ✅ Asignar ejercicios a cada día
- ✅ Modificar dificultad, objetivo, duración

### **Cómo identificar un Template:**
Los templates tienen:
- `is_template=True` o `is_system=True`
- `user=None` (no pertenecen a un usuario específico)

### **API Endpoint:**
```
GET/POST/PUT/DELETE /api/admin/workouts/programs/
```

### **Componente Frontend:**
- `frontend/app/admin/components/workout-plan-management.tsx`

---

## 🎯 **3. Configuraciones por Defecto (Asignación Automática)**

### **Ruta en el Panel:**
```
Panel de Administrador → "Config. por defecto" (en el menú horizontal)
```

### **Qué puedes hacer:**
- ✅ Ver todas las configuraciones
- ✅ Crear nuevas configuraciones
- ✅ Editar configuraciones existentes
- ✅ Cambiar prioridad
- ✅ Activar/desactivar configuraciones
- ✅ **Asignar templates** a cada configuración

### **Importante:**
Aquí es donde **vinculas los templates** con los perfiles de usuario. Cuando creas una configuración, seleccionas:
- Plan nutricional (template) → `default_nutrition_plan`
- Programa de entrenamiento (template) → `default_workout_program`

### **API Endpoint:**
```
GET/POST/PUT/DELETE /api/dashboard/default-plan-configurations/
```

### **Componente Frontend:**
- `frontend/app/admin/components/default-plan-configurations.tsx`

---

## 📝 **Guía Paso a Paso**

### **Paso 1: Modificar un Template de Plan Nutricional**

1. Ve a `/admin`
2. Click en **"Planes de Menús"** en el menú horizontal
3. Busca el plan que quieres modificar (usa el buscador o filtros)
4. Click en el plan para ver detalles
5. Click en **"Editar"**
6. Modifica:
   - Nombre, descripción
   - Macros (calorías, proteínas, carbohidratos, grasas)
   - Comidas (agregar, editar, eliminar)
   - Recetas sugeridas para cada comida
7. Guarda los cambios

### **Paso 2: Modificar un Template de Programa de Entrenamiento**

1. Ve a `/admin`
2. Click en **"Planes de Entrenamiento"** en el menú horizontal
3. Busca el programa que quieres modificar
4. Click en el programa para ver detalles
5. Click en **"Editar"**
6. Modifica:
   - Nombre, descripción
   - Dificultad, objetivo, duración
   - Días de entrenamiento
   - Ejercicios de cada día
7. Guarda los cambios

### **Paso 3: Crear un Nuevo Template**

#### **Plan Nutricional:**
1. Ve a `/admin` → **"Planes de Menús"**
2. Click en **"Nuevo Plan"** o **"Crear Plan"**
3. Completa el formulario:
   - Marca **"Es Template"** o **"Es Sistema"**
   - Define macros
   - Agrega comidas
   - Asigna recetas a cada comida
4. Guarda

#### **Programa de Entrenamiento:**
1. Ve a `/admin` → **"Planes de Entrenamiento"**
2. Click en **"Nuevo Programa"** o **"Crear Programa"**
3. Completa el formulario:
   - Marca **"Es Template"** o **"Es Sistema"**
   - Define dificultad, objetivo
   - Agrega días de entrenamiento
   - Asigna ejercicios a cada día
4. Guarda

### **Paso 4: Asignar Templates a Configuraciones**

1. Ve a `/admin` → **"Config. por defecto"**
2. Crea o edita una configuración
3. En **"Plan Nutricional"**, selecciona el template que quieres asignar
4. En **"Programa de Entrenamiento"**, selecciona el template que quieres asignar
5. Guarda

---

## 🔍 **Cómo Identificar Templates en la Base de Datos**

### **Planes Nutricionales:**
```python
from nutrition.models import NutritionPlan

# Ver todos los templates
templates = NutritionPlan.objects.filter(
    is_template=True
).filter(
    user__isnull=True  # No pertenecen a un usuario
)

# O planes del sistema
system_plans = NutritionPlan.objects.filter(
    is_system=True
)
```

### **Programas de Entrenamiento:**
```python
from workouts.models import WorkoutProgram

# Ver todos los templates
templates = WorkoutProgram.objects.filter(
    is_template=True
).filter(
    user__isnull=True  # No pertenecen a un usuario
)

# O programas del sistema
system_programs = WorkoutProgram.objects.filter(
    is_system=True
)
```

---

## ⚠️ **Importante: Diferencias entre Templates y Planes de Usuario**

### **Templates (`is_template=True` o `is_system=True`):**
- ✅ Se pueden editar desde el panel de admin
- ✅ Se usan como base para crear planes personalizados
- ✅ No pertenecen a un usuario específico (`user=None`)
- ✅ Se pueden asignar en las configuraciones por defecto
- ✅ Los cambios afectan a los **nuevos usuarios** que se registren

### **Planes de Usuario (`is_template=False`, `is_system=False`, `user=User`):**
- ✅ Son planes personalizados creados para usuarios específicos
- ✅ Se crean automáticamente cuando un usuario se registra
- ✅ Se basan en un template pero son independientes
- ✅ Los cambios en el template **NO afectan** planes de usuario ya creados

---

## 🎯 **Flujo Completo**

```
1. Administrador crea/edita Template
   ↓
2. Template se guarda en la base de datos
   ↓
3. Administrador asigna Template a Configuración por Defecto
   ↓
4. Usuario nuevo se registra
   ↓
5. Sistema busca Configuración que coincida con el perfil
   ↓
6. Sistema crea Plan Personalizado basado en el Template
   ↓
7. Usuario recibe su Plan Personalizado (independiente del Template)
```

**Nota:** Si modificas un Template después de que un usuario ya tiene su plan, el plan del usuario **NO se actualiza automáticamente**. Solo afecta a usuarios nuevos.

---

## 🔧 **Modificar desde Django Admin (Alternativa)**

Si prefieres usar Django Admin directamente:

1. Ve a `/admin/`
2. **Planes Nutricionales:** `Nutrition → Nutrition Plans`
3. **Programas de Entrenamiento:** `Workouts → Workout Programs`
4. Filtra por `is_template=True` o `is_system=True`
5. Edita el template deseado

---

## 📊 **Verificar Templates Existentes**

### **Desde el Panel:**
1. Ve a `/admin`
2. Click en **"Planes de Menús"** o **"Planes de Entrenamiento"**
3. Usa los filtros para ver solo templates:
   - Busca por "template" o "sistema"
   - Filtra por `is_template=True`

### **Desde la API:**
```bash
# Ver todos los templates de planes nutricionales
GET /api/admin/nutrition/plans/?is_template=true

# Ver todos los templates de programas de entrenamiento
GET /api/admin/workouts/programs/?is_template=true
```

### **Desde Django Shell:**
```python
from nutrition.models import NutritionPlan
from workouts.models import WorkoutProgram

# Templates de planes nutricionales
nutrition_templates = NutritionPlan.objects.filter(
    is_template=True, user__isnull=True
)
print(f"Templates nutricionales: {nutrition_templates.count()}")

# Templates de programas de entrenamiento
workout_templates = WorkoutProgram.objects.filter(
    is_template=True, user__isnull=True
)
print(f"Templates de entrenamiento: {workout_templates.count()}")
```

---

## ✅ **Resumen Rápido**

| Qué Modificar | Dónde | Ruta en Panel |
|---------------|-------|---------------|
| **Template Plan Nutricional** | `/admin` → "Planes de Menús" | Panel → Planes de Menús |
| **Template Programa Entrenamiento** | `/admin` → "Planes de Entrenamiento" | Panel → Planes de Entrenamiento |
| **Asignar Templates a Configuraciones** | `/admin` → "Config. por defecto" | Panel → Config. por defecto |

---

## 🚀 **Próximos Pasos**

1. **Revisa los templates existentes:**
   - Ve a `/admin` → "Planes de Menús"
   - Ve a `/admin` → "Planes de Entrenamiento"

2. **Modifica los que necesites:**
   - Edita macros, comidas, ejercicios, etc.

3. **Asigna a configuraciones:**
   - Ve a `/admin` → "Config. por defecto"
   - Asigna los templates modificados a las configuraciones

4. **Prueba con un usuario nuevo:**
   - Crea un usuario de prueba
   - Verifica que se asignen los planes correctos


