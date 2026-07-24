#!/usr/bin/env bash
# Start gh-relay in the background (must run from a normal terminal with working `gh`).
set -euo pipefail
ROOT="${NEXFIT_ROOT:-/srv/mykaizenfit/pro}"
PORT="${GH_RELAY_PORT:-8787}"
LOG="${GH_RELAY_LOG:-$ROOT/.agents/gh-relay.log}"
PIDFILE="$ROOT/.agents/gh-relay.pid"

mkdir -p "$ROOT/.agents"

if curl -fsS --connect-timeout 1 "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
  echo "gh-relay already healthy on :${PORT}"
  exit 0
fi

# Clear stale pid
if [[ -f "$PIDFILE" ]]; then
  old="$(cat "$PIDFILE" || true)"
  if [[ -n "${old:-}" ]] && kill -0 "$old" 2>/dev/null; then
    echo "gh-relay pid $old still running but /health failed — check $LOG"
    exit 1
  fi
  rm -f "$PIDFILE"
fi

# Verify gh works HERE (outside agent sandbox)
if ! gh auth status >/dev/null 2>&1; then
  echo "gh auth status failed in this shell. Fix with: gh auth login -h github.com" >&2
  exit 1
fi

nohup python3 "$ROOT/scripts/gh-relay.py" >>"$LOG" 2>&1 &
echo $! >"$PIDFILE"
sleep 0.4

if curl -fsS --connect-timeout 2 "http://127.0.0.1:${PORT}/health" >/dev/null; then
  echo "gh-relay started (pid $(cat "$PIDFILE")) on http://127.0.0.1:${PORT}"
  echo "Agent can use: $ROOT/scripts/gh.sh ..."
else
  echo "Failed to start — see $LOG" >&2
  tail -20 "$LOG" >&2 || true
  exit 1
fi
