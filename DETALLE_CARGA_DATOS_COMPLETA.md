# 📊 Detalle Completo de Datos que se Cargarían

## 📋 Resumen Ejecutivo

Con la secuencia de comandos que proporcionaste, se cargarían:

- **~219 recetas** nutricionales
- **~105+ planes nutricionales** personalizados
- **~40 ejercicios** + **múltiples planes de entrenamiento**
- **9 configuraciones** por defecto
- **5 usuarios demo** + datos asociados

---

## 1️⃣ `create_default_data` - Datos Básicos por Defecto

### Datos que se crearán:

**✅ 1 Plan Nutricional por Defecto:**
- Nombre: "Plan Básico de Nutrición"
- Calorías: 2000 kcal/día
- Macros: 150g proteína, 250g carbohidratos, 67g grasas
- **4 Comidas:**
  - Desayuno (8:00) - 500 kcal
  - Almuerzo (13:00) - 700 kcal
  - Merienda (16:00) - 300 kcal
  - Cena (20:00) - 500 kcal

**✅ 1 Programa de Entrenamiento por Defecto:**
- Nombre: "Programa Básico de Entrenamiento"
- Duración: 4 semanas
- Dificultad: Principiante
- **7 Días:**
  - Lunes: Pecho y tríceps
  - Martes: Espalda y bíceps
  - Miércoles: Piernas
  - Jueves: Hombros
  - Viernes: Cuerpo completo
  - Sábado: Descanso
  - Domingo: Descanso

**✅ 5 Consejos Motivacionales:**
- "¡Cada paso cuenta!"
- "Hidratación es clave"
- "Consistencia sobre intensidad"
- "Celebra tus logros"
- "Descanso es entrenamiento"

**✅ 5 Ejercicios Básicos:**
- Flexiones de pecho
- Sentadillas
- Plancha
- Burpees
- Mountain climbers

**✅ 5 Alimentos Básicos:**
- Pollo (165 kcal/100g, 31g proteína)
- Arroz integral (111 kcal/100g, 2.6g proteína)
- Brócoli (34 kcal/100g, 2.8g proteína)
- Huevo (70 kcal/unidad, 6g proteína)
- Avena (389 kcal/100g, 17g proteína)

**⚠️ Seguridad:** Usa `get_or_create()` - NO elimina datos existentes

---

## 2️⃣ `populate_expanded_recipes` - Recetas Expandidas

### Datos que se crearán:

**✅ ~219 Recetas Nutricionales** organizadas por categorías:

**Desayunos (5 base + ~50 adicionales = ~55 recetas):**
- Avena con plátano y frutos secos
- Tostadas de aguacate con huevo
- Smoothie bowl de frutas
- Omelette de clara con verduras
- Panquecas de avena y proteína
- + ~50 recetas adicionales generadas aleatoriamente

**Almuerzos (5 base + ~50 adicionales = ~55 recetas):**
- Ensalada de quinoa con pollo
- Salmón a la plancha con verduras
- Pollo al curry con arroz integral
- Tacos de carne con verduras
- Pasta integral con atún y verduras
- + ~50 recetas adicionales generadas aleatoriamente

**Cenas (5 base + ~50 adicionales = ~55 recetas):**
- Filete de ternera con patatas asadas
- Pescado con ensalada de rúcula
- Tortilla española con ensalada
- Sopa de verduras con pollo
- Hamburguesa casera de pavo
- + ~50 recetas adicionales generadas aleatoriamente

**Snacks (4 base + ~50 adicionales = ~54 recetas):**
- Proteína shake
- Fruta con yogur y nueces
- Hummus con verduras
- Batido verde energético
- + ~50 recetas adicionales generadas aleatoriamente

**Cada receta incluye:**
- Nombre
- Categoría (Desayuno/Almuerzo/Cena/Snack)
- Dificultad (easy/medium/hard)
- Tiempo de preparación (minutos)
- Porciones
- Calorías por porción
- Ingredientes (lista)
- Instrucciones (texto)
- Tags (etiquetas)

**⚠️ Seguridad:** 
- Usa verificación `if exists()` - NO duplica recetas
- Solo crea si no existen
- Opción `--clear` disponible pero NO se usará

---

## 3️⃣ `populate_expanded_nutrition_plans` - Planes Nutricionales Expandidos

### Datos que se crearán:

**✅ ~105 Planes Nutricionales Personalizados** basados en combinaciones:

**Combinaciones base:**
- **3 Objetivos:** pérdida de peso, ganancia muscular, recomposición corporal
- **5 Niveles de actividad:** sedentario, ligero, moderado, activo, muy activo
- **7 Días de entrenamiento:** 1-7 días/semana
- **Total:** 3 × 5 × 7 = **105 planes base**

**Cada plan incluye:**
- Nombre descriptivo (ej: "Plan Pérdida de Peso - Moderado - 3 días/semana")
- Descripción personalizada
- Calorías diarias calculadas según:
  - Nivel de actividad base (1800-2600 kcal)
  - Ajuste por objetivo:
    - Pérdida de peso: -300 a -500 kcal
    - Ganancia muscular: +300 a +500 kcal
    - Recomposición: mantenimiento
  - Ajuste por días de entrenamiento: +50 kcal por día
- Macros calculados según objetivo:
  - Pérdida de peso: 35% proteína, 35% carbos, 30% grasas
  - Ganancia muscular: 30% proteína, 45% carbos, 25% grasas
  - Recomposición: 30% proteína, 40% carbos, 30% grasas
- Duración (semanas)
- Comidas asociadas con recetas del paso anterior

**✅ Planes Especiales Adicionales:**
- Planes bajo en calorías
- Planes alto en proteína
- Planes vegetarianos
- Planes para deportistas

**Total estimado: ~105-120 planes nutricionales**

**⚠️ Seguridad:**
- Verifica si el plan ya existe antes de crear
- NO elimina planes existentes (a menos que uses `--clear`, que NO usaremos)
- Requiere que existan recetas (por eso se ejecuta después de `populate_expanded_recipes`)

---

## 4️⃣ `populate_workouts` - Ejercicios y Planes de Entrenamiento

### Datos que se crearán:

**✅ ~40 Ejercicios** organizados por grupos musculares:

**Pecho (10 ejercicios):**
- Press de Banca
- Press Inclinado
- Press Declinado
- Flexiones
- Flexiones Inclinadas
- Flexiones Declinadas
- Aperturas con Mancuernas
- Fondos (Dips)
- Pullovers
- Cruce con Cables

**Espalda (7+ ejercicios):**
- Dominadas
- Remo con Barra
- Remo con Mancuernas
- Jalones al Pecho
- Jalones a la Nuca
- Hiperextensiones
- Encogimiento de Hombros

**Piernas (10 ejercicios):**
- Sentadillas
- Sentadillas con Barra
- Sentadillas Frontales
- Peso Muerto
- Peso Muerto Rumano
- Zancadas
- Prensa de Piernas
- Extensiones de Cuádriceps
- Curl de Femorales
- Elevación de Talones

**Hombros (5 ejercicios):**
- Press Militar
- Press Frontal con Mancuernas
- Elevaciones Laterales
- Elevaciones Frontales
- Vuelos Posteriores

**Bíceps (4 ejercicios):**
- Curl con Barra
- Curl con Mancuernas
- Curl Martillo
- Curl Concentrado

**Tríceps (4 ejercicios):**
- Fondos en Paralelas
- Extensiones de Tríceps
- Press Francés
- Patadas de Tríceps

**Core (6 ejercicios):**
- Plancha
- Plancha Lateral
- Crunches
- Mountain Climbers
- Russian Twist
- V-Ups

**Cada ejercicio incluye:**
- Nombre
- Categoría (strength/bodyweight/cardio/core)
- Grupos musculares (lista)
- Instrucciones detalladas

**✅ Múltiples Planes de Entrenamiento Completos:**
- Plan Inicial - Tren Superior (principiante, 3 días/semana)
- Plan Inicial - Tren Inferior (principiante, 3 días/semana)
- Plan Intermedio - Push/Pull/Legs (intermedio, 6 días/semana)
- Plan Avanzado - Cuerpo Completo (avanzado, 4 días/semana)
- Y más planes según el código...

**Cada plan incluye:**
- Nombre y descripción
- Dificultad (beginner/intermediate/advanced)
- Objetivo (general_fitness/strength_building/muscle_gain/etc.)
- Duración (semanas)
- Días por semana
- Días de entrenamiento con ejercicios asignados
- Series, repeticiones y tiempos de descanso

**⚠️ Seguridad:**
- Usa `get_or_create()` - NO duplica ejercicios
- Solo crea si no existen

---

## 5️⃣ `seed_default_plan_configurations` - Configuraciones por Defecto

### Datos que se crearán:

**✅ 9 Configuraciones por Defecto** para asignación automática de planes:

1. **Principiante - Pérdida de peso - Casa**
   - Objetivo: perder peso
   - Ubicación: casa
   - Actividad: sedentario
   - Días: 1-3/semana

2. **Principiante - Pérdida de peso - Gimnasio**
   - Objetivo: perder peso
   - Ubicación: gimnasio
   - Actividad: sedentario
   - Días: 1-3/semana
   - Equipamiento: mancuernas, máquinas

3. **Intermedio - Ganancia muscular - Gimnasio**
   - Objetivo: ganar músculo
   - Ubicación: gimnasio
   - Actividad: moderado
   - Días: 4-6/semana
   - Equipamiento: mancuernas, barras, máquinas

4. **Avanzado - Ganancia muscular - Gimnasio**
   - Objetivo: ganar músculo
   - Ubicación: gimnasio
   - Actividad: activo
   - Días: 5-7/semana
   - Equipamiento: mancuernas, barras, máquinas, peso libre

5. **Mantenimiento - Activo - Casa**
   - Objetivo: recomposición
   - Ubicación: casa
   - Actividad: activo
   - Días: 3-5/semana
   - Equipamiento: peso corporal, bandas

6. **Joven - Pérdida de peso**
   - Objetivo: perder peso
   - Edad: 18-30 años

7. **Adulto - Mantenimiento**
   - Objetivo: recomposición
   - Actividad: moderado
   - Edad: 31-50 años

8. **Vegetariano - Pérdida de peso**
   - Objetivo: perder peso
   - Restricción: vegetariano

9. **Configuración por defecto general**
   - Configuración genérica para usuarios que no cumplen criterios específicos

**Cada configuración incluye:**
- Nombre y descripción
- Prioridad (para matching)
- Objetivo principal
- Ubicación de entrenamiento
- Nivel de actividad
- Género (si aplica)
- Rango de días de entrenamiento
- Rango de edad (si aplica)
- Restricciones dietéticas
- Palabras clave de equipamiento
- Plan nutricional asociado
- Programa de entrenamiento asociado (se asigna después)

**⚠️ Seguridad:**
- Usa `update_or_create()` - Actualiza si existe, crea si no
- NO elimina configuraciones existentes

---

## 6️⃣ `seed_demo` - Datos Demo Completos

### Datos que se crearán:

**✅ 5 Usuarios Demo:**
- Admin: `admin@mykaizenfit.com` (password: `admin123`) - Solo si no existe
- Trainer: `trainer@mykaizenfit.com` (password: `trainer123`) - Solo si no existe
- 3 usuarios miembros: `user1@mykaizenfit.com` a `user3@mykaizenfit.com` (password: `user123`)

**✅ Nutrición:**
- 5 alimentos básicos (Pollo, Arroz, Brócoli, Huevo, Avena) - Solo si no existen
- 1 plan nutricional completo para el primer usuario:
  - Nombre: "Plan Definición 1800"
  - 1800 calorías/día
  - 4 comidas (Desayuno, Almuerzo, Cena, Snack)
  - Alimentos asociados a cada comida

**✅ Entrenamiento:**
- 5 ejercicios básicos (Press de Banca, Sentadillas, Peso Muerto, Pull-ups, Plancha) - Solo si no existen
- 1 programa de entrenamiento completo para el primer usuario:
  - Nombre: "Programa Fuerza 4x4"
  - 4 días/semana, 8 semanas
  - 5 días de entrenamiento con ejercicios asignados

**✅ Progreso:**
- 7 entradas de peso (últimos 7 días) para el primer usuario
- 1 medición corporal

**✅ Notificaciones:**
- 3 notificaciones de ejemplo para el primer usuario

**✅ Logros:**
- 3 logros disponibles:
  - "Primer Entrenamiento" (10 puntos)
  - "Racha de 7 Días" (50 puntos)
  - "Pérdida de 5kg" (100 puntos)
- 1 logro asignado al primer usuario

**⚠️ Seguridad:**
- Usa `get_or_create()` cuando se ejecuta SIN `--clear`
- **NO usaremos `--clear`** para no eliminar datos
- Solo crea si no existen

---

## 📊 Resumen Total de Datos

### Después de ejecutar todos los scripts:

| Categoría | Cantidad |
|-----------|----------|
| **Recetas** | ~219 |
| **Planes Nutricionales** | ~105-120 |
| **Ejercicios** | ~40 |
| **Planes de Entrenamiento** | Múltiples (depende del script) |
| **Configuraciones** | 9 |
| **Usuarios Demo** | 5 |
| **Alimentos** | 5 |
| **Consejos Motivacionales** | 5 |
| **Logros** | 3 |
| **Notificaciones** | 3 |
| **Entradas de Peso** | 7 |
| **Mediciones Corporales** | 1 |

---

## ⚠️ Consideraciones Importantes

### 1. **Orden de Ejecución:**
- ✅ El orden es correcto
- `populate_expanded_nutrition_plans` requiere recetas (por eso va después de `populate_expanded_recipes`)
- `seed_default_plan_configurations` requiere planes nutricionales (por eso va después)

### 2. **Tiempo de Ejecución:**
- `populate_expanded_recipes`: ~2-5 minutos (219 recetas)
- `populate_expanded_nutrition_plans`: ~5-10 minutos (105+ planes)
- `populate_workouts`: ~2-3 minutos (40 ejercicios + planes)
- Total estimado: **~10-20 minutos**

### 3. **Espacio en Base de Datos:**
- Recetas: ~50-100 KB
- Planes nutricionales: ~200-300 KB
- Ejercicios: ~20-30 KB
- Total estimado: **~500 KB - 1 MB**

### 4. **Seguridad:**
- ✅ Todos los scripts usan `get_or_create()` o verificaciones similares
- ✅ NO eliminan datos existentes (a menos que uses `--clear`, que NO usaremos)
- ✅ No duplican datos
- ✅ Son idempotentes (se pueden ejecutar múltiples veces)

---

## ✅ Confirmación Final

**Los datos son correctos y seguros porque:**

1. ✅ **No se eliminarán datos existentes** (no usamos `--clear`)
2. ✅ **No se duplicarán datos** (usa `get_or_create()` o verificaciones)
3. ✅ **Valores nutricionales correctos** (revisados en el código)
4. ✅ **Relaciones correctas** (foreign keys válidas)
5. ✅ **Datos realistas y coherentes**
6. ✅ **Orden de ejecución correcto**

**¿Procedemos con la carga?**

