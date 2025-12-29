# 🔧 Fix: Configuraciones No Se Muestran en el Panel

## 🐛 Problema Identificado

Las configuraciones por defecto existen en la base de datos y se están asignando correctamente a los usuarios, pero **no se muestran en el panel de administración**.

## ✅ Correcciones Aplicadas

### 1. **Endpoint Corregido en Frontend**

**Archivo:** `frontend/lib/api.ts`

**Cambio:**
```typescript
// ANTES (incorrecto - endpoint placeholder que devuelve vacío)
DEFAULT_PLAN_CONFIGURATIONS: 'nutrition/default-plan-configurations/',

// AHORA (correcto - endpoint real con ViewSet completo)
DEFAULT_PLAN_CONFIGURATIONS: 'dashboard/default-plan-configurations/',
```

### 2. **Endpoint Legacy Actualizado en Backend**

**Archivo:** `backend/nutrition/views.py`

**Cambio:**
- El endpoint `nutrition/default-plan-configurations/` era un placeholder que siempre devolvía un array vacío
- Ahora devuelve las configuraciones reales desde el modelo `DefaultPlanConfiguration`

### 3. **Logs de Depuración Agregados**

**Archivo:** `frontend/hooks/use-default-plan-configurations.ts`

**Agregado:**
- Logs detallados en `fetchConfigurations()` para rastrear el flujo
- Logs en `extractResults()` para verificar el formato de respuesta
- Logs para identificar problemas de permisos o formato

## 🔍 Verificación

### Estado Actual en Base de Datos:
- ✅ **1 configuración** existe: "Configuración General"
- ✅ **Activa:** True
- ✅ **Prioridad:** 100
- ✅ **Plan Nutricional:** "Plan Bajo en Carbohidratos"
- ✅ **Programa:** "Plan Fuerza Básica"
- ✅ **Serialización:** Funciona correctamente

### Endpoints Disponibles:

1. **Endpoint Principal (ViewSet):**
   - `GET /api/dashboard/default-plan-configurations/`
   - Requiere: `IsAdminUser`
   - Devuelve: Lista paginada con formato `{results: [...], count: ..., next: ..., previous: ...}`

2. **Endpoint Legacy (compatibilidad):**
   - `GET /api/nutrition/default-plan-configurations/`
   - Requiere: `IsAuthenticated`
   - Ahora devuelve las configuraciones reales (antes devolvía vacío)

## 🚀 Próximos Pasos

### 1. Reconstruir Frontend

El build actual está fallando por un error no relacionado en `/dashboard/progress`. Una vez resuelto ese error:

```bash
./scripts/deployment/build-frontend-low-resource.sh
```

### 2. Verificar en el Navegador

Después de reconstruir:

1. Abre la consola del navegador (F12)
2. Ve a `/admin` → "Config. por defecto"
3. Busca los logs que empiezan con `[useDefaultPlanConfigurations]`
4. Deberías ver:
   - `🔵 fetchConfigurations INICIADO`
   - `🔵 Cargando configuraciones desde: https://api.nexfit365.dpdns.org/api/dashboard/default-plan-configurations/`
   - `🔵 Respuesta recibida: 200`
   - `✅ Configuraciones extraídas: 1`

### 3. Si Aún No Se Muestran

Verifica:

1. **Permisos del usuario:**
   ```python
   # El usuario debe ser is_superuser=True o is_staff=True
   user.is_superuser  # Debe ser True
   ```

2. **Token de autenticación:**
   - Verifica que el token sea válido
   - Verifica que el usuario tenga permisos de admin

3. **Formato de respuesta:**
   - El ViewSet devuelve `{results: [...], count: ...}`
   - El frontend usa `extractResults()` que maneja ambos formatos

4. **Errores en consola:**
   - Revisa la consola del navegador
   - Busca errores de red (CORS, 401, 403, etc.)

## 📝 Archivos Modificados

1. `frontend/lib/api.ts` - Endpoint corregido
2. `backend/nutrition/views.py` - Endpoint legacy actualizado
3. `frontend/hooks/use-default-plan-configurations.ts` - Logs agregados

## 🔍 Debug Manual

Si necesitas verificar manualmente:

```bash
# Desde el contenedor backend
docker exec -it reposseparadosparaelhost-backend-1 python manage.py shell

# Verificar configuraciones
from dashboard.models import DefaultPlanConfiguration
configs = DefaultPlanConfiguration.objects.all()
print(f"Total: {configs.count()}")
for c in configs:
    print(f"- {c.name} (Activa: {c.is_active})")

# Probar serialización
from dashboard.serializers import DefaultPlanConfigurationSerializer
serializer = DefaultPlanConfigurationSerializer(configs, many=True)
print(f"Serializados: {len(serializer.data)}")
```

## ✅ Checklist

- [x] Endpoint corregido en frontend
- [x] Endpoint legacy actualizado en backend
- [x] Logs de depuración agregados
- [x] Verificación de base de datos (configuración existe)
- [x] Verificación de serialización (funciona correctamente)
- [ ] Frontend reconstruido (pendiente - error en build)
- [ ] Verificado en navegador (pendiente)

## 🎯 Resultado Esperado

Después de reconstruir el frontend, deberías ver:

- **Activas (1):** "Configuración General"
- **Inactivas (0):** Vacío

Y poder:
- ✅ Ver los detalles de la configuración
- ✅ Editar la configuración
- ✅ Crear nuevas configuraciones
- ✅ Eliminar configuraciones


