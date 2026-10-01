# Encargados

| Encargado | Servicio | Situación |
| --- | --- | --- |
| [HOSTING_PROVIDER] | Alojamiento en [HOSTING_COUNTRY] | CLIENT_INPUT_REQUIRED. Contrato: [HOSTING_DPA] |
| Correo saliente | [SMTP_ACCOUNT_TYPE], región [SMTP_REGION] | CLIENT_INPUT_REQUIRED. No se da por hecho un encargado hasta conocer el tipo de cuenta |
| Base de datos, Redis, Nginx | Infraestructura propia del responsable | No son encargados distintos por el solo hecho de ser la tecnología |

No hay encargado de analítica ni de publicidad.

Las copias de la base siguen el ciclo del alojamiento. Borrar en la base en uso no borra esas copias. PHASE 4 tiene que exportar `PrivacySuppressionRecord` fuera de las copias restaurables y reaplicarlo tras una restauración. Eso no está construido.
