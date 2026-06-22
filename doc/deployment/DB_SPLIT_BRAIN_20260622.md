# Incidente split-brain PostgreSQL (2026-06-22)

## Resumen

Dos contenedores PostgreSQL (`nexfit-pro-db-1` y `pro-db-1`) montaban el **mismo volumen** (`/srv/mykaizenfit/pro/data/postgres`) y compartían el alias DNS **`nexfit-pro-db`** en la red `nexfit-pro-internal-prod`. El backend conectaba de forma aleatoria a uno u otro, con datos divergentes.

**Síntoma:** planes que aparecían vacíos de forma intermitente (p. ej. MACROCICLO).

**Causa del stack duplicado:** ejecutar `docker compose up` en `/srv/mykaizenfit/pro` **sin** `COMPOSE_PROJECT_NAME=nexfit-pro` crea un proyecto Docker llamado `pro` (nombre de la carpeta), levantando `pro-db-1` en paralelo.

## Datos del MACROCICLO

El trabajo real estaba en el plan `e8b2c8e7-bd33-40d1-9099-cf14e6eea4ed` (nombre actual: **MACROCICLO: Pomposo Redondo y Vientre Plano**):

- Semanas 1–17 con ejercicios (~285)
- Semana 18: estructura sin ejercicios
- Semanas 19–52: placeholders vacíos

Un segundo plan vacío (`57de73ad-…`, nombre en mayúsculas sin dos puntos) existía solo en `pro-db-1`.

## Resolución aplicada

1. Backups manuales de ambas instancias → `backups/manual/backup-*-20260622_180029.dump`
2. Mantenimiento activado
3. Fusión selectiva `pro-db-1` → `nexfit-pro-db-1` (`scripts/merge-split-brain-db.py`)
4. Parada de `pro-db-1` / `pro-db-backup-1` (`restart=no`)
5. Corrupción de checkpoint al compartir volumen → restauración desde backup manual + re-fusión vía contenedor temporal
6. Backup canónico post-recuperación: `backups/mykaizenfit_20260622_180748.dump`
7. Volumen corrupto preservado en `data/postgres-corrupted-20260622/`

## Prevención

| Medida | Detalle |
|--------|---------|
| `name: nexfit-pro` | En `docker-compose.prod.yml` — fija el nombre del proyecto |
| `nexfit-pro.service` | Systemd usa `COMPOSE_PROJECT_NAME=nexfit-pro` |
| `disable-legacy-pro-stack.sh` | Detiene `pro-db-1`, `pro-celery_worker-1`, etc. |
| `auto-backup.sh` | Usa explícitamente `nexfit-pro-db-1` |
| **Nunca** | Dos PostgreSQL en el mismo `PGDATA` |

### Comandos útiles

```bash
# Comprobar que no hay stack legacy
./scripts/deployment/disable-legacy-pro-stack.sh --check

# Deshabilitar stack legacy si reaparece
./scripts/deployment/disable-legacy-pro-stack.sh

# Verificar que el backend siempre va a una sola IP
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec -T backend \
  python manage.py shell -c "from django.db import connection; \
  c=connection.cursor(); c.execute('SELECT inet_server_addr()'); print(c.fetchone())"

# Arrancar producción (correcto)
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d
# o: sudo systemctl start nexfit-pro
```

## Systemd

El servicio `/etc/systemd/system/nexfit-pro.service` apunta a `/srv/mykaizenfit/pro` con `COMPOSE_PROJECT_NAME=nexfit-pro`. **No** arranca el stack `pro` legacy; ese solo aparece si alguien ejecuta compose sin el nombre de proyecto (ahora mitigado con `name: nexfit-pro` en el YAML).
