# Solución para Rate Limiting (429 Too Many Requests)

## Problema Identificado

El frontend estaba experimentando múltiples errores `429 (Too Many Requests)` debido a:

1. **Backend Django**: Límite de `120/min` para usuarios autenticados (2 requests por segundo)
2. **Nginx**: Límite de `10r/s` con burst de 20 (10 requests por segundo con ráfagas de hasta 20)
3. **Frontend**: Múltiples requests simultáneos al cargar el dashboard sin control de throttling

## Solución Implementada

### 1. Sistema de Throttling (`frontend/lib/request-throttle.ts`)

- **Clase `RequestThrottler`**: Controla la frecuencia de requests por clave
- **Configuración**: 90 requests por minuto (por debajo del límite del backend)
- **Colas por prioridad**: `high`, `normal`, `low`
- **Reintentos automáticos**: Para errores 429 con delay configurable
- **Limpieza automática**: Elimina colas inactivas cada 5 minutos

### 2. Sistema de Caché (`frontend/lib/api-cache.ts`)

- **Clase `ApiCache`**: Almacena respuestas de API con TTL
- **Configuración**: 2 minutos TTL por defecto, máximo 50 entradas
- **Limpieza automática**: Elimina entradas expiradas cada 5 minutos
- **Claves inteligentes**: Basadas en URL y parámetros

### 3. Hook de API Throttled (`frontend/hooks/use-throttled-api.ts`)

- **`useThrottledApi`**: Hook principal para requests con throttling y caché
- **`useCachedGet`**: Hook especializado para requests GET
- **Reintentos automáticos**: Hasta 2 reintentos con delay exponencial
- **Manejo de errores**: Especial para rate limiting

### 4. Optimización de Auto-Refresh

- **Intervalo aumentado**: De 30 segundos a 5 minutos
- **Throttling en dashboard**: Usa el sistema de throttling para refreshes
- **Dependencias optimizadas**: Solo refresca cuando cambia el usuario

### 5. Mejoras en Hooks Existentes

#### `use-workouts.ts`
- Implementa caché para `fetchWorkoutLogs` y `fetchWorkoutPrograms`
- Usa throttling para todas las requests
- TTL diferenciado: 2 minutos para logs, 5 minutos para programas

#### `dashboard-enhanced.tsx`
- Auto-refresh cada 5 minutos
- Throttling en función `handleRefreshAll`
- Mejor manejo de errores

### 6. Manejo Mejorado de Errores (`frontend/lib/api.ts`)

- **Detección de 429**: Manejo especial para rate limiting
- **Mensajes informativos**: Incluye tiempo de espera cuando está disponible
- **Logging mejorado**: Registra rate limits para debugging

### 7. Componente de Notificación (`frontend/components/ui/rate-limit-notification.tsx`)

- **`RateLimitNotification`**: Muestra notificaciones de rate limiting
- **`useRateLimitNotification`**: Hook para manejar notificaciones
- **Contador regresivo**: Muestra tiempo restante hasta próximo intento
- **Botón de reintento**: Permite reintentar cuando el tiempo expira

## Configuración de Rate Limiting

### Backend (Django)
```python
"DEFAULT_THROTTLE_RATES": {
    "anon": "60/min",
    "user": "120/min",  # 2 requests por segundo
    "login": "5/min",
    "register": "3/min",
    "forgot_password": "3/min",
}
```

### Nginx
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
location /api/ {
    limit_req zone=api burst=20 nodelay;
}
```

### Frontend (Nuevo)
```typescript
// Throttling: 90 requests por minuto
maxRequests: 90,
timeWindow: 60000, // 1 minuto

// Caché: 2 minutos TTL por defecto
defaultTTL: 2 * 60 * 1000,
maxSize: 50

// Auto-refresh: cada 5 minutos
interval: 300000
```

## Beneficios de la Solución

1. **Eliminación de errores 429**: El throttling previene exceder los límites
2. **Mejor rendimiento**: El caché reduce requests duplicadas
3. **Experiencia de usuario mejorada**: Notificaciones informativas
4. **Escalabilidad**: Sistema configurable y extensible
5. **Debugging mejorado**: Logging detallado de rate limits

## Uso

### Para requests individuales:
```typescript
const { execute } = useThrottledApi()
const data = await execute('/api/endpoint', { method: 'GET' })
```

### Para requests GET con caché:
```typescript
const { data, fetchData } = useCachedGet('/api/endpoint')
```

### Para notificaciones de rate limiting:
```typescript
const { showNotification, RateLimitAlert } = useRateLimitNotification()
```

## Monitoreo

- **Logs de throttling**: Se registran en consola
- **Estadísticas de caché**: Disponibles via `apiCache.getStats()`
- **Notificaciones**: Se muestran automáticamente en caso de rate limiting

Esta solución garantiza que el frontend respete los límites del backend mientras mantiene una experiencia de usuario fluida y eficiente.
