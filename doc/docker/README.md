## Docker - Guía de uso y actualización sin perder datos

Esta guía explica cómo ejecutar, actualizar y hacer copias de seguridad de la aplicación usando Docker y Docker Compose sin perder datos.

### Servicios
- **db (Postgres 15)**: Base de datos con volumen persistente `postgres_data`.
- **redis (Redis 7)**: Cache y cola (sin datos críticos).
- **backend (Django + Gunicorn)**: Aplica migraciones al arrancar y sirve API.
- **frontend (Next.js)**: App web en el puerto 3000.
- **db-backup**: Backups automáticos diarios de Postgres a la carpeta `backups/`.

Todos los servicios tienen `restart: unless-stopped`.

### Requisitos
- Docker Desktop instalado y en ejecución (Windows).
- Ejecutar siempre los comandos desde la raíz del repo: `F:\Proyecto Sara Aitor\repos separados para el host`.

### Persistencia de datos (¡clave!)
- La base de datos usa el volumen: `reposseparadosparaelhost_postgres_data`.
- No borres volúmenes: evita `docker compose down -v`.
- Usa siempre el mismo nombre de proyecto de Compose. Opcionalmente, fija el nombre:
  - Crea `.env` en la raíz con: `COMPOSE_PROJECT_NAME=reposseparadosparaelhost`

### Levantar en local
```powershell
docker compose up -d db redis
docker compose up -d backend
docker compose up -d frontend
```

Verificación rápida:
```powershell
docker compose ps
# Backend health:
Invoke-WebRequest -UseBasicParsing http://localhost:8000/api/health/ | % StatusCode
# Frontend:
Invoke-WebRequest -UseBasicParsing http://localhost:3000 | % StatusCode
```

### Actualizar frontend y backend (sin tocar la DB)
```powershell
docker compose build backend frontend
docker compose up -d --no-deps backend
docker compose up -d --no-deps frontend
```

Evita parar DB/Redis; así mantenemos el volumen intacto.

### Backups automáticos de Postgres
- Servicio: `db-backup` (imagen: `prodrigestivill/postgres-backup-local:16`)
- Programación: todos los días a las 03:00 (`SCHEDULE: "0 3 * * *"`)
- Destino: carpeta del repo `./backups` (exclúyela del commit si pesa mucho)
- Retención:
  - `BACKUP_KEEP_DAYS: 7`
  - `BACKUP_KEEP_WEEKS: 4`
  - `BACKUP_KEEP_MONTHS: 6`

Logs del backup:
```powershell
docker compose logs --no-log-prefix --tail=100 db-backup
```

Forzar un backup (rápido):
```powershell
docker compose restart db-backup
```
(espera unos minutos y revisa `backups/`)

### Restaurar un backup
1) Parar el backend:
```powershell
docker compose stop backend
```
2) Restaurar la base:
```powershell
docker exec -i reposseparadosparaelhost-db-1 dropdb -U postgres mykaizenfit
docker exec -i reposseparadosparaelhost-db-1 createdb -U postgres mykaizenfit
docker exec -i reposseparadosparaelhost-db-1 pg_restore -U postgres -d mykaizenfit < backups\\YYYYMMDD_HHMMSS_mykaizenfit.dump
```
3) Levantar backend:
```powershell
docker compose up -d backend
```

### Errores comunes y soluciones
- `could not translate host name "db"`: arranca `db` y espera a que esté `healthy`, luego `backend`.
- Volúmenes “perdidos”: asegúrate de ejecutar desde la misma ruta y con el mismo `COMPOSE_PROJECT_NAME`. No usar `down -v`.
- Puertos ocupados: cierra procesos en 3000/8000/5432 o ajusta puertos en `docker-compose.yml`.

### ¿Se sube Docker a GitHub?
- Sí se suben los archivos de Docker (Dockerfile, docker-compose, etc.).
- No se suben las imágenes de Docker automáticamente. Para publicar imágenes en un registry (por ejemplo GHCR), hay que configurar un workflow de CI/CD.

Sugerencia futura (opcional):
- Configurar GitHub Actions para construir y publicar imágenes en `ghcr.io`, y desplegar desde imágenes versionadas.

### Comandos útiles
```powershell
# Estado
docker compose ps

# Logs
docker compose logs --no-log-prefix --tail=200 backend
docker compose logs --no-log-prefix --tail=200 frontend

# Reconstruir y levantar rápido
docker compose up -d --build backend frontend
```


