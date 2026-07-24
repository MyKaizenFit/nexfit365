# Backup y restauración

Procedimiento operativo de NexFit365 (dumps PostgreSQL).

## Qué se genera

| Pieza | Script | Formato | Cuándo |
|-------|--------|---------|--------|
| Dump canónico | `scripts/auto-backup.sh` | `pg_dump --format=custom` (`.dump`) + SHA256 + globals | Diario 02:00 (cron) |
| Verificación | `scripts/verify-backup.sh` | Restaura `latest.dump` en DB temporal y cuenta tablas | Domingos 05:00 |
| Restore operativo | `scripts/restore.sh` | `pg_restore` sobre el contenedor de BD | Manual / incidente |

Instalación de crons: `sudo ./scripts/install-cron-maintenance.sh`  
Definición: `scripts/cron/nexfit-pro-maintenance`

## Verificar un backup ahora

```bash
./scripts/verify-backup.sh
# o un fichero concreto:
./scripts/verify-backup.sh /srv/mykaizenfit/pro/backups/latest.dump
```

Éxito: log en `backups/backup-verify.log` con `VERIFICACION FINALIZADA EXITOSAMENTE`.  
La DB temporal `backup_verify_*` se elimina al salir.

## Restaurar

Seguir `scripts/restore.sh` y `RECOVERY.md`. Preferir siempre el dump **custom** + `pg_restore`.

## Dumps SQL planos y `\restrict` / `\unrestrict`

Si alguna vez usas un dump de texto, PostgreSQL puede incluir `\restrict` / `\unrestrict`.  
Son metacomandos **legítimos** de seguridad. **No** los filtres con `grep`.  
Ver `BACKUP_SECURITY_ISSUE.md` (corrección) y no el archivo archivado retractado.

## Follow-up (fuera de este doc)

- WAL / PITR para RPO más fino en producción.
- Alertar si `backup-verify.log` lleva >8 días sin éxito.
