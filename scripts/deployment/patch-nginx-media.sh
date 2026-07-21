#!/usr/bin/env bash
# Añade location /media/ al bloque HTTPS de api.nexfit365.dpdns.org en nginx.
set -euo pipefail

NGINX_CONF="${NGINX_CONF:-/etc/nginx/sites-enabled/nexfit365.conf}"
MEDIA_ROOT="${MEDIA_ROOT:-/srv/mykaizenfit/pro/data/media}"

if grep -q 'location /media/' "$NGINX_CONF"; then
  echo "Nginx ya tiene location /media/ — nada que hacer."
  exit 0
fi

export NGINX_CONF MEDIA_ROOT

python3 <<'PY'
from pathlib import Path
import os

conf = Path(os.environ["NGINX_CONF"])
media_root = os.environ["MEDIA_ROOT"]
text = conf.read_text()
needle = "    client_max_body_size 300M;\n\n    location / {"
block = f"""    client_max_body_size 300M;

    location /media/progress_photos/ {{
        return 403;
    }}

    location /media/ {{
        alias {media_root}/;
        expires 30d;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public";
    }}

    location / {{"""

if needle not in text:
    raise SystemExit("No se encontró el bloque del API en nginx para parchear.")
conf.write_text(text.replace(needle, block, 1))
print(f"Parcheado {conf}")
PY

nginx -t
systemctl reload nginx
echo "Nginx recargado con soporte directo para /media/"
