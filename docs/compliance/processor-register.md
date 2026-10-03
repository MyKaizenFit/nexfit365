# Encargados

Contratos no encontrados en el repositorio. No se da por firmado ningún DPA.

| NAME | ROLE | DATA | PURPOSE | COUNTRY | DPA_STATUS | TRANSFER_STATUS | CONFIDENCE |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Contabo | Alojamiento del servidor | La base, los ficheros y el tráfico que llega al origen | Prestar el servicio | Alemania, según la salida de red del propio servidor | No consta en el repo. `[HOSTING_DPA]` | No evaluada | Alta para el proveedor y el país de salida. La ciudad no se afirma |
| Cloudflare | Proxy y TLS delante del origen | IP, cabeceras y el contenido que atraviesa el proxy | Entregar `metodosk.com` | Borde según el visitante. Los DNS son de Cloudflare y el proxy está activo | No consta en el repo | No evaluada | Alta de que el proxy está activo. El colo `FRA` de una petición es el borde, no el origen |
| Google SMTP | Envío de correo | Destinatario, asunto y cuerpo del mensaje que envía el producto | Avisos de cuenta y operación | `[SMTP_REGION]` | No consta | No evaluada | Alta de que el host es `smtp.gmail.com:587` con TLS y el buzón es `@gmail.com`. No es Google Workspace de dominio propio |
| Google Drive | Vídeos e imágenes incrustados, y lecturas de catálogo desde el servidor | El navegador pide el archivo al abrirlo. El servidor puede leer una carpeta al importar ejercicios | Mostrar el vídeo o la imagen | No determinada | No consta | No evaluada | Alta del mecanismo. No de un contrato |
| YouTube | Reproductor incrustado | El navegador carga `youtube-nocookie.com` solo si el vídeo guardado es de YouTube | Reproducir ese vídeo | No determinada | No consta | No evaluada | Alta de la ruta de reproducción |
| Servicio push del navegador | Entrega Web Push | Extremo de suscripción y aviso cifrado | Aviso push si la persona lo activó | Depende del navegador | No consta | No evaluada | Alta de VAPID propio. No hay OneSignal ni un SaaS de push |

Postgres, Redis y Nginx corren en el mismo servidor. No son encargados distintos por ser la tecnología.

Sentry está en el código y apagado: `SENTRY_DSN` no está definido. No es un encargado activo.

No hay encargado de analítica ni de publicidad. `ANALYTICS_RUNTIME=NO`. `MARKETING_TRACKING_RUNTIME=NO`. `MARKETING_AT_LAUNCH=OFF`.

Las copias de la base están en el mismo servidor. Borrar en la base en uso no borra esas copias. `BACKUP_RESURRECTION_FULL_PROTECTION=PLANNED_PHASE_4`.
