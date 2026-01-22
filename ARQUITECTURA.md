# 🏗️ Arquitectura Técnica - MyKaizenFit

## 📋 Tabla de Contenidos
1. [Stack Tecnológico](#stack-tecnológico)
2. [Flujo de Autenticación](#flujo-de-autenticación)
3. [Estructura de Base de Datos](#estructura-de-base-de-datos)
4. [Datos Sensibles & Encriptación](#datos-sensibles--encriptación)
5. [Endpoints Críticos](#endpoints-críticos)
6. [Seguridad](#seguridad)
7. [Despliegue](#despliegue)

---

## 🔧 Stack Tecnológico

### Backend
| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Framework | Django | 5.2.4 |
| API | Django REST Framework | Latest |
| Auth | JWT (Simple JWT) | Custom |
| BD | PostgreSQL | 15 |
| Cache | Redis | 7-alpine |
| Servidor Web | Gunicorn + Nginx | Latest |
| Contenedor | Docker | Latest |

### Frontend
| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Framework | Next.js | Latest |
| Lenguaje | TypeScript | Latest |
| Estilos | Tailwind CSS | Latest |
| HTTP Client | Axios | Latest |
| Estado | React Context | Built-in |

---

## 🔐 Flujo de Autenticación

### 1. **Login (POST /api/auth/login/)**
```
Usuario → Credenciales (email/password) → Backend
    ↓
Backend valida en BD
    ↓
Si válido → Genera JWT (access + refresh tokens)
Si inválido → Retorna 401
    ↓
Cliente almacena tokens en localStorage
```

**Tokens:**
- `access`: Válido 5 minutos (configurable)
- `refresh`: Válido 24 horas (configurable)

### 2. **Requests Autenticados**
```
Cliente → Header: "Authorization: Bearer <access_token>"
    ↓
Backend verifica firma JWT
    ↓
Si válido → Ejecuta endpoint
Si inválido → Retorna 401 Unauthorized
```

### 3. **Token Refresh (POST /api/auth/refresh/)**
```
Cliente envía: { refresh: "<refresh_token>" }
    ↓
Backend valida refresh token
    ↓
Genera nuevo access token
    ↓
Cliente actualiza localStorage
```

### 4. **Logout (POST /api/auth/logout/)**
```
Cliente envía: { refresh: "<refresh_token>" }
    ↓
Backend agrega token a blacklist (Redis)
    ↓
Token se invalida inmediatamente
    ↓
Cliente borra localStorage
```

---

## 🗄️ Estructura de Base de Datos

### Aplicaciones Django
```
accounts/          → CustomUser + Autenticación
dashboard/         → Configuración planes, reportes
nutrition/         → Planes nutricionales, recetas
workouts/          → Planes de ejercicio, logs
progress/          → Seguimiento de progreso
notifications/     → Push notifications, logs
achievements/      → Logros del usuario
```

### Relaciones Principales
```
CustomUser (1) ─── (∞) NutritionPlan
CustomUser (1) ─── (∞) WorkoutPlan
CustomUser (1) ─── (∞) ProgressLog
NutritionPlan (1) ─── (∞) PlanMeal
PlanMeal (1) ─── (∞) Recipe
```

---

## 🔒 Datos Sensibles & Encriptación

### Campos Encriptados (Fernet AES-128 + HMAC)
```python
class CustomUser(AbstractUser):
    phone_number            # ✅ Encriptado
    injuries_or_medical_issues  # ✅ Encriptado
    disliked_foods         # ✅ Encriptado
    email                  # ❌ No encriptado (necesario para auth)
    password               # ❌ Hashed con bcrypt (no reversible)
```

### Utilidad de Encriptación
**Ubicación:** `backend/utils/encryption.py`

```python
from utils.encryption import SensitiveDataEncryption

enc = SensitiveDataEncryption()

# Encriptar
encrypted = enc.encrypt("valor sensible")
# Resultado: "fernet:..." (base64)

# Desencriptar
original = enc.decrypt(encrypted)
# Resultado: "valor sensible"
```

### Configuración
- **ENCRYPTION_KEY**: Generada en `.env` (base64)
- **Algoritmo**: Fernet (simétrico)
- **Detección**: Prefijo `fernet:` indica dato encriptado
- **Idempotencia**: No re-encripta datos ya encriptados

---

## 🚀 Endpoints Críticos

### Autenticación
| Método | Endpoint | Autenticación | Descripción |
|--------|----------|---------------|-------------|
| POST | `/api/auth/login/` | ❌ No | Crear sesión |
| POST | `/api/auth/refresh/` | ❌ No | Refrescar token |
| POST | `/api/auth/logout/` | ✅ Sí | Terminar sesión |
| GET | `/api/auth/me/` | ✅ Sí | Datos del usuario actual |

### Nutrición
| Método | Endpoint | Autenticación | Descripción |
|--------|----------|---------------|-------------|
| GET | `/api/nutrition/plans/` | ✅ Sí | Listar planes |
| POST | `/api/nutrition/plans/` | ✅ Sí | Crear plan |
| GET | `/api/nutrition/recipes/` | ✅ Sí | Listar recetas |

### Ejercicio
| Método | Endpoint | Autenticación | Descripción |
|--------|----------|---------------|-------------|
| GET | `/api/workouts/plans/` | ✅ Sí | Listar planes |
| POST | `/api/workouts/logs/` | ✅ Sí | Registrar ejercicio |

### Progreso
| Método | Endpoint | Autenticación | Descripción |
|--------|----------|---------------|-------------|
| GET | `/api/progress/` | ✅ Sí | Datos de progreso |
| POST | `/api/progress/measurements/` | ✅ Sí | Registrar medidas |

---

## 🛡️ Seguridad

### 1. **Autenticación**
- ✅ JWT tokens con firma cryptográfica
- ✅ Refresh tokens con validación en BD
- ✅ Token blacklist para logout inmediato
- ✅ Password hashing con algoritmo seguro

### 2. **Encriptación**
- ✅ Fernet AES-128-CBC para datos sensibles
- ✅ HMAC para integridad
- ✅ ENCRYPTION_KEY nunca en código
- ✅ Detección automática de datos ya encriptados

### 3. **Backup Automático**
- ✅ Cron diario a las 2:00 AM
- ✅ Fallback a `docker cp` si `pg_dump` falla
- ✅ Compresión automática
- ✅ Retención de 7 días

**Ubicación:** `/scripts/auto-backup.sh`

### 4. **Logging**
- ✅ Logs estructurados (JSON)
- ✅ Sin exposición de datos sensibles
- ✅ Nivel DEBUG deshabilitado en producción
- ✅ Alertas configurable por severidad

### 5. **Base de Datos**
- ✅ PostgreSQL con SSL/TLS en tránsito
- ✅ Usuario BD con permisos restringidos
- ✅ Backups encriptados
- ⚠️ Nota: PostgreSQL actual con archivos corruptos (mantenimiento pendiente)

### 6. **API**
- ✅ Rate limiting por IP
- ✅ Validación de input en todos los endpoints
- ✅ CORS configurado correctamente
- ✅ HTTPS enforced en producción

---

## 🚀 Despliegue

### Arquitectura de Contenedores
```
┌─────────────────────────────────────────┐
│           NGINX (Reverse Proxy)         │
│              :80 / :443                 │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
  Frontend    Backend       (SSL)
  :3000       :8000
  Next.js    Django REST
             Gunicorn
             
    │            │
    └────────────┼────────────┐
                 │            │
                 ▼            ▼
              PostgreSQL    Redis
              :5432         :6379
              BD            Cache
```

### Docker Compose
```yaml
# Servicios en producción
nexfit-pro-backend        # Django + Gunicorn
nexfit-pro-frontend       # Next.js
nexfit-pro-db             # PostgreSQL 15
nexfit-pro-db-backup      # Backup automático
nexfit-pro-redis          # Cache/Sessions
```

### Variables de Entorno Críticas
```bash
# Backend
DJANGO_SECRET_KEY=                    # ⚠️ CAMBIAR EN PRODUCCIÓN
ENCRYPTION_KEY=                       # ⚠️ Generada en setup
DATABASE_URL=postgresql://...         # Conexión BD
REDIS_URL=redis://redis:6379         # Cache
DEBUG=false                           # NUNCA true en prod
ALLOWED_HOSTS=                        # Dominios permitidos

# Frontend
NEXT_PUBLIC_API_URL=                 # URL del backend
NEXT_PUBLIC_APP_NAME=MyKaizenFit     # Nombre app
```

### Despliegue en Producción
```bash
# 1. Clonar repositorio
git clone https://github.com/MyKaizenFit/nexfit365.git
cd nexfit365/pro

# 2. Configurar variables
cp backend/.env.example backend/.env
# EDITAR: DJANGO_SECRET_KEY, ENCRYPTION_KEY, etc.

# 3. Levantar servicios
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d

# 4. Ejecutar migraciones
docker compose exec backend python manage.py migrate

# 5. Crear superuser (si necesario)
docker compose exec backend python manage.py createsuperuser

# 6. Verificar salud
docker compose ps
```

### Verificación Post-Deploy
```bash
# Verificar servicios
docker ps | grep nexfit-pro

# Verificar logs
docker compose logs backend --tail 20

# Test de connectivity
curl http://localhost:8000/api/auth/ping/
curl http://localhost:3000/
```

---

## 📊 Monitoreo

### Logs
```bash
# Backend
docker compose logs -f backend

# Frontend
docker compose logs -f frontend

# Base de datos
docker compose logs -f db
```

### Health Checks
```bash
# Backend
curl -s http://localhost:8000/api/health/ | jq

# Frontend
curl -s http://localhost:3000/

# Redis
docker compose exec redis redis-cli ping
```

---

## 🔄 Migración de Datos

### Copia de BD Completa
```bash
# Backup
COMPOSE_PROJECT_NAME=nexfit-pro docker-compose exec -T db pg_dump \
  -U postgres mydatabase > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260122.sql | docker-compose exec -T db psql -U postgres
```

---

## 📝 Notas Importantes

1. **ENCRYPTION_KEY**: Guardar en lugar seguro. Perderla hace los datos inaccessibles.
2. **PostgreSQL actual**: Tiene archivos corruptos. Requiere:
   - `VACUUM ANALYZE`
   - Posible rebuild de índices
   - O restore desde backup
3. **Backup diarios**: Verificar que cron está activo: `crontab -l`
4. **VAPID Keys**: Configurar para push notifications: `python manage.py generate_vapid_keys`

---

## 🔗 Enlaces Útiles

- [Django REST Framework Docs](https://www.django-rest-framework.org/)
- [Next.js Docs](https://nextjs.org/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Fernet (cryptography)](https://cryptography.io/en/latest/fernet/)

---

**Versión:** 1.0  
**Fecha:** 22 de Enero de 2026  
**Autor:** Documentación de Arquitectura
