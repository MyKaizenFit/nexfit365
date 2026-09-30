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

Implementado: páginas públicas, bloqueo de publicación con marcadores, edad de producto 18 en el alta, retirada del banner de cookies, acuse de privacidad, aceptación de términos, puerta de reaceptación y centro de privacidad para esos dos documentos.

No implementado aquí, y sigue dentro de la fase 1: consentimiento de salud, bloqueo funcional de salud, borrado asíncrono y lápida de copias de seguridad. El cierre de cuentas ya existentes con menos de 18 años está diseñado y no está activo.
