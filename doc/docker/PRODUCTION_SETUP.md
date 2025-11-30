# 🚀 Guía de Configuración para Producción

Esta guía explica todos los cambios realizados para preparar el proyecto para producción.

## 📋 Archivos Creados/Modificados

### 1. `docker-compose.prod.yml` (NUEVO)
**Ubicación:** Raíz del proyecto

**¿Qué es?**
- Versión optimizada y segura de `docker-compose.yml` para producción
- Incluye mejoras de seguridad, redes internas y configuración optimizada

**Cambios principales:**

#### ✅ **Seguridad Mejorada:**
- **Puertos de DB/Redis NO expuestos:** En producción, Postgres (5432) y Redis (6379) NO deben ser accesibles desde fuera
  - **Antes:** `ports: - "5432:5432"` ❌
  - **Ahora:** Sin mapeo de puertos, solo comunicación interna ✅

#### ✅ **Redes Separadas:**
- **Red `internal`:** Para comunicación entre servicios (db, redis, backend)
- **Red `web`:** Para servicios accesibles (frontend, backend, futuro Nginx)
- Esto mejora la seguridad aislando servicios internos

#### ✅ **Variables de Entorno desde .env:**
- Usa `${POSTGRES_PASSWORD}` en lugar de valores hardcodeados
- Permite usar un archivo `.env.production` en la raíz

#### ✅ **Gunicorn Optimizado:**
- Más workers (4 en lugar de 3)
- Threads habilitados (2 por worker)
- Timeout aumentado (120s)
- Logs configurados

#### ✅ **Healthchecks Mejorados:**
- `start_period` añadido para dar tiempo de inicio
- Mejor detección de servicios listos

**Cómo usar:**
```bash
# 1. Crea .env.production en la raíz con las variables necesarias
# 2. Ejecuta:
docker compose -f docker-compose.prod.yml up -d
```

---

### 2. `docker/backend.env.production` (NUEVO)
**Ubicación:** `docker/backend.env.production`

**¿Qué es?**
- Archivo de variables de entorno para el backend en producción
- Reemplaza a `docker/backend.env` (que es para desarrollo)

**Cambios principales:**

#### ✅ **DEBUG Desactivado:**
- `DEBUG=False` (en desarrollo era `True`)
- Evita exponer información sensible en errores

#### ✅ **SECRET_KEY Seguro:**
- **⚠️ DEBES GENERAR UNO:** 
  ```bash
  python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
  ```
- Mínimo 50 caracteres, aleatorio

#### ✅ **ALLOWED_HOSTS Configurado:**
- **⚠️ DEBES AÑADIR TU DOMINIO:**
  ```
  ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com,backend.tu-dominio.com
  ```

#### ✅ **Contraseñas Fuertes:**
- `DB_PASSWORD`: Debe ser fuerte (mínimo 16 caracteres)
- `REDIS_PASSWORD`: Nueva, no estaba en desarrollo
- `JWT_SECRET` y `JWT_REFRESH_SECRET`: Deben ser aleatorios (32+ caracteres)

#### ✅ **CORS Configurado:**
- **⚠️ DEBES AÑADIR TU DOMINIO FRONTEND:**
  ```
  CORS_ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
  ```

#### ✅ **Cookies Seguras:**
- `SESSION_COOKIE_SECURE=True` (solo HTTPS)
- `CSRF_COOKIE_SECURE=True` (solo HTTPS)
- `SESSION_COOKIE_HTTPONLY=True`

**Cómo usar:**
1. Copia el archivo
2. Reemplaza todos los valores marcados con ⚠️
3. Genera las claves secretas necesarias
4. Añade tus dominios

---

### 3. `frontend/docker.env.production` (NUEVO)
**Ubicación:** `frontend/docker.env.production`

**¿Qué es?**
- Archivo de variables de entorno para el frontend en producción
- Reemplaza a `frontend/docker.env` (que es para desarrollo)

**Cambios principales:**

#### ✅ **DEBUG Desactivado:**
- `NEXT_PUBLIC_DEBUG=false` (en desarrollo era `true`)
- `NEXT_PUBLIC_LOG_LEVEL=error` (menos verbose)

#### ✅ **URL de API de Producción:**
- **⚠️ DEBES CONFIGURAR:**
  ```
  NEXT_PUBLIC_API_URL=https://backend.tu-dominio.com/api
  ```
- O si usas el mismo dominio:
  ```
  NEXT_PUBLIC_API_URL=https://tu-dominio.com/api
  ```

#### ✅ **Analytics y Sentry Opcionales:**
- Configurables pero desactivados por defecto
- Descomenta y configura si los usas

**Cómo usar:**
1. Copia el archivo
2. Configura `NEXT_PUBLIC_API_URL` con tu dominio real
3. Ajusta otras opciones según necesites

---

## 🔧 Pasos para Desplegar en Producción

### Paso 1: Preparar Variables de Entorno

#### 1.1. Crear `.env.production` en la raíz (⚠️ CRÍTICO):
```bash
# Copia env.production.template como .env.production
cp env.production.template .env.production

# Edita .env.production y configura:
POSTGRES_DB=mykaizenfit
POSTGRES_USER=postgres
POSTGRES_PASSWORD=TU_CONTRASEÑA_FUERTE_AQUI
REDIS_PASSWORD=TU_CONTRASEÑA_REDIS_AQUI
```

**⚠️ IMPORTANTE:** Este archivo es **CRÍTICO** porque:
- Docker Compose resuelve `${POSTGRES_PASSWORD}` y `${REDIS_PASSWORD}` **ANTES** de arrancar contenedores
- Se lee desde la raíz del proyecto, NO desde `env_file` de otros servicios
- Los servicios `db`, `db-backup` y `redis` dependen de estas variables
- **DEBE existir** antes de ejecutar `docker compose`

#### 1.2. Configurar `docker/backend.env.production`:
```bash
# Genera SECRET_KEY:
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Edita el archivo y reemplaza:
# - SECRET_KEY
# - ALLOWED_HOSTS (tus dominios)
# - POSTGRES_PASSWORD (opcional aquí, pero debe coincidir con .env.production)
# - DB_PASSWORD (para Django, DEBE ser la misma que POSTGRES_PASSWORD en .env.production)
# - REDIS_PASSWORD (DEBE ser la misma que REDIS_PASSWORD en .env.production)
# - JWT_SECRET y JWT_REFRESH_SECRET
# - CORS_ALLOWED_ORIGINS (tus dominios frontend)

# ⚠️ REGLA DE ORO:
# - POSTGRES_PASSWORD en .env.production = DB_PASSWORD en backend.env.production
# - REDIS_PASSWORD en .env.production = REDIS_PASSWORD en backend.env.production
```

#### 1.3. Configurar `frontend/docker.env.production`:
```bash
# Edita y configura:
# - NEXT_PUBLIC_API_URL

# ⚠️ IMPORTANTE según tu despliegue:
# 
# Si usas IP:puerto directamente (primera fase):
#   NEXT_PUBLIC_API_URL=http://TU_IP:8000/api
#
# Si usas dominio con HTTPS (producción final):
#   NEXT_PUBLIC_API_URL=https://backend.tu-dominio.com/api
#   o si es el mismo dominio:
#   NEXT_PUBLIC_API_URL=https://tu-dominio.com/api
```

### Paso 2: Construir y Levantar Servicios

```bash
# ⚠️ IMPORTANTE: Usa --env-file para cargar .env.production
# Construir imágenes
docker compose --env-file .env.production -f docker-compose.prod.yml build

# Levantar servicios
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# Ver logs
docker compose -f docker-compose.prod.yml logs -f

# Verificar estado
docker compose -f docker-compose.prod.yml ps
```

### Paso 3: Verificar que Todo Funciona

```bash
# Verificar backend
curl http://localhost:8000/api/health/

# Verificar frontend
curl http://localhost:3000

# Verificar base de datos
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d mykaizenfit -c "SELECT 1;"
```

### Paso 4: Configurar Nginx (Recomendado)

Si quieres usar Nginx como reverse proxy (recomendado para producción):

1. **Crea `nginx/nginx.conf`:**
```nginx
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Redirigir a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Archivos estáticos de Django
    location /static {
        alias /app/staticfiles;
    }

    # Archivos media de Django
    location /media {
        alias /app/media;
    }
}
```

2. **Añade servicio Nginx a `docker-compose.prod.yml`:**
```yaml
nginx:
  image: nginx:alpine
  restart: unless-stopped
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/ssl:/etc/nginx/ssl:ro
    - backend_static:/app/staticfiles:ro
    - backend_media:/app/media:ro
  depends_on:
    - backend
    - frontend
  networks:
    - web
```

3. **Quita los puertos de backend y frontend** en `docker-compose.prod.yml` (solo Nginx expone puertos)

---

## 🔒 Seguridad - Checklist

Antes de desplegar, verifica:

- [ ] `DEBUG=False` en backend
- [ ] `NEXT_PUBLIC_DEBUG=false` en frontend
- [ ] `SECRET_KEY` generado y seguro (50+ caracteres)
- [ ] `DB_PASSWORD` fuerte (16+ caracteres)
- [ ] `REDIS_PASSWORD` configurado
- [ ] `JWT_SECRET` y `JWT_REFRESH_SECRET` generados
- [ ] `ALLOWED_HOSTS` contiene solo tus dominios
- [ ] `CORS_ALLOWED_ORIGINS` contiene solo tus dominios frontend
- [ ] Puertos 5432 y 6379 NO expuestos
- [ ] Cookies configuradas como `Secure` (HTTPS)
- [ ] Archivos `.env.production` NO están en Git (añadidos a `.gitignore`)

---

## 📝 Resumen de Cambios

| Archivo | Estado | Cambios |
|---------|--------|---------|
| `docker-compose.prod.yml` | ✅ NUEVO | Versión segura para producción |
| `docker/backend.env.production` | ✅ NUEVO | Variables de entorno backend producción |
| `frontend/docker.env.production` | ✅ NUEVO | Variables de entorno frontend producción |
| `docker-compose.yml` | ⚠️ Sin cambios | Mantiene configuración de desarrollo |

---

## 🆘 Troubleshooting

### Error: "POSTGRES_PASSWORD not set"
- **Solución:** `POSTGRES_PASSWORD` debe estar en `docker/backend.env.production`
- Verifica que el archivo existe y tiene la variable definida
- Asegúrate de que `POSTGRES_PASSWORD` y `DB_PASSWORD` tienen el mismo valor

### Error: "Connection refused" en backend
- Verifica que `DB_HOST=db` en `backend.env.production`
- Verifica que el servicio `db` está healthy: `docker compose ps`

### Error: CORS bloqueado
- Verifica `CORS_ALLOWED_ORIGINS` en `backend.env.production`
- Añade tu dominio frontend exacto (con https://)

### Los servicios no inician
- Revisa logs: `docker compose -f docker-compose.prod.yml logs`
- Verifica que todos los archivos `.env.production` existen
- Verifica que las contraseñas coinciden entre archivos

---

## 📚 Referencias

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/)
- [Next.js Production Deployment](https://nextjs.org/docs/deployment)

