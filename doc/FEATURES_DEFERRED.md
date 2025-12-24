# 📋 Funcionalidades Diferidas para Versiones Posteriores

Este documento lista todas las funcionalidades que han sido implementadas pero están **ocultas/deshabilitadas** para la versión actual, y que se activarán en futuras versiones.

## 🎯 Propósito

Mantener un registro claro de:
- Funcionalidades completas pero no activas
- Razones para diferirlas
- Plan de activación futura
- Dependencias y requisitos

---

## 📦 Funcionalidades Ocultas

### 1. Sistema de Consejos y Recomendaciones

**Estado:** ✅ Implementado | ❌ Oculto

**Ubicación:**
- `frontend/app/dashboard/page.tsx` (líneas comentadas)
- `frontend/app/dashboard/components/mobile-navigation.tsx` (líneas comentadas)
- `frontend/app/recommendations/page.tsx` (página dedicada - existe pero no accesible)
- `frontend/components/tips/`
- `frontend/components/recommendations/`
- `frontend/components/dashboard/tips-showcase.tsx`
- `frontend/middleware.ts` (ruta `/recommendations` protegida)

**Componentes afectados:**
- `TipsBoard` - Tablero completo de consejos
- `TipsShowcase` - Muestra consejos destacados en dashboard
- `RecommendationsSection` - Sección de recomendaciones personalizadas
- `PersonalizedRecommendations` - Recomendaciones basadas en perfil del usuario

**Qué se ocultó:**
- Sección "Consejos" del menú lateral (desktop)
- Sección "Recomendaciones" del menú lateral (desktop)
- Sección "Inspiración" (recomendaciones) en navegación móvil
- Sección "Consejos" en navegación móvil
- Componente `TipsShowcase` en el dashboard principal
- Componente `RecommendationsSection` en el dashboard principal
- Rutas `/dashboard?section=tips` y `/dashboard?section=recommendations`
- Página dedicada `/recommendations` (existe pero no accesible desde menú)

**Backend:**
- ✅ API de consejos (`/api/tips/`) - Funcional
- ✅ API de recomendaciones (`/api/recommendations/`) - Funcional
- ✅ Modelos de BD (`dashboard.WellnessTip`) - Implementados
- ✅ Endpoints admin - Disponibles

**Razón para diferir:**
- Priorizar funcionalidades core (entrenamientos, nutrición, progreso)
- Necesita más contenido y curaduría antes de lanzar
- Mejorar algoritmo de recomendaciones personalizadas

**Plan de activación:**
- **Versión objetivo:** v2.0.0
- **Requisitos previos:**
  - Base de datos de consejos poblada (mínimo 50 consejos)
  - Sistema de categorización mejorado
  - Algoritmo de recomendaciones personalizadas refinado
  - UI/UX de consejos pulida

**Cómo activar:**
1. Descomentar líneas en `frontend/app/dashboard/page.tsx`:
   - Líneas 77-78: Items del menú
   - Líneas 174-177: Componentes en dashboard
   - Líneas 207-235: Cases del switch

2. Verificar que los endpoints del backend funcionen correctamente

3. Probar flujo completo de consejos y recomendaciones

---

### 2. Sistema de Notificaciones (Configuración de Usuario)

**Estado:** ✅ Implementado | ❌ Oculto

**Ubicación:**
- `frontend/app/dashboard/components/settings-page.tsx` (pestaña comentada)
- `frontend/app/dashboard/components/notifications-panel.tsx` (componente existe)

**Componentes afectados:**
- `NotificationsPanel` - Panel de configuración de notificaciones del usuario
- Pestaña "Notificaciones" en la página de configuración

**Qué se ocultó:**
- Pestaña "Notificaciones" en la página de configuración (`/dashboard?section=settings`)
- El componente `NotificationsPanel` sigue existiendo pero no es accesible

**Backend:**
- ✅ Campo `notification_preferences` en modelo de usuario - Funcional
- ✅ API para actualizar preferencias - Funcional

**Razón para diferir:**
- El sistema de notificaciones push/email no está completamente implementado
- Priorizar funcionalidades core (entrenamientos, nutrición, progreso)
- Requiere integración con servicios de notificaciones externos

**Plan de activación:**
- **Versión objetivo:** v2.0.0
- **Requisitos previos:**
  - Integración con servicio de notificaciones push (Firebase, OneSignal, etc.)
  - Integración con servicio de email transaccional (SendGrid, Mailgun, etc.)
  - Backend para gestionar envío de notificaciones
  - Sistema de colas para envío masivo

**Cómo activar:**
1. Descomentar líneas en `frontend/app/dashboard/components/settings-page.tsx`:
   - TabsTrigger de "notifications"
   - TabsContent de "notifications"

2. Implementar servicios de notificaciones en el backend

3. Probar flujo completo de notificaciones

---

## 🔧 Instrucciones para Activar Funcionalidades

### Para Consejos y Recomendaciones:

1. **Editar `frontend/app/dashboard/page.tsx`:**

```typescript
// Descomentar estas líneas (alrededor de línea 77-78):
{ title: "Recomendaciones", icon: Sparkles, url: "recommendations" },
{ title: "Consejos", icon: Heart, url: "tips" },

// Descomentar estas líneas (alrededor de línea 174-177):
<Suspense fallback={null}>
  <RecommendationsSection />
</Suspense>
<Suspense fallback={null}>
  <TipsShowcase />
</Suspense>

// Descomentar estos cases (alrededor de línea 207-235):
case "recommendations":
  // ... código del case
case "tips":
  // ... código del case
```

2. **Verificar dependencias:**
   - Backend debe tener endpoints `/api/tips/` y `/api/recommendations/` funcionando
   - Base de datos debe tener consejos y recomendaciones

3. **Probar funcionalidad:**
   - Navegar a secciones de consejos y recomendaciones
   - Verificar que se carguen correctamente
   - Probar creación/edición de consejos (si aplica)

---

## 📝 Notas de Mantenimiento

### Al agregar nuevas funcionalidades diferidas:

1. **Agregar entrada en este documento** con:
   - Estado (Implementado/Oculto)
   - Ubicación de código
   - Componentes afectados
   - Razón para diferir
   - Plan de activación

2. **Marcar código con comentarios:**
   ```typescript
   // TODO: Activar en versiones posteriores
   // Código comentado aquí
   ```

3. **Actualizar este documento** con instrucciones de activación

### Al activar funcionalidades:

1. **Descomentar código** según instrucciones
2. **Probar funcionalidad** completamente
3. **Actualizar este documento** marcando como activado
4. **Actualizar CHANGELOG.md** con la nueva funcionalidad

---

## 🗂️ Estructura del Documento

Este documento se organiza por:
- **Funcionalidad:** Nombre de la funcionalidad
- **Estado:** Implementado/Oculto/En desarrollo
- **Ubicación:** Archivos y líneas de código
- **Razón:** Por qué se difirió
- **Plan:** Cuándo y cómo activarla

---

## 🔄 Reestructuraciones Realizadas

### 1. Reestructuración del Panel de Menús (2025-12-18)

**Cambio:** Reorganización del layout de la sección de menús/nutrición

**Componente eliminado:**
- Header con saludo "¡Buen día! 🌅"
- Resumen de macros en 4 tarjetas (kcal, proteína, carbos, grasas)
- Barra de progreso de comidas completadas
- Botón "Backend" de debug

**Componente movido:**
- "Progreso Detallado del Día" movido a la parte superior del panel

**Nueva estructura:**
1. **Progreso Detallado del Día** (arriba) - Con icono Target y seguimiento completo de macros
2. **Plan de Comidas del Día** - Lista de comidas con opciones
3. **Card del Plan Nutricional** - Información del plan activo
4. ~~**Historial de cambios**~~ - Eliminado (solo disponible para administradores en `/admin`)

**Ubicación del cambio:**
- `frontend/components/dashboard/meal-dashboard.tsx`

**Razón:**
- Simplificar la interfaz
- Priorizar información detallada sobre resumen rápido
- Mejorar la experiencia de usuario enfocándose en el seguimiento detallado

---

## 🔒 Funcionalidades Restringidas a Administradores

### 1. Historial de Cambios de Plan Nutricional

**Estado:** ✅ Eliminado del dashboard de usuarios | ✅ Disponible solo para administradores

**Ubicación:**
- **Eliminado de:** `frontend/components/dashboard/meal-dashboard.tsx`
- **Disponible en:** `frontend/app/admin/components/nutrition-plan-history.tsx`
- **Panel admin:** `/admin` → Pestaña "Historial"

**Qué se eliminó:**
- Componente `NutritionPlanHistoryUser` del dashboard de usuarios normales
- Visualización del historial de cambios de plan para usuarios

**Disponible para administradores:**
- Historial completo de todos los usuarios
- Filtros avanzados (usuario, fecha, razón, tipo de cambio)
- Exportación de datos en CSV
- Información detallada de macros históricos

**Razón:**
- Simplificar la interfaz para usuarios normales
- Los administradores necesitan acceso completo para gestión y análisis
- Reducir la carga de información innecesaria para usuarios finales

---

## 📅 Historial de Cambios

### 2025-08-28
- ✅ Sistema de Notificaciones (Configuración) documentado como oculto
- ✅ Pestaña de notificaciones ocultada en settings-page.tsx

### 2025-12-18
- ✅ Documento creado
- ✅ Sistema de Consejos y Recomendaciones documentado como oculto
- ✅ Reestructuración del panel de menús realizada
- ✅ Historial de cambios de plan restringido a administradores
- ✅ Instrucciones de activación agregadas

---

## 🔗 Referencias

- **Backend API:** `backend/dashboard/` - Modelos y endpoints de consejos
- **Frontend Components:** `frontend/components/tips/` y `frontend/components/recommendations/`
- **Hooks:** `frontend/hooks/use-wellness-tips.ts` y `frontend/hooks/use-personalized-recommendations.ts`

---

## ⚠️ Importante

**NO ELIMINAR** código de funcionalidades diferidas. Solo comentar/ocultar.

**MANTENER** este documento actualizado cuando:
- Se agreguen nuevas funcionalidades diferidas
- Se activen funcionalidades existentes
- Cambien los planes de activación

