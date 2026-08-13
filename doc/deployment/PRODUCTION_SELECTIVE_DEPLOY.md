# NEXFIT365 - Deploy Selectivo de Produccion

## Regla operativa

El deploy normal de produccion se ejecuta exclusivamente con:

```bash
./deploy.sh
```

Para validar sin cambios:

```bash
./deploy.sh --dry-run
```

Para lanzarlo desde una sesion SSH fragil:

```bash
./deploy.sh --background
./deploy.sh --status
```

## Flujo normal

1. Validacion de dependencias y configuracion.
2. Activacion de modo mantenimiento si el script local puede hacerlo.
3. Snapshot rollback de commit e imagenes actuales.
4. Backup predeploy de PostgreSQL y verificacion con `pg_restore --list`.
5. Build secuencial de backend.
6. Actualizacion selectiva de backend con `up -d --no-deps backend`.
7. Migraciones Django desde `deploy.sh`.
8. `collectstatic` desde `deploy.sh`.
9. Actualizacion selectiva de `celery_worker`.
10. Build secuencial de frontend.
11. Actualizacion selectiva de frontend con `up -d --no-deps frontend`.
12. Healthchecks completos.
13. Salida de mantenimiento.

PostgreSQL, Redis y `db-backup` permanecen activos durante un deploy normal.

## Comandos que no son rutina de deploy

No usar como procedimiento normal de deploy:

```bash
docker compose down
docker compose restart
docker compose up -d --force-recreate
systemctl restart nexfit-pro
systemctl stop nexfit-pro
systemctl reload nexfit-pro
```

## Bootstrap

`./deploy.sh --bootstrap` existe solo para inicializacion explicita o recuperacion
controlada. No sustituye al deploy rutinario.

La unit `nexfit-pro.service` debe considerarse bootstrap seguro. No debe destruir
la red/stack en `stop`, ni forzar recreaciones globales en `reload`.

## Rollback

Antes de cada deploy se debe conservar:

- commit Git anterior;
- imagen backend anterior;
- imagen frontend anterior;
- imagen Celery anterior;
- backup PostgreSQL predeploy verificado.

Rollback de imagen no equivale a rollback de base de datos. Si el deploy aplico
migraciones, revisar primero si son reversibles. No restaurar PostgreSQL de forma
automatica sin decision humana explicita.
