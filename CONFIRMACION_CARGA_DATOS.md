# 📋 Confirmación de Carga de Datos

## 📊 Estado Actual de la Base de Datos

- **Usuarios:** 2 (1 superusuario, 2 activos)
- **Planes nutricionales por defecto:** 0
- **Recetas:** 0
- **Alimentos:** 0
- **Ejercicios:** 0
- **Programas de entrenamiento por defecto:** 0
- **Configuraciones por defecto:** 0

---

## ✅ Scripts que Vamos a Ejecutar (Orden Recomendado)

### 1. `create_default_data` - Datos Básicos por Defecto
**Comando:** `python manage.py create_default_data`

**Datos que se crearán:**
- ✅ **1 Plan Nutricional por Defecto:**
  - Nombre: "Plan Básico de Nutrición"
  - Calorías: 2000 kcal/día
  - Macros: 150g proteína, 250g carbohidratos, 67g grasas
  - **4 Comidas por defecto:**
    - Desayuno (8:00) - 500 kcal
    - Almuerzo (13:00) - 700 kcal
    - Merienda (16:00) - 300 kcal
    - Cena (20:00) - 500 kcal

- ✅ **1 Programa de Entrenamiento por Defecto:**
  - Nombre: "Programa Básico de Entrenamiento"
  - Duración: 4 semanas
  - Dificultad: Principiante
  - **7 Días de entrenamiento:**
    - Lunes: Pecho y tríceps
    - Martes: Espalda y bíceps
    - Miércoles: Piernas
    - Jueves: Hombros
    - Viernes: Cuerpo completo
    - Sábado: Descanso
    - Domingo: Descanso

- ✅ **5 Consejos Motivacionales:**
  - "¡Cada paso cuenta!"
  - "Hidratación es clave"
  - "Consistencia sobre intensidad"
  - "Celebra tus logros"
  - "Descanso es entrenamiento"

- ✅ **5 Ejercicios Básicos:**
  - Flexiones de pecho
  - Sentadillas
  - Plancha
  - Burpees
  - Mountain climbers

- ✅ **5 Alimentos Básicos:**
  - Pollo (165 kcal/100g, 31g proteína)
  - Arroz integral (111 kcal/100g, 2.6g proteína)
  - Brócoli (34 kcal/100g, 2.8g proteína)
  - Huevo (70 kcal/unidad, 6g proteína)
  - Avena (389 kcal/100g, 17g proteína)

**⚠️ Seguridad:** Este script usa `get_or_create()`, por lo que:
- ✅ **NO elimina datos existentes**
- ✅ Solo crea si no existen
- ✅ Es seguro ejecutar múltiples veces

---

### 2. `seed_demo` - Datos Demo Completos (SIN --clear)
**Comando:** `python manage.py seed_demo --users 5`

**Datos que se crearán:**
- ✅ **Usuarios Demo:**
  - Admin: `admin@mykaizenfit.com` (password: `admin123`) - Solo si no existe
  - Trainer: `trainer@mykaizenfit.com` (password: `trainer123`) - Solo si no existe
  - 5 usuarios miembros: `user1@mykaizenfit.com` a `user5@mykaizenfit.com` (password: `user123`)

- ✅ **Nutrición:**
  - 5 alimentos básicos (Pollo, Arroz, Brócoli, Huevo, Avena) - Solo si no existen
  - 1 plan nutricional completo para el primer usuario:
    - Nombre: "Plan Definición 1800"
    - 1800 calorías/día
    - 4 comidas (Desayuno, Almuerzo, Cena, Snack)
    - Alimentos asociados a cada comida

- ✅ **Entrenamiento:**
  - 5 ejercicios básicos (Press de Banca, Sentadillas, Peso Muerto, Pull-ups, Plancha) - Solo si no existen
  - 1 programa de entrenamiento completo para el primer usuario:
    - Nombre: "Programa Fuerza 4x4"
    - 4 días/semana, 8 semanas
    - 5 días de entrenamiento con ejercicios asignados

- ✅ **Progreso:**
  - 7 entradas de peso (últimos 7 días) para el primer usuario
  - 1 medición corporal

- ✅ **Notificaciones:**
  - 3 notificaciones de ejemplo para el primer usuario

- ✅ **Logros:**
  - 3 logros disponibles:
    - "Primer Entrenamiento" (10 puntos)
    - "Racha de 7 Días" (50 puntos)
    - "Pérdida de 5kg" (100 puntos)
  - 1 logro asignado al primer usuario

**⚠️ Seguridad:** Este script usa `get_or_create()` cuando se ejecuta SIN `--clear`:
- ✅ **NO elimina datos existentes**
- ✅ Solo crea si no existen
- ✅ Es seguro ejecutar múltiples veces
- ⚠️ **NO usaremos `--clear`** para no eliminar datos

---

## 🔍 Verificación de Integridad de Datos

### Validaciones que realizan los scripts:

1. **Usuarios:**
   - ✅ Usa `get_or_create()` - No duplica usuarios existentes
   - ✅ Valida email único
   - ✅ Establece contraseñas seguras (aunque son de demo)

2. **Alimentos:**
   - ✅ Valores nutricionales correctos (calorías, proteínas, carbohidratos, grasas)
   - ✅ Usa `get_or_create()` por nombre - No duplica

3. **Ejercicios:**
   - ✅ Categorías válidas (strength, cardio, core, etc.)
   - ✅ Grupos musculares definidos
   - ✅ Instrucciones incluidas

4. **Planes Nutricionales:**
   - ✅ Calorías y macros coherentes
   - ✅ Comidas con horarios válidos
   - ✅ Relaciones correctas entre plan-comida-alimento

5. **Planes de Entrenamiento:**
   - ✅ Días de la semana válidos
   - ✅ Ejercicios asignados correctamente
   - ✅ Series, repeticiones y tiempos de descanso definidos

---

## 📈 Resultado Esperado Después de la Carga

### Después de `create_default_data`:
- Planes nutricionales por defecto: **1**
- Programas de entrenamiento por defecto: **1**
- Ejercicios: **5**
- Alimentos: **5**
- Consejos motivacionales: **5**

### Después de `seed_demo`:
- Usuarios: **7** (2 existentes + 5 nuevos)
- Planes nutricionales (de usuario): **1**
- Programas de entrenamiento (de usuario): **1**
- Ejercicios: **5** (los mismos, no duplica)
- Alimentos: **5** (los mismos, no duplica)
- Entradas de peso: **7**
- Mediciones corporales: **1**
- Notificaciones: **3**
- Logros: **3**
- Logros de usuario: **1**

---

## ✅ Confirmación Final

**Los datos son correctos y seguros porque:**

1. ✅ **No se eliminarán datos existentes** (no usamos `--clear`)
2. ✅ **No se duplicarán datos** (usa `get_or_create()`)
3. ✅ **Valores nutricionales correctos** (revisados en el código)
4. ✅ **Relaciones correctas** (foreign keys válidas)
5. ✅ **Datos de prueba realistas** (valores coherentes)

**¿Procedemos con la carga?**

