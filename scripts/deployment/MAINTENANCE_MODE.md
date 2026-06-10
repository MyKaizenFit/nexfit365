# Modo mantenimiento NexFit

Pagina estatica para cubrir despliegues o migraciones largas sin depender de
Next.js ni Django.

## Primera instalacion

Ejecutar una sola vez en produccion:

```bash
cd /srv/mykaizenfit/pro
sudo scripts/deployment/maintenance.sh install
sudo scripts/deployment/maintenance.sh patch-nginx
```

`install` copia:

- `/srv/mykaizenfit/pro/data/maintenance/index.html`
- `/etc/nginx/snippets/nexfit-maintenance-server.conf`
- `/etc/nginx/snippets/nexfit-maintenance-location.conf`

`patch-nginx` inserta los `include` necesarios en
`/etc/nginx/sites-enabled/nexfit365.conf`, valida Nginx con `nginx -t` y recarga
el servicio.

Mientras no exista el flag `maintenance.on`, la web funciona normal.

## Activar

Para poner la app en mantenimiento:

```bash
cd /srv/mykaizenfit/pro
sudo scripts/deployment/maintenance.sh on
```

## Desactivar

```bash
cd /srv/mykaizenfit/pro
sudo scripts/deployment/maintenance.sh off
```

## Comprobar estado

```bash
cd /srv/mykaizenfit/pro
sudo scripts/deployment/maintenance.sh status
```

## Preview local

Sin tocar produccion:

```bash
ROOT_DIR=/tmp/nexfit-maint-test \
NGINX_SERVER_SNIPPET=/tmp/nexfit-maint-test/server.conf \
NGINX_LOCATION_SNIPPET=/tmp/nexfit-maint-test/location.conf \
scripts/deployment/maintenance.sh install
```

Luego abrir:

```text
/tmp/nexfit-maint-test/data/maintenance/index.html
```
