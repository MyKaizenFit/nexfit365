# Cumplimiento NexFit365

Estos textos son borradores internos. No son documentos legales publicados.

Estado de cada apartado:

- `IMPLEMENTED`: comportamiento presente en el código de esta rama.
- `PLANNED`: decidido, todavía no construido.
- `CLIENT_INPUT_REQUIRED`: falta un dato del titular. No se publica mientras siga así.

Los únicos huecos permitidos son:

Siguen sin constar: `[RESPONSABLE_LEGAL]` `[NIF_CIF]` `[DOMICILIO]` `[EMAIL_PRIVACIDAD]` `[DATOS_REGISTRALES]` `[HOSTING_DPA]` `[SMTP_REGION]`.

Verificado: alojamiento Contabo en Alemania, proxy Cloudflare, correo Gmail `@gmail.com` (no Workspace), Sentry apagado, sin analítica ni marketing. Los textos candidatos están en `final-texts.md` y no están publicados.

`PRODUCTION_LEGAL_DOCUMENTS_CREATED=NO`. Ninguna migración carga estos textos en `LegalDocument`.

## Esta entrega

Implementado: páginas públicas, bloqueo de publicación con marcadores, edad de producto 18 en el alta, retirada del banner de cookies, acuse de privacidad, aceptación de términos, puerta de reaceptación, centro de privacidad, consentimiento de salud por finalidad y borrado en la base en uso de la finalidad retirada. `LIVE_DB_HEALTH_CLEANUP=IMPLEMENTED`. `BACKUP_RESURRECTION_FULL_PROTECTION=PLANNED_PHASE_4`. Sin un aviso de salud activo, esa puerta no cambia el uso actual. Las copias antiguas no se han limpiado.

No implementado: borrado de datos de salud ya guardados y lápida de copias de seguridad. El cierre de cuentas ya existentes con menos de 18 años está diseñado y no está activo.

`ERROR_REPORT_PRIVACY_HARDENING=IMPLEMENTED`. El informe automático no guarda cuerpo, correo ni query. El formato antiguo se borra; no se reescribe. `ERROR_REPORT_RETENTION_DAYS=90` es `INTERNAL_RETENTION_POLICY`, no un plazo del RGPD. PHASE 16 queda solo para `RESIDUAL_ERROR_AND_PII_HARDENING`. Las copias antiguas del servidor pueden seguir teniendo esos ficheros. `OLD_BACKUPS_MAY_CONTAIN_DELETED_ERROR_REPORTS=YES`. `PHASE4_ACTION_REQUIRED=YES`.

`RETIRED_QA_LEGAL_DOCUMENTS`: `qa-1da-p1`, `qa-1da-t1`, `qa-1da-t2`. Están inactivos, sin eventos, y no se muestran porque la API solo devuelve documentos activos.
