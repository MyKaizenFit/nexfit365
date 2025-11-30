# 📝 Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Dashboard mejorado con componentes de entrenamientos
- Sistema de auto-refresh para datos en tiempo real
- Componentes de progreso integrados
- Manejo robusto de errores en frontend
- Estados de "sin datos" con mensajes motivacionales

### Changed
- Mejorada la experiencia de usuario en el dashboard
- Optimizada la integración entre componentes de progreso, entrenamientos y nutrición

### Fixed
- **CRÍTICO**: Error 500 en `/api/progress-stats/dashboard/` por campo `duration` incorrecto
- **CRÍTICO**: TypeError en `WorkoutSummaryEnhanced` por datos nulos
- **CRÍTICO**: Error 404 en endpoint `/api/workout-days/` inexistente
- Error de parsing JSON cuando el backend devuelve HTML
- Manejo de datos paginados del backend Django REST Framework
- Validación de arrays en componentes React

## [0.1.0] - 2024-01-XX

### Added
- Sistema de autenticación JWT completo
- API REST para nutrición y comidas
- Dashboard de comidas funcional
- Seguimiento de macros en tiempo real
- Interfaz moderna con Next.js 14 y Tailwind CSS
- Sistema de roles y permisos
- Persistencia de datos local y remota

### Technical Details
- Frontend: Next.js 14, TypeScript, Tailwind CSS, Shadcn/ui
- Backend: Django 4.2, Django REST Framework, JWT
- Base de datos: SQLite (desarrollo), PostgreSQL (producción)

---

## 🔧 Detalles Técnicos de las Correcciones

### Error 500 en Progress Stats
**Problema**: El endpoint `/api/progress-stats/dashboard/` fallaba con error 500
**Causa**: Referencia incorrecta al campo `duration` en lugar de `duration_minutes`
**Solución**: Corregido en `backend/progress/views.py` línea 259
```python
# Antes (incorrecto)
total_workout_time = workout_logs.filter(
    date__gte=month_start
).aggregate(total_time=Sum('duration'))['total_time'] or 0

# Después (correcto)
total_workout_time = workout_logs.filter(
    date__gte=month_start
).aggregate(total_time=Sum('duration_minutes'))['total_time'] or 0
```

### Error TypeError en WorkoutSummaryEnhanced
**Problema**: `workoutLogs.filter is not a function`
**Causa**: Los datos del backend no siempre son arrays
**Solución**: Validación robusta de tipos
```typescript
// Antes (frágil)
const recentWorkouts = workoutLogs.filter(...)

// Después (robusto)
const recentWorkouts = Array.isArray(workoutLogs) ? workoutLogs.filter(...) : []
```

### Error 404 en workout-days
**Problema**: Endpoint `/api/workout-days/` no existe
**Causa**: El frontend intentaba acceder a un endpoint inexistente
**Solución**: Implementación alternativa usando programas de entrenamiento existentes

### Manejo de Datos Paginados
**Problema**: Django REST Framework devuelve datos en formato paginado
**Solución**: Parser robusto que maneja múltiples formatos
```typescript
// Maneja: [], {results: []}, {data: []}
let logs: WorkoutLog[] = []
if (result.data) {
  if (Array.isArray(result.data)) {
    logs = result.data
  } else if (result.data.results && Array.isArray(result.data.results)) {
    logs = result.data.results
  } else if (result.data.data && Array.isArray(result.data.data)) {
    logs = result.data.data
  }
}
```
