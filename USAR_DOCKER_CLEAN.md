# 🧹 Guía de Uso - Docker Compose Dev Clean

## ¿Qué es `docker-compose.dev-clean.yml`?

Este archivo combina lo mejor de **producción** (imagen limpia) con **desarrollo** (puertos y BD de dev).

### Características

✅ **Ventajas:**
- **Imagen limpia**: El código viene de la imagen Docker, no del host
- **Sin archivos corruptos**: Evita problemas de volúmenes montados
- **Más robusto**: Usa Gunicorn en lugar de runserver
- **Misma BD de dev**: Usa `mykaizenfit_dev` y mismo volumen
- **Puertos de dev**: 8001, 3001, 5434, 6380

❌ **Limitaciones:**
- **Sin hot-reload**: Necesitas reconstruir la imagen para ver cambios
- **Más lento**: Cada cambio requiere rebuild

---

## 🚀 Uso Básico

### 1. Primera vez (construir imágenes)

```bash
cd /srv/mykaizenfit/pro

# Construir las imágenes desde cero
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml build

# Levantar los servicios
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml up -d
```

### 2. Después de cambios en el código

```bash
# Reconstruir y reiniciar backend
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml build backend
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml up -d backend

# O reconstruir y reiniciar frontend
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml build frontend
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml up -d frontend

# O reconstruir todo
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml build
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml up -d
```

### 3. Ver logs

```bash
# Todos los servicios
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml logs -f

# Solo backend
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml logs -f backend

# Solo frontend
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml logs -f frontend
```

### 4. Parar servicios

```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml down

# Parar y eliminar volúmenes (¡CUIDADO! Borra datos de staticfiles y media)
# COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml down -v
```

---

## 📊 Comparación de Configuraciones

| Característica | dev (con volúmenes) | dev-clean | producción |
|----------------|---------------------|-----------|------------|
| **Puertos** | 8001, 3001, 5434 | 8001, 3001, 5434 | 8000, 3000, 5433 |
| **BD** | mykaizenfit_dev | mykaizenfit_dev | mykaizenfit |
| **Volúmenes código** | ✅ Montados | ❌ No montados | ❌ No montados |
| **Hot-reload** | ✅ Sí | ❌ No | ❌ No |
| **Imagen limpia** | ⚠️ Depende | ✅ Sí | ✅ Sí |
| **Comando backend** | runserver | gunicorn | gunicorn |
| **Robustez** | ⚠️ Media | ✅ Alta | ✅ Alta |
| **Velocidad cambios** | ✅ Instantánea | ❌ Requiere rebuild | ❌ Requiere rebuild |

---

## 🔄 Migración desde `docker-compose.prod.yml`

### Opción 1: Migración gradual

1. **Parar configuración actual:**
   ```bash
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down
   ```

2. **Construir y levantar configuración limpia:**
   ```bash
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml build
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml up -d
   ```

3. **Verificar que funciona:**
   ```bash
   # Ver logs
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml logs -f

   # Probar backend
   curl http://localhost:8001/api/health/

   # Probar frontend
   curl http://localhost:3001/
   ```

### Opción 2: Mantener ambas configuraciones

Puedes tener ambas configuraciones y usar la que necesites:

- **Para desarrollo rápido** (hot-reload): `docker-compose.prod.yml`
- **Para pruebas/verificación** (imagen limpia): `docker-compose.dev-clean.yml`

---

## ⚙️ Configuración

### Variables de Entorno

Usa las mismas variables de desarrollo:
- Backend: `docker/backend.env`
- Frontend: `frontend/docker.env`

### Base de Datos

Comparte la misma base de datos con `docker-compose.prod.yml`:
- Volumen: `postgres_data_dev`
- Nombre: `mykaizenfit_dev`

Esto significa que puedes alternar entre configuraciones sin perder datos.

---

## 🔧 Comandos Útiles

### Reconstruir sin caché

```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml build --no-cache
```

### Ver estado de servicios

```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml ps
```

### Entrar al contenedor del backend

```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml exec backend bash
```

### Ejecutar comandos Django

```bash
# Migraciones
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml exec backend python manage.py migrate

# Shell de Django
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml exec backend python manage.py shell
```

---

## ❓ ¿Cuándo usar cada configuración?

### Usa `docker-compose.prod.yml` (con volúmenes) cuando:
- ✅ Estás desarrollando activamente
- ✅ Necesitas ver cambios instantáneos
- ✅ Estás probando código nuevo
- ✅ La velocidad de iteración es importante

### Usa `docker-compose.dev-clean.yml` (sin volúmenes) cuando:
- ✅ Tienes problemas con archivos corruptos
- ✅ Quieres verificar que todo funciona en imagen limpia
- ✅ Vas a hacer deploy a producción
- ✅ Necesitas máxima robustez
- ✅ Los cambios son menores y no necesitas hot-reload

---

## 🚨 Troubleshooting

### Problema: El backend no inicia

```bash
# Ver logs detallados
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml logs backend

# Reconstruir sin caché
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml build --no-cache backend
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml up -d backend
```

### Problema: El frontend no inicia

```bash
# Ver logs
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml logs frontend

# Reconstruir
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml build --no-cache frontend
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml up -d frontend
```

### Problema: La BD no conecta

Verifica que el contenedor de BD esté corriendo:
```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.dev-clean.yml ps db
```

---

## 📝 Notas Importantes

1. **Misma BD**: Ambas configuraciones usan la misma base de datos (`postgres_data_dev`), así que puedes alternar entre ellas.

2. **Volúmenes estáticos/media**: Usan volúmenes separados (`backend_static_dev`, `backend_media_dev`), pero esto no afecta la funcionalidad.

3. **Puertos**: Ambos usan los mismos puertos de desarrollo, así que no puedes tener ambas configuraciones corriendo al mismo tiempo.

4. **Backups**: La configuración limpia incluye backup automático (opcional).

---

**Última actualización**: $(date)
