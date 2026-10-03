# Decisiones

## 2026-09-30

- Edad de producto: 18. No es un mínimo del RGPD.
- La fecha de nacimiento verifica la edad siempre. El cumpleaños es un aviso opcional de servicio, base propuesta 6.1.f, apagado hasta que la persona lo active. No es marketing ni consentimiento de salud.
- La retirada de salud no usa el artículo 12.3 como plazo de conservación. El objetivo interno de limpieza es 24 horas. El borrado de la base en uso está implementado. La protección completa de copias restauradas queda para PHASE 4.
- Los registros legales se apoyan en 6.1.f. El 17.3.e no es base autónoma.
- La cláusula de fuero no designa un juzgado ni aparta fueros imperativos de consumo.
- No se publican documentos con marcadores. No se siembran documentos reales por migración.
- Marketing en el lanzamiento: apagado.
- DPO: necesidad no demostrada. Sin umbral numérico.
- La puerta para cuentas ya menores de 18 no se activa hasta revisar el recuento.

## 2026-10-03

- Contabo aloja el servidor. La salida de red está en Alemania. El DPA no está en el repositorio.
- Cloudflare resuelve el DNS y hace de proxy. El borde de una petición no es el país del origen.
- El correo sale por `smtp.gmail.com:587` con una cuenta `@gmail.com`. No es Google Workspace. La región de la cuenta no consta.
- Sentry no tiene DSN. No está activo.
- No hay analítica ni píxel de marketing en el runtime.
- YouTube se incrusta con `youtube-nocookie` al abrir un vídeo de YouTube. Drive se carga al abrir un vídeo o una imagen de Drive, y el servidor puede leer Drive al importar el catálogo.
- El push es Web Push con claves VAPID propias, solo si la persona lo activa. El servicio lo elige el navegador.
- `EXPECTED_AUTHORIZATION_403_GENERATES_ERROR_REPORT=YES`. Esos informes guardan el correo y el cuerpo de la petición. Las contraseñas y los tokens se tachan. El peso y otros campos de salud del cuerpo no. `FUTURE_ERROR_HARDENING_BACKLOG` para PHASE 16: no tratar el 403 esperado como incidente y no guardar correo ni cuerpo sanitario.
