#!/usr/bin/env bash
# Compat: docker via host-relay
set -euo pipefail
ROOT="${NEXFIT_ROOT:-/srv/mykaizenfit/pro}"
exec "$ROOT/scripts/host.sh" docker "$@"
