#!/usr/bin/env bash
# Start host-relay (docker + gh + deploy). Run from a normal host terminal.
set -euo pipefail
ROOT="${NEXFIT_ROOT:-/srv/mykaizenfit/pro}"
SOCK="${HOST_RELAY_SOCK:-$ROOT/.agents/host-relay.sock}"
LOG="${HOST_RELAY_LOG:-$ROOT/.agents/host-relay.log}"
PIDFILE="$ROOT/.agents/host-relay.pid"

mkdir -p "$ROOT/.agents"

unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy \
      GIT_HTTP_PROXY GIT_HTTPS_PROXY SOCKS_PROXY SOCKS5_PROXY socks_proxy socks5_proxy || true

if [[ -S "$SOCK" ]] && curl -fsS --connect-timeout 1 --unix-socket "$SOCK" http://localhost/health >/dev/null 2>&1; then
  echo "host-relay already healthy ($SOCK)"
  curl -fsS --unix-socket "$SOCK" http://localhost/health
  echo
  exit 0
fi

# Stop stale host-relay / legacy gh-relay
for pf in "$PIDFILE" "$ROOT/.agents/gh-relay.pid"; do
  if [[ -f "$pf" ]]; then
    old="$(cat "$pf" || true)"
    if [[ -n "${old:-}" ]] && kill -0 "$old" 2>/dev/null; then
      echo "Stopping old relay pid $old"
      kill "$old" 2>/dev/null || true
      sleep 0.3
    fi
    rm -f "$pf"
  fi
done
rm -f "$SOCK" "$ROOT/.agents/gh-relay.sock"

if ! docker info >/dev/null 2>&1 && ! gh auth status >/dev/null 2>&1; then
  echo "Neither docker nor gh works here. Use your normal SSH/terminal session." >&2
  exit 1
fi

: >"$LOG"
nohup python3 -u "$ROOT/scripts/host-relay.py" >>"$LOG" 2>&1 &
echo $! >"$PIDFILE"
# Keep legacy pid name for older docs
echo $! >"$ROOT/.agents/gh-relay.pid"

for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if [[ -S "$SOCK" ]] && curl -fsS --connect-timeout 1 --unix-socket "$SOCK" http://localhost/health >/dev/null 2>&1; then
    echo "host-relay started (pid $(cat "$PIDFILE"))"
    echo "socket: $SOCK"
    echo "Try from agent:"
    echo "  $ROOT/scripts/host.sh docker ps"
    echo "  $ROOT/scripts/gh.sh auth status"
    echo "  $ROOT/scripts/host.sh deploy-and-wait --no-pull"
    exit 0
  fi
  sleep 0.25
done

echo "Failed to start — log:" >&2
tail -40 "$LOG" >&2 || true
exit 1
