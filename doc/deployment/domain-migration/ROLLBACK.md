# Rollback

**TEMPLATE / NO APLICADO.**

Sin `git reset --hard`, sin force push, sin `docker compose down`.

El dominio antiguo permanece operativo durante toda la migración.

## 1. Quitar el Worker Route

En Cloudflare, desactivar o borrar las routes:

- `metodosk.com/nexfit`
- `metodosk.com/nexfit/*`

`https://metodosk.com/` no se toca. El tráfico NexFit deja de llegar al VPS por el host nuevo. El origin queda 403 sin token; no es una URL pública alternativa.

## 2. Restaurar variables de dominio

Volver a los valores actuales (dominio viejo) en:

- `docker/backend.env.production`
- `frontend/docker.env.production`

En concreto:

```
NEXT_PUBLIC_BASE_PATH=   (vacío / ausente)
NEXT_PUBLIC_API_URL=https://api.nexfit365.dpdns.org/api
NEXT_PUBLIC_FRONTEND_URL=https://nexfit365.dpdns.org
FRONTEND_URL=https://nexfit365.dpdns.org
JWT_COOKIE_DOMAIN=.nexfit365.dpdns.org
JWT_COOKIE_PATH=/
PUBLIC_MEDIA_BASE_URL=https://api.nexfit365.dpdns.org
PUBLIC_API_BASE_URL=   (vacío / ausente, o https://api.nexfit365.dpdns.org/api)
CORS/CSRF: https://nexfit365.dpdns.org
```

Rebuild frontend si se cambió `NEXT_PUBLIC_BASE_PATH`.

## 3. Volver a la revisión anterior

Usar el flujo seguro del proyecto (`deploy.sh` sobre `main` ya desplegado, o la imagen/revisión previa). No recrear el stack con `compose down`.

## 4. Nginx / DNS nuevos

Se pueden dejar instalados e inactivos (sin Worker Route no reciben tráfico de la landing). No hace falta borrar certificados ni DNS en el rollback urgente.

## 5. API antigua

`https://api.nexfit365.dpdns.org` no se apaga. Las URLs de media históricas en BD siguen resolviendo.
