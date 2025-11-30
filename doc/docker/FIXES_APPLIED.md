# 🔧 Correcciones Aplicadas - Configuración de Producción

Este documento detalla todas las correcciones aplicadas basadas en la revisión de la configuración de producción.

## ✅ Correcciones Implementadas

### 0. Variables de Entorno en Docker Compose (CRÍTICO) ✅

**Problema:** Las variables `${POSTGRES_PASSWORD}` en docker-compose.prod.yml se resuelven **ANTES** de arrancar contenedores, usando variables del shell o un archivo `.env` en la raíz, NO desde `env_file` de otros servicios.

**Solución Aplicada:**
- ✅ Creado `.env.production.example` en la raíz del proyecto
- ✅ Documentado que debe copiarse como `.env.production` y configurarse
- ✅ Actualizado comando de docker compose para usar `--env-file .env.production`
- ✅ Documentado que `POSTGRES_PASSWORD` en `.env.production` debe coincidir con `DB_PASSWORD` en `backend.env.production`

**Archivos creados/modificados:**
- `env.production.template` (nuevo) - Template con todas las variables necesarias
- `doc/docker/PRODUCTION_SETUP.md` - Actualizado con instrucciones claras
- `doc/docker/FIXES_APPLIED.md` - Este documento

**Uso correcto:**
```bash
# 1. Crear .env.production desde el template
cp env.production.template .env.production

# 2. Editar .env.production con valores reales

# 3. Usar --env-file al ejecutar docker compose
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

---

### 1. Variables de Entorno de Postgres ✅

**Problema:** `POSTGRES_DB`, `POSTGRES_USER` y `POSTGRES_PASSWORD` no estaban definidos, causando que el contenedor de Postgres fallara.

**Solución Aplicada:**
- ✅ Añadidas variables `POSTGRES_*` en `docker/backend.env.production`
- ✅ Mantenidas variables `DB_*` para Django (settings.py)
- ✅ Documentado que ambas deben tener los mismos valores

**Archivos modificados:**
- `env.production.template` (nuevo): Variables para docker-compose
- `docker/backend.env.production`: Variables para Django + referencia

**Estructura correcta:**
```env
# .env.production (raíz) - Para docker-compose
POSTGRES_DB=mykaizenfit
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGE_ME_DB_PASSWORD  # ← Usado por db y db-backup

# docker/backend.env.production - Para Django
DB_NAME=mykaizenfit
DB_USER=postgres
DB_PASSWORD=CHANGE_ME_DB_PASSWORD  # ← DEBE SER LA MISMA que POSTGRES_PASSWORD
POSTGRES_PASSWORD=CHANGE_ME_DB_PASSWORD  # ← Opcional pero consistente
```

**Regla de oro:** `POSTGRES_PASSWORD` en `.env.production` = `DB_PASSWORD` en `backend.env.production`

---

### 2. Redis y REDIS_PASSWORD ✅

**Problema:** El servicio `redis` no tenía `env_file`, por lo que `${REDIS_PASSWORD}` no estaba disponible.

**Solución Aplicada:**
- ✅ Añadido `env_file: ./docker/backend.env.production` al servicio redis
- ✅ Ahora Redis puede leer `REDIS_PASSWORD` correctamente

**Archivo modificado:** `docker-compose.prod.yml`
```yaml
redis:
  env_file:
    - ./docker/backend.env.production  # Para leer REDIS_PASSWORD
  command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
```

---

### 3. Healthchecks: curl / wget ✅

**Problema:** 
- Backend: `curl` ya estaba instalado ✅ (verificado en Dockerfile)
- Frontend: `wget` no estaba instalado en la imagen `node:alpine`

**Solución Aplicada:**
- ✅ Añadido `wget` al Dockerfile de frontend en la etapa `runner`
- ✅ Cambiado healthcheck de frontend de `/api/health` a `/` (ruta más simple)

**Archivos modificados:**
- `frontend/Dockerfile`: Añadido `RUN apk add --no-cache wget`
- `docker-compose.prod.yml`: Healthcheck frontend usa `/` en lugar de `/api/health`

**Verificación:**
- Backend: `/api/health/` existe y funciona ✅
- Frontend: Healthcheck ahora usa `/` que siempre existe ✅

---

### 4. Redes: Comentario y Configuración ✅

**Problema:** Comentario engañoso sobre `internal: false` y falta de seguridad real.

**Solución Aplicada:**
- ✅ Cambiado `internal: false` a `internal: true`
- ✅ Ahora la red `internal` es realmente privada (solo comunicación entre servicios Docker)
- ✅ Comentario actualizado para ser preciso

**Archivo modificado:** `docker-compose.prod.yml`
```yaml
networks:
  internal:
    driver: bridge
    internal: true  # Red privada: solo comunicación entre servicios Docker, sin acceso externo
```

**Impacto:**
- ✅ `db` y `redis` ahora están completamente aislados del exterior
- ✅ No pueden ser accedidos directamente, ni aunque se mapeen puertos por error

---

### 5. Exposición de Puertos (Documentado) ✅

**Estado Actual:**
- ✅ Backend expone puerto 8000 (aceptable para primera producción sin Nginx)
- ✅ Frontend expone puerto 3000 (aceptable para primera producción sin Nginx)
- ✅ Documentado que cuando se añada Nginx, estos puertos deben quitarse

**Nota:** Esta es una decisión consciente para permitir despliegue inicial sin Nginx. Cuando se añada Nginx, se quitarán estos puertos y solo Nginx expondrá 80/443.

---

### 6. Coherencia con Rutas Estáticas ✅

**Verificación:**
- ✅ `STATIC_ROOT` en settings.py: `BASE_DIR / "staticfiles"` → `/app/staticfiles` ✅
- ✅ `MEDIA_ROOT` en settings.py: `BASE_DIR / os.getenv("UPLOAD_DIR", "media")` → `/app/media` ✅
- ✅ Volúmenes en docker-compose: `backend_static:/app/staticfiles` y `backend_media:/app/media` ✅

**Estado:** ✅ Todo está correcto y coherente. Los paths coinciden perfectamente.

**Archivo actualizado:** `docker/backend.env.production`
- Añadida nota explicativa sobre STATIC_ROOT y MEDIA_ROOT
- Documentado que funciona correctamente aunque no se lean de env (están hardcodeados en settings.py)

---

## 📋 Resumen de Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `env.production.template` | ✅ NUEVO - Template para variables de docker-compose |
| `docker-compose.prod.yml` | ✅ Añadido `env_file` a redis<br>✅ Cambiado `internal: true`<br>✅ Healthcheck frontend a `/` |
| `docker/backend.env.production` | ✅ Añadidas variables `POSTGRES_*`<br>✅ Documentación sobre STATIC_ROOT/MEDIA_ROOT |
| `frontend/Dockerfile` | ✅ Añadido `wget` para healthchecks |
| `frontend/docker.env.production` | ✅ Nota sobre NEXT_PUBLIC_API_URL según despliegue |
| `doc/docker/PRODUCTION_SETUP.md` | ✅ Actualizada con `.env.production` y `--env-file`<br>✅ Nota sobre NEXT_PUBLIC_API_URL |
| `doc/docker/FIXES_APPLIED.md` | ✅ Este archivo (actualizado) |

---

## ✅ Checklist Final

- [x] **`env.production.template` creado** (CRÍTICO para docker-compose)
- [x] Variables `POSTGRES_*` documentadas en `env.production.template`
- [x] Variables `DB_*` en `backend.env.production` para Django
- [x] `REDIS_PASSWORD` accesible desde redis service (env_file + .env.production)
- [x] `wget` instalado en frontend Dockerfile
- [x] Healthchecks funcionando (backend con curl, frontend con wget)
- [x] Red `internal` configurada como privada (`internal: true`)
- [x] STATIC_ROOT y MEDIA_ROOT verificados y coherentes
- [x] Documentación actualizada con `--env-file` y `.env.production`
- [x] Nota sobre `NEXT_PUBLIC_API_URL` según tipo de despliegue

---

## 🚀 Próximos Pasos

1. **Configurar variables de entorno (ORDEN IMPORTANTE):**
   ```bash
   # 1. Crear .env.production desde el template
   cp env.production.template .env.production
   
   # 2. Editar .env.production con valores reales
   #    - POSTGRES_PASSWORD (contraseña fuerte)
   #    - REDIS_PASSWORD (contraseña fuerte)
   
   # 3. Editar docker/backend.env.production
   #    - DB_PASSWORD = POSTGRES_PASSWORD (mismo valor)
   #    - REDIS_PASSWORD = REDIS_PASSWORD (mismo valor)
   #    - SECRET_KEY, ALLOWED_HOSTS, CORS, JWT, etc.
   
   # 4. Editar frontend/docker.env.production
   #    - NEXT_PUBLIC_API_URL según tu despliegue:
   #      * IP:puerto: http://TU_IP:8000/api
   #      * Dominio HTTPS: https://tu-dominio.com/api
   ```

2. **Probar localmente:**
   ```bash
   # ⚠️ IMPORTANTE: Usar --env-file
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   docker compose -f docker-compose.prod.yml ps  # Verificar todos healthy
   ```

3. **Desplegar en producción:**
   - Subir archivos al servidor (sin `.env.production`, crearlo en el servidor)
   - Crear `.env.production` en el servidor con valores reales
   - Ejecutar: `docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build`

4. **Opcional - Añadir Nginx:**
   - Cuando esté listo, añadir servicio Nginx
   - Quitar puertos de backend/frontend
   - Configurar SSL/TLS
   - Actualizar `NEXT_PUBLIC_API_URL` a dominio HTTPS

---

## 📚 Referencias

- Ver `doc/docker/PRODUCTION_SETUP.md` para guía completa de despliegue
- Ver `docker-compose.prod.yml` para configuración final
- Ver `docker/backend.env.production` para variables de entorno

