#!/usr/bin/env bash
# Compat: gh via host-relay (same as: scripts/host.sh gh ...)
set -euo pipefail
ROOT="${NEXFIT_ROOT:-/srv/mykaizenfit/pro}"
exec "$ROOT/scripts/host.sh" gh "$@"
