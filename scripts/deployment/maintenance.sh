#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-/srv/mykaizenfit/pro}"
MAINTENANCE_DIR="${MAINTENANCE_DIR:-$ROOT_DIR/data/maintenance}"
NGINX_CONF="${NGINX_CONF:-/etc/nginx/sites-enabled/nexfit365.conf}"
NGINX_SERVER_SNIPPET="${NGINX_SERVER_SNIPPET:-/etc/nginx/snippets/nexfit-maintenance-server.conf}"
NGINX_LOCATION_SNIPPET="${NGINX_LOCATION_SNIPPET:-/etc/nginx/snippets/nexfit-maintenance-location.conf}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAGE_TEMPLATE="$SCRIPT_DIR/maintenance-page.html"
SERVER_SNIPPET_TEMPLATE="$SCRIPT_DIR/nexfit-maintenance-server.conf"
LOCATION_SNIPPET_TEMPLATE="$SCRIPT_DIR/nexfit-maintenance-location.conf"

usage() {
  cat <<EOF
Uso:
  $0 install
  $0 on
  $0 off
  $0 status
  $0 patch-nginx

Ejemplos:
  $0 install
  $0 patch-nginx
  $0 on
  $0 off

Notas:
  - install copia HTML/snippets a rutas de produccion.
  - patch-nginx inserta los include necesarios en $NGINX_CONF si faltan.
  - on/off activan o desactivan el flag de mantenimiento y recargan Nginx.
EOF
}

render_page() {
  mkdir -p "$MAINTENANCE_DIR"
  install -m 0644 "$PAGE_TEMPLATE" "$MAINTENANCE_DIR/index.html"
  if [ -f "$ROOT_DIR/frontend/public/icono.png" ]; then
    install -m 0644 "$ROOT_DIR/frontend/public/icono.png" "$MAINTENANCE_DIR/icono.png"
  fi
}

reload_nginx() {
  local nginx_bin="${NGINX_BIN:-}"

  if [ -z "$nginx_bin" ]; then
    nginx_bin="$(command -v nginx || true)"
  fi
  if [ -z "$nginx_bin" ] && [ -x /usr/sbin/nginx ]; then
    nginx_bin="/usr/sbin/nginx"
  fi
  if [ -z "$nginx_bin" ] && [ -x /usr/bin/nginx ]; then
    nginx_bin="/usr/bin/nginx"
  fi

  if [ -z "$nginx_bin" ]; then
    echo "No se encontro el binario de nginx. Define NGINX_BIN o agrega nginx al PATH." >&2
    return 1
  fi

  if [ "$(id -u)" -eq 0 ]; then
    "$nginx_bin" -t
    systemctl reload nginx
  elif sudo -n true >/dev/null 2>&1; then
    sudo "$nginx_bin" -t
    sudo systemctl reload nginx
  else
    echo "No hay permisos para validar/recargar nginx sin sudo. Ejecuta con sudo o habilita sudo para nginx -t y systemctl reload nginx." >&2
    return 1
  fi
}

install_files() {
  mkdir -p "$MAINTENANCE_DIR"
  install -m 0644 "$SERVER_SNIPPET_TEMPLATE" "$NGINX_SERVER_SNIPPET"
  install -m 0644 "$LOCATION_SNIPPET_TEMPLATE" "$NGINX_LOCATION_SNIPPET"
  render_page
  echo "Archivos de mantenimiento instalados."
}

patch_nginx() {
  python3 - "$NGINX_CONF" "$NGINX_SERVER_SNIPPET" "$NGINX_LOCATION_SNIPPET" <<'PY'
from pathlib import Path
import sys

conf_path = Path(sys.argv[1])
server_snippet = sys.argv[2]
location_snippet = sys.argv[3]

text = conf_path.read_text()
if server_snippet in text and location_snippet in text:
    print("Nginx ya tiene los includes de mantenimiento.")
    raise SystemExit(0)

needle_server = "    location / {\n        proxy_pass http://127.0.0.1:3000;"
replacement_server = (
    f"    include {server_snippet};\n\n"
    "    location / {\n"
    f"        include {location_snippet};\n"
    "        proxy_pass http://127.0.0.1:3000;"
)

if needle_server not in text:
    raise SystemExit("No se encontro el bloque frontend HTTPS esperado para insertar mantenimiento.")

backup_path = conf_path.with_suffix(conf_path.suffix + ".backup-maintenance")
backup_path.write_text(text)
conf_path.write_text(text.replace(needle_server, replacement_server, 1))
print(f"Nginx parcheado. Backup: {backup_path}")
PY
  reload_nginx
}

turn_on() {
  render_page
  touch "$MAINTENANCE_DIR/maintenance.on"
  if ! reload_nginx; then
    echo "Aviso: no se pudo recargar nginx automaticamente. Si no ves el cambio al instante, ejecuta: sudo systemctl reload nginx" >&2
  fi
  echo "Mantenimiento activado."
}

turn_off() {
  rm -f "$MAINTENANCE_DIR/maintenance.on"
  if ! reload_nginx; then
    echo "Aviso: no se pudo recargar nginx automaticamente. Si no ves el cambio al instante, ejecuta: sudo systemctl reload nginx" >&2
  fi
  echo "Mantenimiento desactivado."
}

status() {
  if [ -f "$MAINTENANCE_DIR/maintenance.on" ]; then
    echo "Mantenimiento: ACTIVADO"
  else
    echo "Mantenimiento: desactivado"
  fi
  echo "Pagina: $MAINTENANCE_DIR/index.html"
  echo "Nginx: $NGINX_CONF"
}

case "${1:-}" in
  install)
    install_files
    ;;
  patch-nginx)
    patch_nginx
    ;;
  on)
    turn_on
    ;;
  off)
    turn_off
    ;;
  status)
    status
    ;;
  -h|--help|help|"")
    usage
    ;;
  *)
    echo "Comando no reconocido: $1" >&2
    usage
    exit 1
    ;;
esac
