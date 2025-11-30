# Verificar Estado de la Aplicación de Desarrollo

## 🔍 Verificar si está Desplegada

### Opción 1: Verificar Contenedores Docker

```bash
cd /srv/mykaizenfit/pro
docker compose -f docker-compose.prod.yml ps
```

Deberías ver algo como:
```
NAME                          STATUS              PORTS
dev-backend-1                 Up 5 minutes        0.0.0.0:8001->8000/tcp
dev-frontend-1                Up 5 minutes        0.0.0.0:3001->3000/tcp
dev-db-1                      Up 5 minutes        0.0.0.0:5434->5432/tcp
dev-redis-1                   Up 5 minutes        0.0.0.0:6380->6379/tcp
```

### Opción 2: Verificar Puertos

```bash
# Verificar puertos en uso
netstat -tuln | grep -E ':(3001|8001|5434|6380)'
# O
ss -tuln | grep -E ':(3001|8001|5434|6380)'
```

### Opción 3: Verificar Servicios HTTP

```bash
# Verificar backend
curl http://localhost:8001/api/health/

# Verificar frontend
curl http://localhost:3001/
```

---

## 🚀 Desplegar la Aplicación (Si No Está Desplegada)

### Paso 1: Verificar Archivos de Configuración

Asegúrate de que existan:
- `docker/backend.env`
- `frontend/docker.env`

### Paso 2: Levantar los Servicios

```bash
cd /srv/mykaizenfit/pro

# Opción A: Levantar todos los servicios
docker compose -f docker-compose.prod.yml up -d

# Opción B: Levantar con build (si hay cambios)
docker compose -f docker-compose.prod.yml up -d --build
```

### Paso 3: Verificar Logs

```bash
# Ver logs de todos los servicios
docker compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Paso 4: Verificar Estado

```bash
# Estado de los contenedores
docker compose -f docker-compose.prod.yml ps

# Verificar salud de los servicios
docker compose -f docker-compose.prod.yml ps --format json | jq '.[] | {name: .Name, status: .State, health: .Health}'
```

---

## 📍 Puertos de Desarrollo

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8001/api
- **Admin Django**: http://localhost:8001/admin
- **Base de Datos**: localhost:5434
- **Redis**: localhost:6380

---

## 🔧 Comandos Útiles

### Detener Servicios

```bash
docker compose -f docker-compose.prod.yml down
```

### Reiniciar un Servicio Específico

```bash
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml restart frontend
```

### Ver Logs en Tiempo Real

```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

### Ejecutar Comandos en los Contenedores

```bash
# Backend
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Base de datos
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d mykaizenfit_dev
```

---

## 🐛 Solución de Problemas

### Si los contenedores no inician:

1. **Verificar logs**:
   ```bash
   docker compose -f docker-compose.prod.yml logs
   ```

2. **Reconstruir contenedores**:
   ```bash
   docker compose -f docker-compose.prod.yml down -v
   docker compose -f docker-compose.prod.yml up -d --build
   ```

3. **Verificar permisos**:
   ```bash
   ls -la docker/backend.env
   ls -la frontend/docker.env
   ```

4. **Verificar espacio en disco**:
   ```bash
   df -h
   docker system df
   ```

### Si el backend no responde:

1. **Verificar migraciones**:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
   ```

2. **Verificar variables de entorno**:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend env | grep -E '(DB_|JWT_|SECRET)'
   ```

3. **Verificar base de datos**:
   ```bash
   docker compose -f docker-compose.prod.yml exec db pg_isready -U postgres
   ```

### Si el frontend no responde:

1. **Verificar logs**:
   ```bash
   docker compose -f docker-compose.prod.yml logs frontend
   ```

2. **Verificar variables de entorno**:
   ```bash
   docker compose -f docker-compose.prod.yml exec frontend env | grep NEXT_PUBLIC
   ```

---

## 📝 Notas

- Los contenedores usan el prefijo `dev-` en sus nombres
- Los volúmenes persisten los datos aunque se detengan los contenedores
- Para limpiar todo (¡cuidado, elimina datos!):
  ```bash
  docker compose -f docker-compose.prod.yml down -v
  ```

