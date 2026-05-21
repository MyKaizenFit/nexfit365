# Análisis de Rollback - Cambios que se Perderían

## 📊 Resumen

**Commit Actual:** `d934822` (2025-12-30) - WIP con error  
**Commit Propuesto para Rollback:** `3c1304f` (2025-12-29) - Optimizaciones de build y configuración SSL

**⚠️ IMPORTANTE:** El commit `3c1304f` también tiene el mismo error de orden en `use-daily-meals.ts`:
- `markMealCompleted` está en línea 416
- `loadSelectionsFromBackend` está en línea 531
- ❌ ORDEN INCORRECTO (markMealCompleted usa loadSelectionsFromBackend antes de que esté definida)

## 🔍 Cambios que se Perderían (559 archivos modificados)

### Frontend - Archivos Principales Modificados

#### 1. **hooks/use-daily-meals.ts** ⚠️ CRÍTICO
- ✅ **Corrección del orden de funciones** (loadSelectionsFromBackend antes de markMealCompleted)
- ✅ **Validación de datos corruptos en localStorage**
- ✅ **Mejoras en manejo de errores**

#### 2. **app/sw.js/route.ts** ⚠️ IMPORTANTE
- ✅ Service Worker actualizado (versión 1.5.0)
- ✅ **Desactivado cacheo de archivos JS** (bypass completo para .js)
- ✅ Headers Cache-Control agregados
- ✅ Mejor limpieza de caches antiguos

#### 3. **app/register-sw.tsx**
- ✅ Actualización de Service Worker cada 1 minuto (antes 5 minutos)

#### 4. **next.config.mjs**
- ✅ `generateBuildId` mejorado (timestamp + random)
- ✅ `distDir` configurado para usar `NEXT_DIST_DIR`

#### 5. **Dockerfile**
- ✅ Build usando `NEXT_DIST_DIR=.next-temp` y luego mover a `.next`
- ✅ Solución a problemas de permisos en builds

#### 6. **Scripts y Utilidades Nuevos**
- ✅ `copy-build.sh` - Script para copiar builds
- ✅ `public/clear-sw.js` - Script para limpiar Service Worker
- ✅ `public/clear-user-data.js` - Script para limpiar datos de usuario
- ✅ `public/diagnose-sw.js` - Script de diagnóstico
- ✅ `VERIFICAR_BUILD.md` - Documentación
- ✅ `RESUMEN_DEPLOY.md` - Documentación

### Backend - Archivos Modificados

#### 1. **accounts/admin_views.py**
- Cambios en vistas de administración de cuentas

#### 2. **api/admin_dashboard_views.py**
- Cambios en vistas del dashboard de administración

#### 3. **progress/admin_views.py**
- Cambios en vistas de progreso

#### 4. **workouts/admin_views.py**
- Cambios en vistas de entrenamientos

### Otros Archivos de Configuración

#### 1. **docker-compose.prod.yml**
- Posibles cambios en configuración de servicios

## 📋 Lista Detallada de Cambios en Frontend

### Archivos TypeScript/TSX Modificados (37 archivos)

**Hooks:**
- `hooks/use-daily-meals.ts` ⚠️ CRÍTICO - Corrección de orden de funciones
- `hooks/use-admin-nutrition.ts`
- `hooks/use-admin-user-detail.ts`
- `hooks/use-admin-user-profile-history.ts`
- `hooks/use-admin-user-progress.ts`
- `hooks/use-admin-user-wellness.ts`
- `hooks/use-admin-user-workouts.ts`
- `hooks/use-admin-workout-plans-optimized.ts`
- `hooks/use-default-plan-configurations.ts`
- `hooks/use-progress-photos.ts`

**Componentes Admin:**
- `app/admin/components/default-plan-configurations.tsx`
- `app/admin/components/default-plan-configurations-v2.tsx`
- `app/admin/components/exercise-management.tsx`
- `app/admin/components/nutrition-management.tsx`
- `app/admin/components/nutrition-plan-editor.tsx`
- `app/admin/components/nutrition-plan-history.tsx`
- `app/admin/components/nutrition-plan-management.tsx`
- `app/admin/components/progress-photos-carousel.tsx`
- `app/admin/components/user-profile-history.tsx`
- `app/admin/components/user-progress-panel.tsx` (NUEVO)
- `app/admin/components/user-weight-history.tsx`
- `app/admin/components/user-wellness-panel.tsx`
- `app/admin/components/user-workout-summary.tsx`
- `app/admin/components/workout-plan-management.tsx`
- `app/admin/components/workout-program-editor.tsx`
- `app/admin/page.tsx`
- `app/admin/user/[id]/page.tsx`
- `app/admin/user-v2/[id]/page.tsx` (NUEVO)

**Dashboard:**
- `app/dashboard/components/auth-debug.tsx`
- `app/dashboard/components/meal-plan-enhanced.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/progress/page.tsx`

**Service Worker:**
- `app/sw.js/route.ts` ⚠️ IMPORTANTE - Desactivado cacheo de JS
- `app/register-sw.tsx` - Actualización cada 1 minuto

**Librerías:**
- `lib/api.ts`
- `lib/auth-service.ts`
- `lib/clear-user-cache.ts`
- `lib/help-service.ts`
- `lib/user-service.ts`

**Configuración:**
- `next.config.mjs` - generateBuildId mejorado
- `Dockerfile` - Build con NEXT_DIST_DIR
- `tsconfig.json`

**Otros:**
- `components/admin/admin-dashboard.tsx`
- `contexts/auth-context.tsx`

**Scripts Nuevos:**
- `copy-build.sh` (NUEVO)
- `public/clear-sw.js` (NUEVO)
- `public/clear-user-data.js` (NUEVO)
- `public/diagnose-sw.js` (NUEVO)
- `VERIFICAR_BUILD.md` (NUEVO)
- `RESUMEN_DEPLOY.md` (NUEVO)

## ⚠️ PROBLEMA IDENTIFICADO

**El commit `3c1304f` también tiene el error de orden**, por lo que hacer rollback a ese commit **NO resolverá el problema**.

El error probablemente existe desde antes. La solución correcta es:
1. Mantener el código actual (que tiene el orden correcto)
2. Forzar un rebuild completo sin caché
3. Asegurar que el servidor sirva el nuevo build

## 🔧 Recomendación

**NO hacer rollback al commit 3c1304f** porque:
1. Tiene el mismo error de orden
2. Se perderían todas las mejoras y correcciones del commit actual
3. El problema real es que el servidor está sirviendo un chunk viejo desde caché (Cloudflare/Docker)

**Solución correcta:**
1. Mantener el código actual (orden correcto ✅)
2. Reconstruir Docker sin caché
3. Reiniciar servicios
4. Si persiste: purgar caché de Cloudflare o verificar configuración de proxy


## 🔍 Cambios Específicos en Archivos Críticos

### hooks/use-daily-meals.ts

**Cambios principales:**
1. ✅ **Reordenamiento de funciones:** `loadSelectionsFromBackend` movida ANTES de `markMealCompleted`
2. ✅ **Validación de datos corruptos en localStorage:**
   - Verificación de que `selections` sea un objeto válido
   - Limpieza automática de datos corruptos
   - Mejor manejo de errores con try-catch
3. ✅ **Mejoras en `loadSelectionsFromBackend`:**
   - Mejor manejo de `recipe_name`, `recipe.name`, y `custom_description`
   - Validación de valores nutricionales (convierte a Number)
   - Mejor mapeo de tipos de comida

### app/sw.js/route.ts

**Cambios principales:**
1. ✅ **Versión actualizada:** v1.5.0 (antes v1.3 o anterior)
2. ✅ **Bypass completo para archivos JS:**
   - Todos los archivos `.js` ahora bypass Service Worker
   - `return` inmediato para requests de JS
3. ✅ **Headers Cache-Control agregados:**
   - `Cache-Control: public, max-age=0, must-revalidate`
4. ✅ **Limpieza mejorada de caches antiguos**

### app/register-sw.tsx

**Cambios:**
- ✅ Frecuencia de actualización: 1 minuto (antes 5 minutos)

### next.config.mjs

**Cambios:**
- ✅ `generateBuildId` mejorado: timestamp + random string
- ✅ `distDir` configurado para usar `NEXT_DIST_DIR`

### Dockerfile

**Cambios:**
- ✅ Build usando `NEXT_DIST_DIR=.next-temp`
- ✅ Movimiento de `.next-temp` a `.next` después del build
- ✅ Solución a problemas de permisos
