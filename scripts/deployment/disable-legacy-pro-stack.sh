#!/bin/bash
# disable-legacy-pro-stack.sh
#
# Detiene y deshabilita el stack Docker legacy "pro" (pro-db-1, pro-celery_worker, …)
# que compartía red/volumen con nexfit-pro y provocaba split-brain en PostgreSQL.
#
# Uso:
#   ./scripts/deployment/disable-legacy-pro-stack.sh
#   ./scripts/deployment/disable-legacy-pro-stack.sh --check   # solo informa, no para nada
#
# Seguro de ejecutar varias veces.

set -Eeuo pipefail

CHECK_ONLY=false
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=true

LEGACY_CONTAINERS=(
  pro-db-1
  pro-db-backup-1
  pro-backend-1
  pro-frontend-1
  pro-celery_worker-1
  pro-redis-1
)

warn() { echo "⚠  $*"; }
ok()   { echo "✔  $*"; }
info() { echo "ℹ  $*"; }

running_legacy=()
for c in "${LEGACY_CONTAINERS[@]}"; do
  if docker ps -a --format '{{.Names}}' | grep -qx "$c"; then
    state=$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo unknown)
    if [[ "$state" == "running" ]]; then
      running_legacy+=("$c")
    fi
    info "Contenedor $c: $state (restart=$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$c" 2>/dev/null))"
  fi
done

# Detectar múltiples PostgreSQL con alias nexfit-pro-db en la red de producción
dup_db=$(docker network inspect nexfit-pro-internal-prod --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null \
  | tr ' ' '\n' | grep -E 'db-1$' | grep -v '^$' | wc -l)
if [[ "$dup_db" -gt 1 ]]; then
  warn "Hay $dup_db contenedores *-db-1 en nexfit-pro-internal-prod (riesgo split-brain)"
fi

if [[ ${#running_legacy[@]} -eq 0 ]]; then
  ok "No hay contenedores legacy 'pro' en ejecución"
else
  warn "Contenedores legacy en ejecución: ${running_legacy[*]}"
fi

if $CHECK_ONLY; then
  [[ ${#running_legacy[@]} -eq 0 ]] && exit 0 || exit 1
fi

for c in "${LEGACY_CONTAINERS[@]}"; do
  if docker ps -a --format '{{.Names}}' | grep -qx "$c"; then
    docker update --restart=no "$c" >/dev/null 2>&1 || true
    if docker inspect -f '{{.State.Running}}' "$c" 2>/dev/null | grep -q true; then
      docker stop "$c" >/dev/null
      ok "Detenido $c (restart=no)"
    else
      ok "$c ya estaba detenido (restart=no)"
    fi
  fi
done

ok "Stack legacy 'pro' deshabilitado. Producción: COMPOSE_PROJECT_NAME=nexfit-pro o 'name: nexfit-pro' en compose."
