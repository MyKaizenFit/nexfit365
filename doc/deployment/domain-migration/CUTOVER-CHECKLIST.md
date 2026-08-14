# Checklist de cutover

**TEMPLATE / NO APLICADO.** No ejecutar estos pasos hasta que se pida el cutover.

## DNS

| Nombre | Tipo | Destino | Proxy |
|---|---|---|---|
| `origin-nexfit.metodosk.com` | A | IP del VPS | **Proxied (naranja)**. Las Worker Routes son solo `metodosk.com/nexfit` y `metodosk.com/nexfit/*`, así que un `fetch()` al origin **no** reentra en el Worker. Orange da TLS/DDoS de Cloudflare. El hostname no debe usarse como URL pública: Nginx exige `X-Nexfit-Origin-Token`. |
| `uploads.metodosk.com` | A | IP del VPS | **DNS-only** (nunca proxy Cloudflare; evita el límite de body) |
| `metodosk.com` | existente | landing Cloudflare | no tocar el registro de la landing |

No crear un CNAME que apunte `metodosk.com` al VPS.

DNS-only en el origin también funcionaría para el `fetch()` del Worker, pero deja el VPS sin WAF de Cloudflare. No es necesario para evitar loops.

## Certificados (después de DNS)

En el VPS, cuando toque (no ahora):

```
certbot --nginx -d origin-nexfit.metodosk.com
certbot --nginx -d uploads.metodosk.com
```

No reutilizar el certificado de `nexfit365.dpdns.org`.

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
