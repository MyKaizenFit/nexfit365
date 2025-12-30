# Diagnóstico Rápido del Error "Cannot access 'O' before initialization"

## Orden de Pasos (5 minutos)

### 1. Verificar BuildId en Network (30 seg)
- Abre DevTools (F12) > Network
- Filtra por "8836"
- Verifica qué chunk se está descargando:
  - ❌ `8836-283b29e2201483ee.js` = Build VIEJO (problemático)
  - ✅ `8836-b5fb840832b79a66.js` = Build NUEVO (corregido)
- Si es el viejo, el deploy no se aplicó correctamente

### 2. Abrir Chunk en Sources (1 min)
- DevTools > Sources > Busca `8836-*.js`
- Busca `O=` (definición de O)
- Busca `[...,O,...]` ANTES de `O=` (el problema)

### 3. Verificar en el Código (1 min)
- Abre `frontend/hooks/use-daily-meals.ts`
- Verifica orden:
  - ✅ Línea 433: `loadSelectionsFromBackend` (se define PRIMERO)
  - ✅ Línea 525: `markMealCompleted` (se define DESPUÉS)
  - ✅ Línea 637: Dependencias incluyen `loadSelectionsFromBackend`

### 4. Desactivar SW y Bypass (30 seg)
```javascript
// En la consola:
navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()))
caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
```
- Cierra y vuelve a abrir el navegador
- Recarga con Ctrl+Shift+R (hard refresh)

### 5. Si el Problema Persiste (2 min)
- Si O corresponde al hook: verifica que el build se hizo después del fix
- Si O NO corresponde: busca otros `useCallback` con dependencias circulares:
  ```bash
  grep -n "useCallback" hooks/*.ts | grep -A 5 "useCallback"
  ```

## Builds Esperados

**Build Local:**
- Chunk: `8836-fb971e7197f8ca4a.js`
- Estado: ✅ Correcto (no usa O antes de definirse)

**Build Docker (Producción):**
- Chunk: `8836-b5fb840832b79a66.js`
- Estado: ✅ Correcto (no usa O antes de definirse)

**Build Viejo (Problemático):**
- Chunk: `8836-283b29e2201483ee.js`
- Estado: ❌ Error (usa O antes de definirse)
