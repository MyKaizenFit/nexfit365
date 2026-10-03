# Cookies y almacenamiento

Estado de la página informativa: `IMPLEMENTED`. No hay documento de producción publicado.

`COOKIE_BANNER=NONE`. `ANALYTICS_RUNTIME=NO`. `MARKETING_TRACKING_RUNTIME=NO`. `COOKIE_STORAGE_INVENTORY_COMPLETE=YES` respecto del código desplegado en `68da283`.

Se eliminó el banner que afirmaba analítica inexistente. La clave antigua `nexfit365_cookie_consent` ya no se escribe. Si el navegador todavía la tiene, se borra al cargar. No se añade un CMP.

Todo lo que sigue es necesario para la sesión, una preferencia que la persona activa, o caché técnica de la aplicación. No hay cookies de analítica ni de publicidad.

## Cookies

| Nombre | Finalidad | Duración | Notas |
| --- | --- | --- | --- |
| `accessToken` | Sesión | 120 minutos | HttpOnly. Dominio `.metodosk.com`, ruta `/nexfit` |
| `refreshToken` | Renovar la sesión | 7 días si la persona pide recordar; si no, la misma vida que el acceso | HttpOnly |
| `csrfToken` | Comprobar las peticiones que modifican datos | Igual que el refresco | La puede leer el propio sitio. No es analítica |

`JWT_COOKIE_SECURE` no está fijado en el entorno. En producción, sin depuración, las cookies salen con `Secure`.

## localStorage

| Clave | Finalidad |
| --- | --- |
| `remember_session`, `remembered_email` | Recordar el correo en el acceso, solo si la persona lo pide |
| `initial_form_completed`, `form_version` | Saber si el alta inicial de esta instalación ya se completó |
| `auth_logout_in_progress` | Evitar carreras al cerrar sesión |
| `nexfit365_app_version` | Recargar si cambia la versión publicada |
| `nexfit_notification_settings` | Preferencias locales de aviso |
| `nexfit_energy_score_AAAA-MM-DD` | Puntuación de energía de ese día en el widget |
| `active_workout_<día>_<fecha>` | Borrador de la sesión de entrenamiento abierta |
| `workout_substitutes_<día>_<fecha>` | Sustituciones de esa sesión |
| `workout_completed_<día>_<fecha>` | Ejercicios marcados ese día |
| `meal-selections-<fecha>` | Selección de comidas de ese día |
| `coaching-cta-hidden-until:global` y `:coaching-page` | Ocultar un aviso hasta una fecha |
| `rule_<id>_last_triggered` | Marca local de una regla de avisos del panel de administración |

`user_profile` ya no se escribe. El alta y el cierre de sesión lo borran si todavía existe.

## sessionStorage

| Clave | Finalidad |
| --- | --- |
| `birthday-toast-<id>-<fecha>` | No repetir el aviso de cumpleaños en esa pestaña |
| `dashboard_error_auto_recovered` | Contar un reintento automático tras un fallo de la pantalla |

## Service worker

Cachés `nexfit365-v1.9`, `nexfit365-runtime-v1.9` y `nexfit365-images-v1.9`. Guardan el arranque de la aplicación, respuestas de red e imágenes. No son analítica. El límite de imágenes está en el propio script.

## Push

La suscripción del navegador no es una cookie. Se crea solo si la persona activa el aviso push. El servidor guarda el extremo y las claves de esa suscripción. Ver el registro de encargados: el servicio push lo elige el navegador.
