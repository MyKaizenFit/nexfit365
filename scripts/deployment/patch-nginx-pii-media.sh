#!/usr/bin/env bash
# Bloquea /media/progress_photos/ y /media/profile_pictures/ en nginx (PII).
# Uso (desde terminal del host con sudo):
#   bash scripts/deployment/patch-nginx-pii-media.sh
set -euo pipefail

NGINX_CONF="${NGINX_CONF:-/etc/nginx/sites-enabled/nexfit365.conf}"

if grep -q 'location /media/profile_pictures/' "$NGINX_CONF"; then
  echo "Nginx ya bloquea profile_pictures — nada que hacer."
  exit 0
fi

export NGINX_CONF
python3 <<'PY'
from pathlib import Path
import os

conf = Path(os.environ["NGINX_CONF"])
text = conf.read_text()
needle = "    location /media/ {"
block = """    # PII media: signed URLs only (/api/progress/protected-media/)
    location /media/progress_photos/ {
        return 403;
    }

    location /media/profile_pictures/ {
        return 403;
    }

    location /media/ {"""
if "location /media/profile_pictures/" in text:
    print("already patched")
elif needle not in text:
    raise SystemExit("No se encontró location /media/ en nginx")
else:
    conf.write_text(text.replace(needle, block, 1))
    print(f"Parcheado {conf}")
PY

if command -v nginx >/dev/null 2>&1; then
  nginx -t
  systemctl reload nginx
elif [ -x /usr/sbin/nginx ]; then
  /usr/sbin/nginx -t
  systemctl reload nginx
else
  echo "Parche aplicado; recarga nginx manualmente (sudo systemctl reload nginx)"
fi
echo "OK — PII media bloqueado en nginx"
