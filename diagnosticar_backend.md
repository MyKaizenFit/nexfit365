# 🔧 Diagnóstico y Solución de Problemas del Backend

## Problema: Backend no inicia (container unhealthy)

## Pasos para Diagnosticar y Solucionar

### 1. Ver los logs del backend

```bash
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs backend --tail=100
```

Esto te mostrará los errores reales.

### 2. Problemas Comunes y Soluciones

#### A. Error en las migraciones

Si ves errores como "table already exists" o errores de migración:

```bash
# Detener el backend
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml stop backend
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml rm -f backend

# Entrar al contenedor y ejecutar migraciones manualmente
sudo docker run --rm -it \
  --network nexfit-pro_internal \
  -v /srv/mykaizenfit/pro/backend:/app \
  -v nexfit-pro_backend_static_dev:/app/staticfiles \
  -v nexfit-pro_backend_media_dev:/app/media \
  --env-file /srv/mykaizenfit/pro/docker/backend.env \
  nexfit-pro-backend:latest \
  bash -c "python manage.py migrate"

# Luego reiniciar
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d backend
```

#### B. Problema con la base de datos

Si la base de datos no está accesible:

```bash
# Verificar que la DB esté corriendo
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps db

# Si no está corriendo, iniciarla
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d db

# Esperar a que esté saludable
sleep 10
```

#### C. Error en el código o dependencias faltantes

```bash
# Reconstruir la imagen
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml build backend --no-cache

# Luego iniciar
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d backend
```

#### D. Problema con el healthcheck

El healthcheck puede estar fallando porque el servidor tarda en iniciar. Puedes aumentarlo temporalmente editando `docker-compose.prod.yml`:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/api/health/"]
  interval: 30s
  timeout: 10s
  retries: 5  # Aumentar de 3 a 5
  start_period: 60s  # Aumentar de 20s a 60s
```

### 3. Ejecutar el Script de Solución Automática

```bash
cd /srv/mykaizenfit/pro
./solucionar_backend.sh
```

### 4. Verificar Manualmente el Endpoint de Health

Una vez que el backend esté corriendo:

```bash
# Desde el host
curl http://localhost:8001/api/health/

# O desde dentro del contenedor
sudo docker exec nexfit-pro-backend-1 curl -f http://localhost:8000/api/health/
```

### 5. Iniciar Todo de Nuevo

```bash
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml down
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d --build
```

## Comandos Útiles

```bash
# Ver estado de todos los contenedores
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps

# Ver logs en tiempo real
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs -f backend

# Entrar al contenedor del backend
sudo docker exec -it nexfit-pro-backend-1 bash

# Ver variables de entorno dentro del contenedor
sudo docker exec nexfit-pro-backend-1 env | grep -E "(DB_|REDIS_|SECRET)"
```

