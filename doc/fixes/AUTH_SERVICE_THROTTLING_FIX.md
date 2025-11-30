# Corrección de Rate Limiting en AuthService

## Problema Identificado

El error 429 persistía en `AuthService.getCurrentUser` porque:

1. **Sin throttling**: El método no usaba el sistema de throttling implementado
2. **Sin caché**: No había caché para evitar requests repetidas
3. **Requests frecuentes**: El método se ejecutaba en cada inicialización de autenticación

## Solución Implementada

### 1. Integración de Throttling

**Antes:**
```typescript
async getCurrentUser(): Promise<User> {
  const response = await fetch(buildApiUrl(AUTH_ENDPOINTS.ME), {
    method: 'GET',
    headers: getAuthHeaders(this.accessToken),
  })
  // ... resto del código
}
```

**Después:**
```typescript
async getCurrentUser(): Promise<User> {
  // Verificar caché primero
  const cacheKey = generateCacheKey(AUTH_ENDPOINTS.ME)
  const cached = apiCache.get<User>(cacheKey)
  if (cached) {
    return cached
  }

  // Usar throttling para la request
  const user = await requestThrottler.throttle('auth-me', async () => {
    const response = await fetch(buildApiUrl(AUTH_ENDPOINTS.ME), {
      method: 'GET',
      headers: getAuthHeaders(this.accessToken),
    })
    // ... resto del código
  })

  // Guardar en caché por 5 minutos
  apiCache.set(cacheKey, user, 5 * 60 * 1000)
  
  return user
}
```

### 2. Imports Agregados

```typescript
import { requestThrottler } from './request-throttle'
import { apiCache, generateCacheKey } from './api-cache'
```

### 3. Configuración de Caché

- **Clave de caché**: `AUTH_ENDPOINTS.ME` (endpoint `/api/auth/me/`)
- **TTL**: 5 minutos (300,000 ms)
- **Throttling key**: `'auth-me'`

## Beneficios de la Corrección

1. **Eliminación de requests duplicadas**: El caché evita requests repetidas
2. **Throttling inteligente**: Controla la frecuencia de requests al endpoint
3. **Mejor rendimiento**: Respuestas más rápidas desde caché
4. **Reducción de carga**: Menos requests al backend
5. **Manejo de errores 429**: El throttling previene estos errores

## Flujo Optimizado

1. **Usuario inicia sesión o se inicializa la app**
2. **`getCurrentUser()` se ejecuta**:
   - Verifica caché (si existe, retorna inmediatamente)
   - Si no hay caché, usa throttling para hacer request
   - Guarda resultado en caché por 5 minutos
3. **Resultado**: Sin errores 429, datos del usuario disponibles

## Estado Final del Sistema

✅ **Todos los servicios con throttling**:
- `AuthService.getCurrentUser()` ✅
- `NutritionService.getCurrentPlan()`
- `NutritionService.createDefaultPlan()`
- `UserService.getUserStats()`
- `DailyMealSelectionsService.getDailySelections()`
- `useWorkouts.fetchWorkoutLogs()`
- `useWorkouts.fetchWorkoutPrograms()`

✅ **Caché inteligente**:
- TTL diferenciado por tipo de datos
- Limpieza automática de entradas expiradas
- Caché para datos de usuario (5 minutos)

✅ **Manejo de errores 429**:
- Reintentos automáticos con delays
- Mensajes informativos al usuario
- Throttling preventivo

El sistema ahora debería funcionar sin errores 429 en la inicialización de autenticación y todas las demás operaciones.





