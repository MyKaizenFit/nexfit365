# 📊 Contenido de la Base de Datos - Nex-Fit

## 📋 Resumen de Datos Actuales

Basado en la consulta realizada a la base de datos `mykaizenfit`:

### **Datos Existentes:**
- ✅ **3 usuarios** registrados (`accounts_customuser`)
- ✅ **85 ejercicios** disponibles (`workouts_exercise`)
- ✅ **3 planes de entrenamiento** (`workouts_workoutprogram`)

### **⚠️ Datos Faltantes (Deberían Existir):**
- ❌ **0 planes nutricionales por defecto** (`nutrition_defaultnutritionplan`) - **DEBERÍA HABER**
- ❌ **0 comidas por defecto** (`nutrition_defaultmeal`) - **DEBERÍA HABER**
- ❌ **0 planes nutricionales asignados a usuarios** (`nutrition_nutritionplan`) - **DEBERÍA HABER**
- ❌ **0 planes de entrenamiento asignados a usuarios** (`workouts_userworkoutplan`) - **DEBERÍA HABER**
- ⚠️ **0 registros** en tablas de actividad del usuario (workout logs, meal logs, progreso, etc.)

---

## 🗄️ Estructura Completa de Datos

### **1. 👥 Módulo de Usuarios (`accounts`)**

#### `accounts_customuser`
- **Datos guardados:**
  - Información personal: username, email, nombre, apellido
  - Perfil: foto de perfil, fecha de nacimiento, altura, peso
  - Configuración: rol (user/trainer/admin), objetivos de fitness (JSON)
  - Estado: verificación de cuenta, activación, último login
- **Relaciones:** Todos los demás módulos dependen de esta tabla

#### `accounts_defaultplanconfiguration`
- Configuraciones predeterminadas de planes para nuevos usuarios

---

### **2. 🏋️ Módulo de Entrenamientos (`workouts`)**

#### `workouts_exercise` ✅ **85 ejercicios**
- **Datos guardados:**
  - Nombre, descripción, instrucciones
  - Grupos musculares (JSON)
  - Equipamiento necesario (JSON)
  - Dificultad, URL de video
- **Estado actual:** Base de datos de ejercicios completa

#### `workouts_workoutprogram` ✅ **3 planes**
- **Datos guardados:**
  - Nombre, descripción, dificultad
  - Duración en semanas
  - Creador, visibilidad pública
  - Tags y ejercicios (JSON)
- **Estado actual:** Planes de entrenamiento predefinidos

#### `workouts_defaultexercise`
- Ejercicios predeterminados del sistema

#### `workouts_defaultworkoutprogram`
- Programas de entrenamiento predeterminados

#### `workouts_defaultworkoutday`
- Días de entrenamiento predeterminados

#### `workouts_userworkoutplan` ⚠️ **0 registros - DEBERÍA HABER**
- **Datos guardados:**
  - **Planes de entrenamiento asignados a usuarios específicos**
  - Cuando un usuario selecciona un plan de entrenamiento, se crea un `UserWorkoutPlan` para ese usuario
  - Relación con `WorkoutPlanTemplate` (plantilla base)
  - Fechas de inicio/fin, estado activo/inactivo
  - Notas, personalizaciones
  - Relación con `CustomUser` (cada usuario puede tener múltiples planes)
- **Estado actual:** ❌ **FALTA** - Ningún usuario tiene un plan de entrenamiento asignado
- **Cómo se crea:** Automáticamente cuando el usuario selecciona un plan desde el frontend o cuando un admin lo asigna

#### `workouts_userworkoutplanday`
- Días específicos de planes de usuario

#### `workouts_userworkoutplanexercise`
- Ejercicios específicos en días de planes de usuario

#### `workouts_workoutlog` ⚠️ **0 registros**
- **Datos guardados:**
  - Sesiones de entrenamiento completadas por usuarios
  - Fecha, duración, notas
  - Ejercicios realizados, series, repeticiones, peso

#### `workouts_workoutlogexercise`
- Ejercicios individuales dentro de un log de entrenamiento

#### `workouts_workoutlogset`
- Series individuales de ejercicios en logs

#### `workouts_workoutday`
- Días de entrenamiento en programas

#### `workouts_workoutdayexercise`
- Ejercicios en días específicos

#### `workouts_workoutplanday`
- Días en planes de entrenamiento

#### `workouts_workoutplanexercise`
- Ejercicios en planes de entrenamiento

#### `workouts_workoutplantemplate`
- Plantillas de planes de entrenamiento

---

### **3. 🥗 Módulo de Nutrición (`nutrition`)**

#### `nutrition_defaultnutritionplan` ⚠️ **0 registros - DEBERÍA HABER**
- **Datos guardados:**
  - **Planes nutricionales predeterminados del sistema** (plantillas disponibles)
  - Ejemplos: "Plan Básico - Pérdida de Peso", "Plan Pro - Ganancia Muscular", "Plan Premium - Mantenimiento"
  - Calorías diarias objetivo, porcentajes de macronutrientes
  - Duración en semanas, rol mínimo requerido (basic/pro/premium)
  - Tags, audiencia objetivo, imagen
- **Estado actual:** ❌ **FALTA** - No hay planes predeterminados disponibles
- **Scripts disponibles:** `create_basic_nutrition_plans.py`, `populate_expanded_nutrition_plans.py`

#### `nutrition_defaultmeal` ⚠️ **0 registros - DEBERÍA HABER**
- **Datos guardados:**
  - **Comidas predeterminadas** asociadas a planes nutricionales por defecto
  - Nombre, hora, calorías, macronutrientes (proteínas, carbohidratos, grasas)
  - Descripción, orden de la comida en el día
  - Relación con `DefaultNutritionPlan`
- **Estado actual:** ❌ **FALTA** - No hay comidas predeterminadas
- **Scripts disponibles:** `create_default_meals.py`

#### `nutrition_nutritionplan` ⚠️ **0 registros - DEBERÍA HABER**
- **Datos guardados:**
  - **Planes nutricionales personalizados asignados a usuarios específicos**
  - Cuando un usuario selecciona un plan predeterminado, se crea un `NutritionPlan` para ese usuario
  - Objetivos calóricos diarios personalizados
  - Objetivos de macronutrientes (proteínas, carbohidratos, grasas)
  - Fechas de inicio/fin, estado activo/inactivo
  - Relación con `CustomUser` (cada usuario puede tener múltiples planes)
- **Estado actual:** ❌ **FALTA** - Ningún usuario tiene un plan nutricional asignado
- **Cómo se crea:** Automáticamente cuando el usuario selecciona un plan desde el frontend

#### `nutrition_meal`
- **Datos guardados:**
  - Comidas registradas por usuarios
  - Tipo de comida (desayuno, almuerzo, cena, snack)
  - Alimentos consumidos (JSON)
  - Calorías y macronutrientes totales

#### `nutrition_meallog` ⚠️ **0 registros**
- **Datos guardados:**
  - Historial de comidas registradas
  - Fecha, tipo de comida, alimentos, calorías

#### `nutrition_food`
- Base de datos de alimentos con información nutricional

#### `nutrition_mealfood`
- Relación entre comidas y alimentos

#### `nutrition_dailymealselection`
- Selecciones diarias de comidas

#### `nutrition_recipe`
- Recetas disponibles

#### `nutrition_nutritionplanhistory`
- Historial de cambios en planes nutricionales

---

### **4. 📈 Módulo de Progreso (`progress`)**

#### `progress_weightentry` ⚠️ **0 registros**
- **Datos guardados:**
  - Registros de peso del usuario
  - Fecha, peso en kg
  - Notas opcionales

#### `progress_bodymeasurement`
- **Datos guardados:**
  - Medidas corporales (cintura, cadera, bíceps, etc.)
  - Fecha de medición
  - Valores en cm

#### `progress_progressphoto` ⚠️ **0 registros**
- **Datos guardados:**
  - Fotos de progreso del usuario
  - Fecha, imagen, notas
  - Comparaciones antes/después

#### `progress_moodentry`
- **Datos guardados:**
  - Registros de estado de ánimo
  - Fecha, nivel de ánimo (1-10), notas

---

### **5. 🏆 Módulo de Logros (`achievements`)**

#### `achievements_achievement`
- **Datos guardados:**
  - Logros disponibles en el sistema
  - Nombre, descripción, icono
  - Criterios para desbloquear (JSON)

#### `achievements_userachievement`
- **Datos guardados:**
  - Logros desbloqueados por usuarios
  - Fecha de desbloqueo

---

### **6. 🔔 Módulo de Notificaciones (`notifications`)**

#### `notifications_notification` ⚠️ **0 registros**
- **Datos guardados:**
  - Notificaciones para usuarios
  - Tipo, título, mensaje
  - Leído/no leído, fecha

#### `notifications_motivationaltip`
- Tips motivacionales del sistema

#### `notifications_feedbackmessage`
- Mensajes de feedback para usuarios

---

### **7. 📊 Módulo de Dashboard (`dashboard`)**

#### `dashboard_dashboarddata`
- **Datos guardados:**
  - Datos agregados para el dashboard
  - Estadísticas calculadas, gráficos
  - Cache de métricas

#### `dashboard_userstats`
- **Datos guardados:**
  - Estadísticas diarias por usuario
  - Total de entrenamientos, tiempo total
  - Calorías quemadas/consumidas
  - Cambio de peso, logros desbloqueados
  - Racha de días consecutivos

#### `dashboard_wellnesstip`
- Tips de bienestar del sistema

---

### **8. 🔐 Módulo de Autenticación (`token_blacklist`)**

#### `token_blacklist_blacklistedtoken`
- **Datos guardados:**
  - Tokens JWT invalidados (logout, rotación)
  - Fecha de expiración

#### `token_blacklist_outstandingtoken`
- **Datos guardados:**
  - Tokens JWT activos pendientes de expiración
  - Usuario, fecha de creación, expiración

---

### **9. 📅 Módulo de API/Clases (`api`)**

#### `api_plan`
- Planes de suscripción/clases

#### `api_subscription`
- Suscripciones de usuarios

#### `api_classsession`
- Sesiones de clases grupales

#### `api_booking`
- Reservas de clases

#### `api_attendance`
- Asistencia a clases

---

### **10. 🔧 Módulo de Django (`django_*`)**

#### `django_migrations`
- Historial de migraciones aplicadas

#### `django_content_type`
- Tipos de contenido del sistema

#### `django_admin_log`
- Logs de acciones en el admin

#### `django_session`
- Sesiones de usuarios activas

#### `auth_group`, `auth_permission`
- Grupos y permisos del sistema

---

## 📊 Resumen por Categoría

### **✅ Datos del Sistema (Siempre presentes)**
- Ejercicios base (85) ✅
- Planes de entrenamiento predeterminados (3) ✅
- Usuarios del sistema (3) ✅
- Configuraciones predeterminadas ✅

### **⚠️ Datos del Sistema que FALTAN (Deberían estar)**
- **Planes nutricionales por defecto** (0) ❌
  - Deberían existir al menos 5-10 planes predeterminados
  - Ejemplos: Pérdida de peso, Ganancia muscular, Mantenimiento, Vegetariano, Deportivo
- **Comidas por defecto** (0) ❌
  - Deberían existir comidas asociadas a cada plan nutricional
  - Desayunos, almuerzos, cenas, snacks predeterminados

### **📝 Datos de Usuario (Se crean con el uso)**
- **Planes nutricionales asignados a usuarios** (0) ❌
  - Cuando un usuario selecciona un plan, se crea un `NutritionPlan` personalizado
  - Actualmente ningún usuario tiene un plan asignado
- **Planes de entrenamiento asignados a usuarios** (0) ❌
  - Cuando un usuario selecciona un plan, se crea un `UserWorkoutPlan` personalizado
  - Actualmente ningún usuario tiene un plan asignado
- Logs de entrenamiento (0) ⚠️
- Registros de comidas (0) ⚠️
- Progreso (peso, medidas, fotos) (0) ⚠️
- Notificaciones (0) ⚠️
- Estadísticas del dashboard (0) ⚠️
- Logros desbloqueados (0) ⚠️

### **🔐 Datos de Seguridad**
- Tokens JWT activos/invalidados
- Sesiones de usuario
- Logs de administración

---

## ⚠️ Importante para Producción

### **Base de Datos Existente**
- ✅ La base de datos `mykaizenfit` ya existe
- ✅ Contiene usuarios, ejercicios y planes de entrenamiento base
- ✅ **NO se creará una nueva base de datos**
- ✅ Se usará la misma contraseña configurada para mantener acceso

### **⚠️ Datos Faltantes que Deberían Poblarse**

#### **1. Planes Nutricionales por Defecto**
```bash
# Ejecutar en el contenedor backend:
docker exec -it reposseparadosparaelhost-backend-1 python manage.py shell
# O desde el host:
python backend/create_basic_nutrition_plans.py
```

#### **2. Comidas por Defecto**
```bash
docker exec -it reposseparadosparaelhost-backend-1 python manage.py create_default_meals
```

#### **3. Planes de Entrenamiento Asignados**
- Se crean automáticamente cuando un usuario selecciona un plan desde el frontend
- O se pueden asignar manualmente desde el panel de administración

#### **4. Planes Nutricionales Asignados**
- Se crean automáticamente cuando un usuario selecciona un plan desde el frontend
- O se pueden asignar manualmente desde el panel de administración

### **Persistencia de Datos**
- ✅ Los datos se guardan en el volumen Docker `postgres_data`
- ✅ Los backups automáticos se guardan en `./backups/`
- ✅ Al actualizar Docker, los datos se mantienen intactos

### **Migración a Producción**
- ✅ La misma base de datos se usará en producción
- ✅ Solo cambia la contraseña (ya configurada)
- ✅ Todos los datos existentes se mantendrán
- ⚠️ **IMPORTANTE:** Antes de ir a producción, poblar los planes nutricionales por defecto y comidas

---

## 🔍 Consultas Útiles

### Ver todos los usuarios:
```sql
SELECT id, username, email, role, is_active FROM accounts_customuser;
```

### Ver ejercicios disponibles:
```sql
SELECT id, name, difficulty, muscle_groups FROM workouts_exercise LIMIT 10;
```

### Ver planes de entrenamiento:
```sql
SELECT id, name, difficulty, duration_weeks FROM workouts_workoutprogram;
```

### Ver estadísticas de uso:
```sql
SELECT 
    (SELECT COUNT(*) FROM accounts_customuser) as usuarios,
    (SELECT COUNT(*) FROM workouts_exercise) as ejercicios,
    (SELECT COUNT(*) FROM workouts_workoutprogram) as planes,
    (SELECT COUNT(*) FROM workouts_workoutlog) as logs_entrenamiento,
    (SELECT COUNT(*) FROM nutrition_meallog) as logs_comidas;
```

