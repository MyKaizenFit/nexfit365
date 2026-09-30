# Cumplimiento NexFit365

Estos textos son borradores internos. No son documentos legales publicados.

Estado de cada apartado:

- `IMPLEMENTED`: comportamiento presente en el código de esta rama.
- `PLANNED`: decidido, todavía no construido.
- `CLIENT_INPUT_REQUIRED`: falta un dato del titular. No se publica mientras siga así.

Los únicos huecos permitidos son:

`[RESPONSABLE_LEGAL]` `[NIF_CIF]` `[DOMICILIO]` `[EMAIL_PRIVACIDAD]` `[DATOS_REGISTRALES]` `[HOSTING_PROVIDER]` `[HOSTING_COUNTRY]` `[HOSTING_DPA]` `[SMTP_ACCOUNT_TYPE]` `[SMTP_REGION]`

`PRODUCTION_LEGAL_DOCUMENTS_CREATED=NO`. Ninguna migración carga estos textos en `LegalDocument`.

## Esta entrega

Implementado: páginas públicas, bloqueo de publicación con marcadores, edad de producto 18 en el alta, retirada del banner de cookies, acuse de privacidad, aceptación de términos, puerta de reaceptación, centro de privacidad y consentimiento de salud por finalidad. Sin un aviso de salud activo, esa puerta no cambia el uso actual. Retirar el consentimiento detiene el uso nuevo y deja un trabajo pendiente. `PHASE 1D-C CLEANUP=PLANNED_NOT_IMPLEMENTED`.

No implementado: borrado de datos de salud ya guardados y lápida de copias de seguridad. El cierre de cuentas ya existentes con menos de 18 años está diseñado y no está activo.

`RETIRED_QA_LEGAL_DOCUMENTS`: `qa-1da-p1`, `qa-1da-t1`, `qa-1da-t2`. Están inactivos, sin eventos, y no se muestran porque la API solo devuelve documentos activos.
