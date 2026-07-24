# Backups PostgreSQL: `\restrict` / `\unrestrict` son normales

**Estado:** el análisis anterior que trataba estas líneas como “inyección maliciosa” está **retractado**.  
Copia histórica (incorrecta): [`doc/archive/BACKUP_SECURITY_ISSUE.retracted.md`](doc/archive/BACKUP_SECURITY_ISSUE.retracted.md).

## Qué son

En dumps de texto (`pg_dump` sin formato custom), PostgreSQL 15.14+ puede emitir metacomandos:

```text
\restrict <token>
...
\unrestrict <token>
```

Forman parte del modo restringido de `psql`: mitigan la ejecución de otros metacomandos peligrosos al restaurar un dump. No indican compromiso del servidor ni corrupción de datos.

Documentación: [psql — PostgreSQL](https://www.postgresql.org/docs/current/app-psql.html).

## Qué no hacer

**No** filtrar ni borrar esas líneas con `grep -v` (ni equivalentes). Quitarlas reduce la protección que PostgreSQL añadió a propósito.

## Cómo hace backup este proyecto

Los backups operativos usan formato **custom**, no SQL plano:

- `scripts/auto-backup.sh` — `pg_dump --format=custom`
- `scripts/verify-backup.sh` — restaura el `.dump` en una base temporal y comprueba tablas
- `scripts/restore.sh` — restauración operativa con `pg_restore`

Si alguna vez restauras un dump SQL plano antiguo, usa un `psql` compatible y deja `\restrict` / `\unrestrict` intactos.
