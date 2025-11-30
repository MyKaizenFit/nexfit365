# 🔐 Lista Completa de Contraseñas y Secretos para Producción

Esta lista detalla **TODAS** las contraseñas, secretos y valores sensibles que necesitas configurar antes de desplegar en producción.

---

## 📋 Categorización

- ✅ **Puedo generar automáticamente** (Python/scripts)
- 🔧 **Te ayudo a generar** (comandos específicos)
- ⚠️ **Debes proporcionar tú** (dominios, IPs, servicios externos)

---

## 🔐 Lista Completa de Contraseñas/Secretos

### 1. **POSTGRES_PASSWORD** ✅ (Puedo generar)
- **Ubicación:** 
  - `.env.production` (raíz)
  - `docker/backend.env.production` (como `DB_PASSWORD` y `POSTGRES_PASSWORD`)
- **Requisitos:** 
  - Mínimo 16 caracteres
  - Mayúsculas, minúsculas, números, símbolos
  - **DEBE SER LA MISMA** en ambos archivos
- **Uso:** Contraseña para acceder a la base de datos Postgres
- **Generación:** Script automático

---

### 2. **REDIS_PASSWORD** ✅ (Puedo generar)
- **Ubicación:**
  - `.env.production` (raíz)
  - `docker/backend.env.production` (como `REDIS_PASSWORD`)
- **Requisitos:**
  - Mínimo 16 caracteres
  - Puede ser diferente a POSTGRES_PASSWORD
  - **DEBE SER LA MISMA** en ambos archivos
- **Uso:** Contraseña para acceder a Redis (cache y sesiones)
- **Generación:** Script automático

---

### 3. **SECRET_KEY** (Django) ✅ (Puedo generar)
- **Ubicación:** `docker/backend.env.production`
- **Requisitos:**
  - Mínimo 50 caracteres
  - Aleatorio y seguro
  - Generado por Django
- **Uso:** Clave secreta de Django para firmas, sesiones, etc.
- **Generación:** `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`

---

### 4. **JWT_SECRET** ✅ (Puedo generar)
- **Ubicación:** `docker/backend.env.production`
- **Requisitos:**
  - Mínimo 32 caracteres
  - Aleatorio y seguro
  - Diferente de JWT_REFRESH_SECRET
- **Uso:** Clave para firmar tokens JWT de acceso
- **Generación:** Script automático (base64 seguro)

---

### 5. **JWT_REFRESH_SECRET** ✅ (Puedo generar)
- **Ubicación:** `docker/backend.env.production`
- **Requisitos:**
  - Mínimo 32 caracteres
  - Aleatorio y seguro
  - Diferente de JWT_SECRET
- **Uso:** Clave para firmar tokens JWT de refresco
- **Generación:** Script automático (base64 seguro)

---

### 6. **ALLOWED_HOSTS** ⚠️ (Debes proporcionar)
- **Ubicación:** `docker/backend.env.production`
- **Formato:** `dominio1.com,www.dominio1.com,backend.dominio1.com,localhost,127.0.0.1`
- **Uso:** Dominios permitidos para acceder al backend Django
- **Ejemplo:** `mykaizenfit.com,www.mykaizenfit.com,api.mykaizenfit.com,localhost,127.0.0.1`
- **Nota:** Si usas IP directamente, añade: `TU_IP,localhost,127.0.0.1`

---

### 7. **CORS_ALLOWED_ORIGINS** ⚠️ (Debes proporcionar)
- **Ubicación:** `docker/backend.env.production`
- **Formato:** `https://dominio1.com,https://www.dominio1.com`
- **Uso:** Orígenes permitidos para peticiones CORS (frontend)
- **Ejemplo:** `https://mykaizenfit.com,https://www.mykaizenfit.com`
- **Nota:** 
  - Si usas HTTP (IP:puerto), usa: `http://TU_IP:3000`
  - Cuando tengas HTTPS, cambia a `https://...`

---

### 8. **CSRF_TRUSTED_ORIGINS** ⚠️ (Debes proporcionar)
- **Ubicación:** `docker/backend.env.production`
- **Formato:** `https://dominio1.com,https://www.dominio1.com`
- **Uso:** Orígenes confiables para CSRF (mismo que CORS generalmente)
- **Ejemplo:** `https://mykaizenfit.com,https://www.mykaizenfit.com`
- **Nota:** Mismo formato que CORS_ALLOWED_ORIGINS

---

### 9. **NEXT_PUBLIC_API_URL** ⚠️ (Debes proporcionar)
- **Ubicación:** `frontend/docker.env.production`
- **Formato:** 
  - Fase 1 (IP:puerto): `http://TU_IP:8000/api`
  - Fase final (dominio): `https://backend.tu-dominio.com/api` o `https://tu-dominio.com/api`
- **Uso:** URL del backend para peticiones desde el frontend
- **Ejemplo fase 1:** `http://192.168.1.100:8000/api`
- **Ejemplo fase final:** `https://api.mykaizenfit.com/api`

---

### 10. **EMAIL_HOST_PASSWORD** (Opcional) ⚠️
- **Ubicación:** `docker/backend.env.production` (comentado por defecto)
- **Uso:** Contraseña de aplicación para el servicio de email (Gmail, etc.)
- **Nota:** Solo si activas el envío de emails. Debes obtenerla de tu proveedor de email.

---

### 11. **SENTRY_DSN** (Opcional) ⚠️
- **Ubicación:** 
  - `docker/backend.env.production` (comentado)
  - `frontend/docker.env.production` (comentado)
- **Uso:** DSN de Sentry para monitoreo de errores
- **Nota:** Solo si usas Sentry. Debes obtenerlo de tu cuenta de Sentry.

---

## 📊 Resumen por Archivo

### `.env.production` (raíz)
- ✅ `POSTGRES_PASSWORD` (generar)
- ✅ `REDIS_PASSWORD` (generar)

### `docker/backend.env.production`
- ✅ `POSTGRES_PASSWORD` (mismo que .env.production)
- ✅ `DB_PASSWORD` (mismo que POSTGRES_PASSWORD)
- ✅ `REDIS_PASSWORD` (mismo que .env.production)
- ✅ `SECRET_KEY` (generar con Django)
- ✅ `JWT_SECRET` (generar)
- ✅ `JWT_REFRESH_SECRET` (generar)
- ⚠️ `ALLOWED_HOSTS` (tu dominio)
- ⚠️ `CORS_ALLOWED_ORIGINS` (tu dominio frontend)
- ⚠️ `CSRF_TRUSTED_ORIGINS` (tu dominio frontend)

### `frontend/docker.env.production`
- ⚠️ `NEXT_PUBLIC_API_URL` (tu IP o dominio)

---

## 🎯 Plan de Acción

1. **Generar automáticamente** (yo lo haré):
   - POSTGRES_PASSWORD
   - REDIS_PASSWORD
   - SECRET_KEY
   - JWT_SECRET
   - JWT_REFRESH_SECRET

2. **Configurar contigo** (necesito tu información):
   - ALLOWED_HOSTS (¿cuál es tu dominio o IP?)
   - CORS_ALLOWED_ORIGINS (¿cuál es tu dominio frontend?)
   - CSRF_TRUSTED_ORIGINS (mismo que CORS)
   - NEXT_PUBLIC_API_URL (¿IP:puerto o dominio?)

3. **Opcional** (más adelante):
   - EMAIL_HOST_PASSWORD (si usas emails)
   - SENTRY_DSN (si usas Sentry)

---

## ✅ Siguiente Paso

Dime:
1. **¿Tienes dominio o usarás IP directamente?**
   - Si dominio: ¿cuál es? (ej: `mykaizenfit.com`)
   - Si IP: ¿cuál es la IP del servidor?

2. **¿Quieres que genere todas las contraseñas ahora?**
   - Puedo generar: POSTGRES_PASSWORD, REDIS_PASSWORD, SECRET_KEY, JWT_SECRET, JWT_REFRESH_SECRET
   - Y configurarlas en los archivos correspondientes

Con esa información, genero todo y lo configuro automáticamente. 🚀

