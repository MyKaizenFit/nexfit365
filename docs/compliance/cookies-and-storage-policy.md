# Cookies y almacenamiento

Estado de la página informativa: `IMPLEMENTED`. No hay documento de producción publicado.

`ANALYTICS_RUNTIME=NO`. `MARKETING_TRACKING_RUNTIME=NO`.

Se eliminó el banner que afirmaba analítica inexistente y la clave `nexfit365_cookie_consent`. Si el navegador todavía la tiene, se borra al cargar la aplicación. No se añade un CMP.

El almacenamiento que sigue en uso es el de la sesión: cookies de acceso, refresco y CSRF, más marcadores de sesión propios. No son cookies de analítica ni de publicidad.
