# Variables de cutover

**TEMPLATE / NO APLICADO.** No copiar todavía a:

- `docker/backend.env.production`
- `frontend/docker.env.production`

## Frontend

```
NEXT_PUBLIC_BASE_PATH=/nexfit
NEXT_PUBLIC_API_URL=https://metodosk.com/nexfit/api
NEXT_PUBLIC_UPLOAD_API_URL=https://uploads.metodosk.com/nexfit/api
NEXT_PUBLIC_FRONTEND_URL=https://metodosk.com/nexfit
```

Requiere rebuild de la imagen frontend (`NEXT_PUBLIC_*` se inlinan en el build).

## Backend

```
FRONTEND_URL=https://metodosk.com/nexfit
JWT_COOKIE_DOMAIN=.metodosk.com
JWT_COOKIE_PATH=/nexfit
PUBLIC_MEDIA_BASE_URL=https://metodosk.com/nexfit
PUBLIC_API_BASE_URL=https://metodosk.com/nexfit/api
CORS_ALLOWED_ORIGINS=https://metodosk.com,https://nexfit365.dpdns.org,https://www.nexfit365.dpdns.org
CSRF_TRUSTED_ORIGINS=https://metodosk.com,https://nexfit365.dpdns.org,https://www.nexfit365.dpdns.org
```

CORS/CSRF usan ORIGIN: `https://metodosk.com` **sin** `/nexfit`.

Los orígenes viejos se mantienen durante la transición/rollback.

Hoy, si `PUBLIC_API_BASE_URL` no está definido, la paginación usa `request.build_absolute_uri()` (comportamiento actual). No hace falta tocarlo hasta el cutover.

## ALLOWED_HOSTS mínimos a añadir

Nginx del origin fuerza `Host: metodosk.com` hacia Next y Django. Nginx de uploads conserva `Host: uploads.metodosk.com`.

Añadir solo:

```
metodosk.com
uploads.metodosk.com
```

Conservar los actuales (`api.nexfit365.dpdns.org`, `nexfit365.dpdns.org`, `www.nexfit365.dpdns.org`, IPs, localhost, `backend`).

**No** añadir `origin-nexfit.metodosk.com`: Django no debe ver ese Host.

**No** añadir `www.metodosk.com` en el primer cutover: el Worker solo cubre `metodosk.com/nexfit`.

## PUBLIC_MEDIA_BASE_URL

```
PUBLIC_MEDIA_BASE_URL=https://metodosk.com/nexfit
```

No incluir `/media`. Distinto de `PUBLIC_API_BASE_URL`.

## PUBLIC_API_BASE_URL

Prefijo público de la API, **incluyendo** `/api`. Lo usan `next`/`previous` de DRF.

```
PUBLIC_API_BASE_URL=https://metodosk.com/nexfit/api
```

Hoy (si se quisiera alinear sin cutover, no aplicar):

```
PUBLIC_API_BASE_URL=https://api.nexfit365.dpdns.org/api
```

No reutilizar `PUBLIC_MEDIA_BASE_URL` para esto.

## FORCE_SCRIPT_NAME

Sigue **sin** activar. La paginación ya no depende de ello.

## Origin token

No es una variable de los `*.env.production` de Docker.

- Cloudflare Worker Secret: `NEXFIT_ORIGIN_TOKEN`
- Nginx snippet local: sustituir `__NEXFIT_ORIGIN_TOKEN__` (nunca en Git)
