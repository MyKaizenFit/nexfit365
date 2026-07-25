#!/usr/bin/env bash
# Run after merging to main: background deploy + PID wait (no hang) + force maintenance off.
# Usage: bash scripts/deployment/deploy-and-wait.sh
#        bash scripts/deployment/deploy-and-wait.sh --no-pull
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

PID_FILE="$ROOT/data/logs/deploy.pid"
LOG_FILE="$ROOT/data/logs/deploy-latest.log"
MAINT_FLAG="$ROOT/data/maintenance/maintenance.on"
MAX_WAIT_SEC="${DEPLOY_WAIT_SEC:-1800}"
POLL_SEC=5
DO_PULL=true

for arg in "$@"; do
  case "$arg" in
    --no-pull) DO_PULL=false ;;
    --help|-h)
      echo "Usage: $0 [--no-pull]"
      exit 0
      ;;
  esac
done

force_maintenance_off() {
  echo "== ensure maintenance OFF =="
  # Always clear the flag nginx checks (works even if systemctl reload fails).
  rm -f "$MAINT_FLAG"
  bash "$ROOT/scripts/deployment/maintenance.sh" off 2>/dev/null || true
  if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl reload nginx 2>/dev/null || true
  fi
  if [[ -f "$MAINT_FLAG" ]]; then
    echo "WARN: could not clear $MAINT_FLAG" >&2
    return 1
  fi
  echo "Maintenance: off"
}

deploy_pid_alive() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(tr -d ' \n' <"$PID_FILE" || true)"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

if [[ "$DO_PULL" == true ]]; then
  echo "== sync main =="
  git fetch origin
  git checkout main
  git pull origin main
  git log --oneline -2
fi

echo "== deploy background (deploy.sh enables maintenance) =="
./deploy.sh --background

echo "== wait on deploy.pid only (avoids pipefail/SIGPIPE hang from --status|grep) =="
elapsed=0
while deploy_pid_alive; do
  if (( elapsed >= MAX_WAIT_SEC )); then
    echo "ERROR: timeout after ${MAX_WAIT_SEC}s" >&2
    tail -40 "$LOG_FILE" || true
    force_maintenance_off || true
    exit 1
  fi
  if (( elapsed % 60 == 0 )); then
    echo "... ${elapsed}s"
    tail -n 1 "$LOG_FILE" 2>/dev/null | sed 's/^/  /' || true
  fi
  sleep "$POLL_SEC"
  elapsed=$((elapsed + POLL_SEC))
done
rm -f "$PID_FILE"

echo "== verify success marker =="
if ! grep -q 'DEPLOYMENT COMPLETADO' "$LOG_FILE"; then
  echo "ERROR: deploy ended without success marker" >&2
  tail -50 "$LOG_FILE" || true
  force_maintenance_off || true
  exit 1
fi

force_maintenance_off
echo "OK — deploy complete, maintenance off"
tail -12 "$LOG_FILE"
