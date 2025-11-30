# 🔑 Credenciales de Usuarios de Prueba - Nex-Fit

## 📋 Resumen

Se han creado **3 usuarios de prueba** con diferentes perfiles y planes asignados automáticamente según el formulario de registro.

---

## 👥 Usuarios de Prueba

### **Usuario 1: María García**
- **📧 Email:** `usuario1@test.com`
- **🔒 Contraseña:** `Test1234!`
- **👤 Nombre completo:** María García
- **📅 Fecha de nacimiento:** 15/05/1995 (28 años)
- **⚧️ Género:** Femenino
- **📏 Altura:** 165 cm
- **⚖️ Peso actual:** 75 kg
- **🎯 Peso objetivo:** 65 kg
- **🎯 Objetivo principal:** Pérdida de peso o Definir
- **📊 Nivel de actividad:** Sedentario
- **📅 Días de entrenamiento:** 3 días/semana (Lunes, Miércoles, Viernes)
- **🏠 Lugar de entrenamiento:** Casa
- **🍽️ Plan nutricional asignado:** Plan Vegetariano - María García (1800 cal/día)
- **🏋️ Plan de entrenamiento:** Asignado automáticamente

---

### **Usuario 2: Carlos Rodríguez**
- **📧 Email:** `usuario2@test.com`
- **🔒 Contraseña:** `Test1234!`
- **👤 Nombre completo:** Carlos Rodríguez
- **📅 Fecha de nacimiento:** 20/08/1990 (33 años)
- **⚧️ Género:** Masculino
- **📏 Altura:** 180 cm
- **⚖️ Peso actual:** 70 kg
- **🎯 Peso objetivo:** 80 kg
- **🎯 Objetivo principal:** Ganar músculo o Subir de peso
- **📊 Nivel de actividad:** Moderado
- **📅 Días de entrenamiento:** 4 días/semana (Lunes, Martes, Jueves, Sábado)
- **🏋️ Lugar de entrenamiento:** Gimnasio
- **🍽️ Plan nutricional asignado:** Plan Pro - Ganancia Muscular - Carlos Rodríguez (2000 cal/día)
- **🏋️ Plan de entrenamiento:** Asignado automáticamente

---

### **Usuario 3: Ana Martínez**
- **📧 Email:** `usuario3@test.com`
- **🔒 Contraseña:** `Test1234!`
- **👤 Nombre completo:** Ana Martínez
- **📅 Fecha de nacimiento:** 10/03/1992 (31 años)
- **⚧️ Género:** Femenino
- **📏 Altura:** 170 cm
- **⚖️ Peso actual:** 65 kg
- **🎯 Peso objetivo:** 65 kg (mantenimiento)
- **🎯 Objetivo principal:** Recomposición corporal
- **📊 Nivel de actividad:** Activo
- **📅 Días de entrenamiento:** 5 días/semana (Lunes a Miércoles, Viernes, Sábado)
- **🏋️ Lugar de entrenamiento:** Gimnasio
- **🍽️ Plan nutricional asignado:** Plan Activo - Recomposición Corporal - Ana Martínez (2200 cal/día)
- **🏋️ Plan de entrenamiento:** Asignado automáticamente

---

## 🍽️ Planes Nutricionales Creados

Se han creado **5 planes nutricionales básicos** disponibles para asignación:

1. **Plan Básico - Pérdida de Peso**
   - Calorías: 1500 cal/día
   - Proteínas: 30% | Carbohidratos: 40% | Grasas: 30%
   - Duración: 4 semanas
   - Para: Usuarios con objetivo de pérdida de peso y nivel sedentario

2. **Plan Moderado - Pérdida de Peso**
   - Calorías: 1800 cal/día
   - Proteínas: 30% | Carbohidratos: 40% | Grasas: 30%
   - Duración: 4 semanas
   - Para: Usuarios con objetivo de pérdida de peso y nivel moderado

3. **Plan Pro - Ganancia Muscular**
   - Calorías: 2500 cal/día
   - Proteínas: 35% | Carbohidratos: 45% | Grasas: 20%
   - Duración: 8 semanas
   - Para: Usuarios con objetivo de ganancia muscular

4. **Plan Premium - Mantenimiento**
   - Calorías: 2000 cal/día
   - Proteínas: 25% | Carbohidratos: 50% | Grasas: 25%
   - Duración: 4 semanas
   - Para: Usuarios con objetivo de mantenimiento

5. **Plan Activo - Recomposición Corporal**
   - Calorías: 2200 cal/día
   - Proteínas: 30% | Carbohidratos: 45% | Grasas: 25%
   - Duración: 6 semanas
   - Para: Usuarios con objetivo de recomposición corporal y nivel activo

Cada plan incluye **5 comidas por defecto**:
- Desayuno
- Snack Mañana
- Almuerzo
- Snack Tarde
- Cena

---

## ⚙️ Configuraciones de Planes por Defecto

Se han creado **6 configuraciones** que mapean perfiles de usuario a planes:

1. **Pérdida de Peso - Sedentario**
   - Objetivo: `lose_weight`
   - Actividad: `sedentary`
   - Plan: Plan Básico - Pérdida de Peso

2. **Pérdida de Peso - Moderado**
   - Objetivo: `lose_weight`
   - Actividad: `moderate`
   - Plan: Plan Moderado - Pérdida de Peso

3. **Ganancia Muscular - Moderado**
   - Objetivo: `gain_muscle`
   - Actividad: `moderate`
   - Plan: Plan Pro - Ganancia Muscular

4. **Ganancia Muscular - Activo**
   - Objetivo: `gain_muscle`
   - Actividad: `active`
   - Plan: Plan Pro - Ganancia Muscular

5. **Recomposición Corporal - Activo**
   - Objetivo: `body_recomposition`
   - Actividad: `active`
   - Plan: Plan Activo - Recomposición Corporal

6. **Mantenimiento - General**
   - Objetivo: `body_recomposition`
   - Actividad: Cualquiera
   - Plan: Plan Premium - Mantenimiento

---

## 🔄 Cómo Funciona la Asignación Automática

1. **Al completar el formulario de registro inicial**, el sistema:
   - Busca una `DefaultPlanConfiguration` que coincida con el perfil del usuario
   - Criterios de coincidencia:
     - `main_goal` (objetivo principal)
     - `activity_level` (nivel de actividad)
     - `training_location` (lugar de entrenamiento)
     - `training_days_per_week` (días de entrenamiento)
     - `gender` (género)
     - `age` (edad)
     - `dietary_restrictions` (restricciones dietéticas)
     - `equipment_available` (equipamiento disponible)

2. **Si encuentra una configuración que coincide:**
   - Asigna el plan nutricional asociado (`default_nutrition_plan`)
   - Asigna el plan de entrenamiento asociado (`default_workout_program`)
   - Guarda la referencia en `user.default_plan_configuration`

3. **Si no encuentra una configuración:**
   - No asigna planes automáticamente
   - El administrador puede asignar planes manualmente

---

## 👨‍💼 Funcionalidades para Administradores

Los administradores pueden:

1. **Crear nuevos planes nutricionales:**
   - Desde el panel de administración
   - Configurar calorías, macronutrientes, duración, etc.

2. **Modificar planes existentes:**
   - Editar cualquier plan nutricional
   - Cambiar comidas, calorías, macros, etc.

3. **Crear configuraciones de planes:**
   - Definir qué planes se asignan según el perfil del usuario
   - Configurar prioridades (las prioridades más bajas se evalúan primero)

4. **Asignar planes individualmente:**
   - Cambiar el plan de un usuario específico
   - Modificar planes asignados a usuarios
   - Ver historial de cambios de planes

5. **Gestionar usuarios:**
   - Ver todos los usuarios y sus planes asignados
   - Modificar perfiles de usuarios
   - Reasignar planes manualmente

---

## 🧪 Cómo Probar

1. **Iniciar sesión con cualquiera de los usuarios:**
   ```
   Email: usuario1@test.com
   Contraseña: Test1234!
   ```

2. **Verificar que el plan se asignó correctamente:**
   - Ir a la sección de Nutrición
   - Verificar que aparece el plan asignado
   - Verificar las comidas del plan

3. **Verificar que el plan de entrenamiento se asignó:**
   - Ir a la sección de Entrenamientos
   - Verificar que aparece el plan asignado

4. **Como administrador, modificar un plan:**
   - Iniciar sesión como administrador
   - Ir al panel de administración
   - Modificar planes nutricionales o asignar nuevos planes a usuarios

---

## 📝 Notas Importantes

- ✅ Todos los planes se asignan **automáticamente** al completar el formulario de registro
- ✅ Los administradores pueden **modificar** cualquier plan en cualquier momento
- ✅ Los administradores pueden **crear nuevos planes** desde el panel de administración
- ✅ Los administradores pueden **asignar planes individualmente** a usuarios específicos
- ✅ Los planes se pueden **personalizar** por usuario sin afectar el plan base

---

## 🔄 Re-ejecutar el Script

Si necesitas recrear los usuarios de prueba o actualizar los planes:

```bash
cd backend
python create_test_users_with_plans.py
```

El script:
- ✅ Verifica si los planes ya existen antes de crearlos
- ✅ Actualiza usuarios existentes si ya están creados
- ✅ Reasigna planes automáticamente según el perfil

---

**Última actualización:** $(date)

