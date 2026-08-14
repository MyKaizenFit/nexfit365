# Migración de dominio NexFit365 → metodosk.com/nexfit

**Estado: TEMPLATE / NO APLICADO**

Esta carpeta documenta el cutover. Nada de aquí se instala hasta que se pida explícitamente.

| Archivo | Contenido |
|---|---|
| [CUTOVER-ENV.md](./CUTOVER-ENV.md) | Variables exactas, paginación, ALLOWED_HOSTS mínimos |
| [NGINX-TEMPLATE.conf](./NGINX-TEMPLATE.conf) | Origen + uploads (no instalado) |
| [nexfit-origin-token-check.conf.template](./nexfit-origin-token-check.conf.template) | Gate del origin (`__NEXFIT_ORIGIN_TOKEN__`) |
| [cloudflare-worker.js](./cloudflare-worker.js) | Worker de referencia |
| [CUTOVER-CHECKLIST.md](./CUTOVER-CHECKLIST.md) | DNS, Worker, origin, smoke tests |
| [ROLLBACK.md](./ROLLBACK.md) | Rollback sin `reset --hard` ni `compose down` |

La landing `https://metodosk.com/` vive en Cloudflare, no en este VPS. Nginx no debe servir `/`.

TLS previsto: Origin Certificate en `origin-nexfit`; Let's Encrypt en `uploads`. IP VPS: `45.136.19.91`.
