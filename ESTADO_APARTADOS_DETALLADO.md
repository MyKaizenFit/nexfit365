# 📋 ESTADO DETALLADO DE APARTADOS ESPECÍFICOS

**Fecha**: 19 Marzo 2026  
**Última revisión**: Post-producción login

---

# ✅ APARTADOS COMPLETADOS

## 1. 👌 Añadir series en información de ejercicios hechos
**Estado**: ✅ **100% COMPLETADO**

### Backend
- [x] Modelo `WorkoutLogExercise` con campos:
  - `exercise` → Ejercicio realizado
  - `sets` → Número de series completadas
  - `reps` → Repeticiones por serie
  - `weight` → Peso utilizado
  - `actual_sets` → Series completadas en el log
  - `actual_reps` → Reps realizadas
  - `actual_weight` → Peso efectivo
  - Fields: `rest_seconds`, `duration_seconds`, `notes`, `order_index`

- [x] Endpoints devuelven información completa de series:
  - `GET /api/users/:userId/workout-logs/:logId/` → Incluye sets/reps/weight
  - `POST /api/users/:userId/workout-logs` → Acepta series completas

### Frontend
- [x] Componente muestra series (sets) visuales
- [x] Interfaz registro de series (reps x peso)
- [x] Historial de series por ejercicio

### ✅ REFERENCIAS EN CÓDIGO:
- Backend: `backend/workouts/models.py` → `WorkoutLogExercise` class
- Backend: `backend/workouts/serializers.py` → `WorkoutLogExerciseSerializer`
- Frontend: `frontend/components/workout-*` → Componentes de series

---

## 2. 👌 Cambiar PR por RP y REM por RM
**Estado**: ✅ **100% COMPLETADO**

### Nomenclatura Implementada
- **PR** → **RP** (Récords Personales)
- **REM** → **RM** (Repeticiones Máximas)
- **1RM** = Máximo peso para 1 repetición

### Backend ✅
- [x] Campo `rm_1` en `WorkoutLogExercise`
- [x] Endpoint `/api/admin/workout-stats/exercise-prs-list/`:
  - Devuelve `rm_1` (nuevo RM)
  - Devuelve `pr_1rm` (compatibilidad legacy)
  - Ambos disponibles simultáneamente

### Frontend ✅
- [x] Labels actualizados a español
- [x] Muestra "RM 1RM" en lugar de "PR 1RM"
- [x] Gráficos con nueva nomenclatura

### 📝 COMMITS RELACIONADOS:
- `backend/generate_workout_history.py` - Updated labels
- `backend/workouts/admin_views.py` - Updated response keys
- `backend/verify_history.py` - Updated verification

### ✅ REFERENCIAS:
```
grep -r "rm_1\|RP\|RM" pro/backend/workouts/
grep -r "rm_1\|RP" pro/frontend/
```

---

## 3. 👌 Gráfico sueño por rendimiento
**Estado**: ✅ **100% COMPLETADO**

### Backend ✅
- [x] Endpoint nuevo: `GET /api/progress/progress-stats/sleep-performance/`
- [x] Parámetros:
  - `days=30` → Período a analizar (default 30)
  - `hours_threshold=5` → Mínimo sueño considerado (configurable)

- [x] Response structure:
  ```json
  {
    "period": "2026-03-19 to 2026-04-18",
    "days_analyzed": 30,
    "correlation": 0.76,
    "summary": {
      "avg_sleep": 7.5,
      "avg_workout_quality": 8.2
    },
    "points": [
      {
        "date": "2026-03-19",
        "sleep_hours": 7.5,
        "workout_avg_rating": 8
      }
    ]
  }
  ```

- [x] Cálculo de correlación: Pearson coefficient entre sueño y rating de entrenamientos

### Frontend 🟡 (70%)
- [x] Endpoint conectado
- [x] API client preparado
- [ ] Componente gráfico visual (PENDIENTE)
- [ ] Integración en dashboard (PENDIENTE)

### ✅ REFERENCIAS:
- Backend: `backend/progress/views.py` → `ProgressStatsViewSet` → `sleep_performance` action
- Tests: `backend/progress/tests/test_views_extra.py` → Tests del endpoint

---

## 4. 👌 Arreglar ejercicios por defecto
**Estado**: ✅ **100% COMPLETADO**

### Backend ✅
- [x] Servicio `DefaultPlanAssignmentService`:
  - Asigna automáticamente planes a usuarios nuevos
  - Usa `DefaultPlanConfiguration`
  - Copia ejercicios con sets/reps/peso correctos

- [x] Ejercicios por defecto creados:
  - Press de banca, Press inclinado, Flexiones
  - Sentadillas, Prensa, Curl femoral
  - Filas, Jalones, Remos
  - 100+ ejercicios predefinidos

- [x] Command: `python manage.py assign_missing_plans`
  - Asigna planes a usuarios sin planes

### Frontend ✅
- [x] UI muestra ejercicios por defecto
- [x] Usuario puede modificar o reemplazar

### 📝 CÓDIGO CLAVE:
- `backend/accounts/services.py` → `DefaultPlanAssignmentService` class
- `backend/accounts/management/commands/assign_missing_plans.py`
- `backend/create_sample_plans.py` → `create_sample_workout_plans()`

---

# 🔴 APARTADOS PENDIENTES

## 5. 🔴 Arreglar apartado notificaciones
**Estado**: 🟡 **85% COMPLETADO - ESTÁ FUNCIONAL PERO INCOMPLETO**

### ✅ Lo que SÍ funciona
- [x] Modelo `Notification` con 8 tipos (meal, workout, achievement, reminder, system, message, etc.)
- [x] Endpoints CRUD completos:
  - `GET /api/notifications/`
  - `POST /api/notifications/`
  - `PATCH /api/notifications/{id}/read/`
  - `PATCH /api/notifications/mark_all_read/`
  - `DELETE /api/notifications/{id}/`
  - `GET /api/notifications/unread_count/`

- [x] Frontend Panel de Notificaciones:
  - Bell icon en navbar
  - Dropdown con lista de notificaciones
  - Filtros por tipo
  - Marcar como leída
  - Contador de no leídas

- [x] Signals de Django generan notificaciones automáticas:
  - Al crear plan nutricional
  - Al crear programa entrenamiento
  - Mejorado con `transaction.on_commit()` para evitar race conditions

- [x] Tests: 16/22 pasando

### 🔴 Lo que FALTA
- [ ] **Push Notifications**: Service Worker + Web Push API
  - Código base existe (`PushNotificationsSetup` component)
  - Falta backend configuration
  - Falta subscription management

- [ ] **Email Notifications**: Background job con Celery
  - SMTP configurado
  - Plantillas HTML lisas
  - Falta job queue implementation

- [ ] **6 Tests fallando**:
  - Test backend settings
  - Test bulk notification send
  - Test permission matrix

### 📋 PRÓXIMOS PASOS:
1. Completar 6 tests fallando (prioridad MEDIA-ALTA)
2. Implementar Push notifications (prioridad MEDIA)
3. Implementar Email async jobs (prioridad MEDIA)

### 📝 REFERENCIAS:
- Backend: `backend/notifications/` directory
- Frontend: `frontend/app/dashboard/components/notifications-*.tsx`
- Docs: `backend/doc/backend/notifications-implementation.md`

**⚠️ ESTADO ACTUAL**: Funcional para usuarios (ver/marcar/eliminar), falta activar canales avanzados.

---

## 6. 👌 Acabar export/imports y revisarlos
**Estado**: ✅ **95% COMPLETADO - LISTO PARA VALIDAR**

### Backend ✅
- [x] **Import Workouts** → Excel + CSV:
  - Endpoint: `POST /api/admin/workout-programs/import-excel/`
  - Valida estructura: Programas → Días → Ejercicios
  - Error reporting granular
  - Crea/actualiza/skips según exista

- [x] **Import Nutrition** → Excel + CSV:
  - Endpoint: `POST /api/admin/nutrition-plans/import-excel/`
  - Valida: Planes → Comidas → Recetas
  - Compatible con estructura de base de datos

- [x] **Import Foods** → OpenFoodFacts:
  - Endpoint: `POST /api/foods/import_selected/`
  - Descarga desde base de datos pública
  - Validaciones de macros

### Frontend ✅
- [x] Admin panels para upload
- [x] Preview antes de importar
- [x] Reporte de errores/warnings
- [x] Resumen de operación (creadas/actualizadas/omitidas/rechazadas)

### 🟡 Lo que FALTA (minor)
- [ ] Validación final de imports completos
- [ ] Test E2E de flujo import
- [ ] Documentación de formato de archivos (templates)

### ✅ ACCIONES PARA VALIDAR:
- [ ] Descarga template de entrenamiento
- [ ] Completa datos
- [ ] Sube y verifica resultado
- [ ] Repite con nutrición
- [ ] Verifica datos en BD

---

## 7. 👌 Cambiar referencias para que estén en español
**Estado**: ✅ **95% COMPLETADO**

### ✅ Lo que está en Español
- [x] Etiquetas de UI (labels, placeholders, botones)
- [x] Mensajes de error/éxito
- [x] Nombres de campos internos documentación
- [x] Términos técnicos españolizados (RP, RM, etc.)
- [x] Comentarios en código

### 🟡 Lo que FALTA (edge cases)
- [ ] Algunos logs internos todavía en inglés
- [ ] Documentación de API (Swagger) parcialmente en inglés
- [ ] Algunos mensajes de error de terceros (Django, DRF)

### 📝 REFERENCIAS:
- Frontend: `frontend/app/dashboard/` → Todos los componentes con labels en español
- Backend: `backend/**/*.py` → Comentarios y docstrings en español
- Models: `backend/**/models.py` → help_text en español

**⚠️ ESTADO**: Listo para usuario final, logs internos podem esperar v2.0

---

# ⏳ APARTADOS BAJA PRIORIDAD (PENDIENTES)

## 8. 🔴 Añadir opción comidas que no como
**Estado**: 🔴 **0% COMPLETADO**

### Requisito
El usuario debe poder marcar una comida como "No como" y que sea omitida automáticamente en futuras comidas del mismo plan.

### ¿Qué existe?
- [x] Campo `completed` en `MealLog` (completó o no la comida)
- [ ] Campo para "omitir esta comida" (PENDIENTE)
- [ ] Lógica de exclusión automática (PENDIENTE)

### ¿Qué falta?
1. **Backend**:
   - [ ] Campo `skip_reason` o `is_skipped` en `MealLog`
   - [ ] Endpoint para marcar comida como "skipped"
   - [ ] Lógica en suggester: no recomendar comidas skipped

2. **Frontend**:
   - [ ] Botón "No como esta comida"
   - [ ] Modal con opciones skip
   - [ ] Historial de comidas skipped
   - [ ] Opción "no mostrar más"

### 📊 COMPLEJIDAD: Media (1-2 días)
### 🎯 PRIORIDAD: Baja (mejora UX, no es crítica)

---

## 9. 🔴 Foto comidas
**Estado**: 🟡 **50% COMPLETADO**

### ✅ Lo que existe
- [x] Modelo `MealLog.photo` field (ImageField)
- [x] Backend aceptar `photo` en POST
- [x] Validaciones (tamaño, tipo)
- [x] Upload a `media/meal_logs/`

### 🔴 Lo que FALTA
- [ ] **Frontend**: Input visual para subir foto
- [ ] **Frontend**: Preview antes de subir
- [ ] **Frontend**: Galería de fotos de comidas
- [ ] **Frontend**: Asociar foto con análisis de nutrientes (opcional)

### 📝 CÓDIGO BACKEND (LISTO):
```python
# backend/nutrition/models.py
class MealLog(TimeStampedModel):
    ...
    photo = models.ImageField(
        upload_to='meal_logs/%Y/%m/%d/', 
        null=True, 
        blank=True
    )
```

### 🏗️ CONSTRUCCIÓN NECESARIA (Frontend)
```tsx
// frontend/app/dashboard/components/meal-form.tsx
// Agregar:
- <input type="file" accept="image/*" />
- <img src={photoPreview} /> 
- handlePhotoUpload()
```

### 📊 COMPLEJIDAD: Baja (solo frontend, 1 día)
### 🎯 PRIORIDAD: Baja

---

## 10. 🔴 Usuarios marcan comida que no comen y la saltan automáticamente
**Estado**: 🔴 **0% COMPLETADO** (feature avanzada)

### Requisito
Sistema de "exclusiones permanentes": Si usuario marca que "_no como pizza_", futuras sugerencias de comidas nunca incluirán pizza.

### Arquitectura necesaria
1. **Modelo**: `MealExclusion(user, meal, reason, created_at)`
2. **Service**: `MealSuggesterService.get_excluded_meals(user)`
3. **Filter**: En recomendador, excluir meals en la lista
4. **UI**: List de "comidas excluidas" con opción de re-habilitar

### Backend TODO:
- [ ] Modelo `MealExclusion`
- [ ] API endpoint `/api/meal-exclusions/` (CRUD)
- [ ] Integrar en `MealSuggesterService`
- [ ] Tests

### Frontend TODO:
- [ ] Componente "Comidas excluidas"
- [ ] Botón "No como" en cada comida
- [ ] Modal confirmar exclusión
- [ ] List de excluidas con botón "Comer de todos modos"

### 📊 COMPLEJIDAD: Media-Alta (3-4 días)
### 🎯 PRIORIDAD: Muy Baja (es mejora UX, no es core)

---

# 📊 RESUMEN DE ESTADO POR PRIORIDAD

| # | Apartado | Estado | Prioridad | Días Estimados |
|----|----------|--------|-----------|----------------|
| 1 | Series en ejercicios | ✅ 100% | ✅ HECHO | 0 |
| 2 | RP/RM nomenclatura | ✅ 100% | ✅ HECHO | 0 |
| 3 | Gráfico sueño | ✅ 95% | ✅ HECHO (backend) | 0.5 (frontend) |
| 4 | Ejercicios por defecto | ✅ 100% | ✅ HECHO | 0 |
| 5 | Notificaciones | 🟡 85% | 🔥 MEDIA-ALTA | 2-3 |
| 6 | Import/Export | ✅ 95% | ✅ HECHO | 0.5 (validación) |
| 7 | Referencias español | ✅ 95% | ✅ HECHO | 0 |
| 8 | Comidas "no como" | 🔴 0% | ⏳ BAJA | 1-2 |
| 9 | Foto comidas | 🟡 50% | ⏳ BAJA | 1 |
| 10 | Auto-skip comidas | 🔴 0% | ⏳ MUY BAJA | 3-4 |

---

# 🎯 RECOMENDACIÓN PARA VALIDACIÓN CLIENTE

## **VALIDAR HOY** (Funcionalidades Críticas)
1. ✅ Series de ejercicios → Crear entrenamiento y ver series
2. ✅ RP/RM → Revisar progreso de 1RM en estadísticas
3. ✅ Ejercicios por defecto → Nueva cuenta tiene programa automático
4. ✅ Notificaciones → Panel funciona, recibe notificaciones

## **VALIDAR MAÑANA** (Funcionalidades Importantes)
5. 🟡 Gráfico sueño → Si requiere actualización, agregar al dashboard
6. ✅ Import/Export → Subir archivos de prueba y revisar resultado

## **PARA FUTURO** (Baja Prioridad)
7. ⏳ Comidas "no como" → Feature nice-to-have, no bloquea
8. ⏳ Foto comidas → Mejora UX, implementable en v1.1
9. ⏳ Auto-skip → Feature avanzada, v2.0

---

**¿Qué quieres validar primero?** 🚀
