# Checklist de cutover

**TEMPLATE / NO APLICADO.** No ejecutar estos pasos hasta que se pida el cutover.

## DNS (NO crear ahora)

IP pública VPS comprobada en `eth0`: **45.136.19.91**. Sin AAAA (no hay IPv6 público en eth0).

| Nombre (Cloudflare) | Tipo | Destino | Proxy |
|---|---|---|---|
| `origin-nexfit` | A | `45.136.19.91` | **Proxied (naranja)** |
| `uploads` | A | `45.136.19.91` | **DNS only (gris)** |
| `metodosk.com` apex | existente | landing Cloudflare Pages/CNAME | **no tocar** |
| MX / SPF / DKIM / MailerLite | existentes | correo | **no tocar** |

FQDN resultantes: `origin-nexfit.metodosk.com`, `uploads.metodosk.com`.

No crear un CNAME que apunte `metodosk.com` al VPS.
No `metodosk.com/*` como Worker Route.

Orange en origin no causa loop: las routes del Worker son solo `metodosk.com/nexfit` y `metodosk.com/nexfit/*`. El `fetch()` del Worker va a `origin-nexfit.metodosk.com`.

## TLS (NO emitir ahora)

**origin-nexfit (recomendado): Cloudflare Origin Certificate**
- SSL/TLS mode del zone: Full (strict)
- Instalar en `/etc/ssl/cloudflare/origin-nexfit.{pem,key}`
- Los navegadores no confían ese cert si alguien salta Cloudflare; extra defensa junto al origin token
- No usar `certbot` en origin si se elige Origin CA

**uploads: Let's Encrypt** (DNS-only → HTTP-01 al VPS)

```
# Solo cuando DNS uploads ya sea gris y apunte aquí. No reutilizar certs dpdns.
sudo certbot certonly --webroot -w /var/www/html -d uploads.metodosk.com
```

Si hace falta LE también en origin (fallback, no recomendado con orange): poner origin en DNS-only temporalmente, emitir, luego volver a naranja.

Conservar:

- `/etc/letsencrypt/live/nexfit365.dpdns.org/`
- `/etc/letsencrypt/live/api.nexfit365.dpdns.org/`

## Cloudflare

1. Worker con el JS de referencia (`cloudflare-worker.js`).
2. Worker Secret `NEXFIT_ORIGIN_TOKEN` (mismo valor que el snippet Nginx local).
3. Routes **solo**:
   - `metodosk.com/nexfit`
   - `metodosk.com/nexfit/*`
4. No `metodosk.com/*`.
5. No `metodosk.com/nexfit*` (englobaría rutas no NexFit).
6. Origin: `https://origin-nexfit.metodosk.com`.
7. `uploads.metodosk.com`: DNS-only, **sin** Worker y **sin** proxy naranja.
8. Comprobar que `https://metodosk.com/` sigue siendo la landing.

## Nginx

Instalar `NGINX-TEMPLATE.conf` como site nuevo. Copiar `nexfit-origin-token-check.conf.template` a `/etc/nginx/snippets/nexfit-origin-token-check.conf` y sustituir `__NEXFIT_ORIGIN_TOKEN__`. No borrar los server blocks de `nexfit365.dpdns.org` / `api.nexfit365.dpdns.org`.

`nginx -t` y reload solo en el cutover.

Healthchecks Docker siguen yendo a `localhost:3000` (o `/nexfit/`); no pasan por este server block ni por el token.

## App

1. Añadir variables de `CUTOVER-ENV.md` a los `*.env.production` (incluye `PUBLIC_API_BASE_URL`).
2. Rebuild frontend (basePath se hornea en el build).
3. Deploy por el flujo habitual (`deploy.sh --background`), no `compose down`.
4. Healthcheck debe pegar a `/nexfit/` (ya soportado si `NEXT_PUBLIC_BASE_PATH=/nexfit`).

## Dominios viejos

- `https://nexfit365.dpdns.org` sigue vivo; 301 a `/nexfit` más adelante.
- `https://api.nexfit365.dpdns.org` sigue vivo por media histórica en BD.

## Orden de aplicación (NO ejecutar ahora)

El Worker **después** del deploy `/nexfit`. Si se enrutan routes antes, `metodosk.com/nexfit` pegaría a Next sin basePath → 404 público.

1. Crear secreto origin (archivo local + Worker Secret). No imprimir en shell history.
2. DNS `origin-nexfit` (naranja) y `uploads` (gris) → `45.136.19.91`
3. TLS: Origin CA en origin; LE en uploads
4. Instalar snippet token + site Nginx **nuevo** (`nexfit-metodosk.conf`). Conservar `nexfit365.conf`
5. `nginx -t` y reload
6. Validar origin/uploads **sin** Worker (API/media/token/uploads). Frontend `/nexfit` 404 hasta el deploy
7. Cambiar `*.env.production` (CUTOVER-ENV.md)
8. `./deploy.sh --background` (rebuild frontend `/nexfit`)
9. Revalidar origin incluyendo frontend
10. Desplegar Worker (código ya en CF, sin routes todavía está inerte)
11. Crear routes `metodosk.com/nexfit` y `metodosk.com/nexfit/*`
12. Smoke público `https://metodosk.com/nexfit/`
13. Observar logs Nginx + app 15–30 min
14. 301 de `nexfit365.dpdns.org` **más adelante**, no en el mismo corte

## Pruebas pre-cutover (tras DNS/TLS/Nginx, antes de Worker y env)

Token en archivo, no en argv:

```
# sudo tee /root/.nexfit-origin-token  (600)  — no hacer ahora
# TOKEN_FILE=/root/.nexfit-origin-token
# TOKEN=$(sudo cat "$TOKEN_FILE")
```

```
# DNS
dig +short origin-nexfit.metodosk.com A
dig +short uploads.metodosk.com A

# TLS
echo | openssl s_client -servername origin-nexfit.metodosk.com -connect origin-nexfit.metodosk.com:443 2>/dev/null | openssl x509 -noout -issuer -subject
echo | openssl s_client -servername uploads.metodosk.com -connect uploads.metodosk.com:443 2>/dev/null | openssl x509 -noout -issuer -subject

# Origin sin token → 403
curl -sI https://origin-nexfit.metodosk.com/nexfit/
curl -sI https://origin-nexfit.metodosk.com/

# Origin con token (API ya existe hoy; frontend /nexfit espera 404 hasta el deploy)
curl -sI -H "X-Nexfit-Origin-Token: $(sudo cat /root/.nexfit-origin-token)" https://origin-nexfit.metodosk.com/nexfit/api/health/
curl -sI -H "X-Nexfit-Origin-Token: $(sudo cat /root/.nexfit-origin-token)" https://origin-nexfit.metodosk.com/nexfit/media/progress_photos/
curl -sI -H "X-Nexfit-Origin-Token: $(sudo cat /root/.nexfit-origin-token)" https://origin-nexfit.metodosk.com/nexfit/media/profile_pictures/

# Uploads: OPTIONS ok; GET 403/404
curl -sI -X OPTIONS https://uploads.metodosk.com/nexfit/api/admin/exercises/00000000-0000-0000-0000-000000000000/upload-video/
curl -sI https://uploads.metodosk.com/
curl -sI https://uploads.metodosk.com/nexfit/api/health/
```

Esperado: landing `https://metodosk.com/` intacta en todo momento.

## Smoke tests (tras cutover)

- [ ] `https://metodosk.com/` landing intacta
- [ ] `https://metodosk.com/nexfit/` login NexFit
- [ ] `https://origin-nexfit.metodosk.com/nexfit/` **403** sin token
- [ ] `https://metodosk.com/nexfit/api/health/` 200
- [ ] Listado paginado: `next` contiene `https://metodosk.com/nexfit/api/` (no `https://metodosk.com/api/`)
- [ ] `https://metodosk.com/nexfit/manifest.webmanifest` scope `/nexfit/`
- [ ] Cookie `Path=/nexfit` `Domain=.metodosk.com`
- [ ] Vídeo de ejercicio nuevo: URL `https://metodosk.com/nexfit/media/...`
- [ ] Vídeo histórico: `https://api.nexfit365.dpdns.org/media/...` sigue 200
- [ ] Foto de progreso: URL firmada `/nexfit/api/progress/protected-media/` 200; `/nexfit/media/progress_photos/` 403
- [ ] Avatar: igual, 403 en `/nexfit/media/profile_pictures/`
- [ ] Receta con imagen de archivo: `/nexfit/media/recipes/...`
- [ ] Upload de vídeo >100MB vía `uploads.metodosk.com` (401 → refresh en API normal → retry; **sin** origin token)
- [ ] SW no controla `/`
