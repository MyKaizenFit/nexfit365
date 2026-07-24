#!/usr/bin/env bash
# Start gh-relay (Unix socket). Run from a terminal where `gh auth status` works.
set -euo pipefail
ROOT="${NEXFIT_ROOT:-/srv/mykaizenfit/pro}"
SOCK="${GH_RELAY_SOCK:-$ROOT/.agents/gh-relay.sock}"
LOG="${GH_RELAY_LOG:-$ROOT/.agents/gh-relay.log}"
PIDFILE="$ROOT/.agents/gh-relay.pid"

mkdir -p "$ROOT/.agents"

# Drop Cursor sandbox proxy for this shell (integrated terminals often inject it).
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy \
      GIT_HTTP_PROXY GIT_HTTPS_PROXY SOCKS_PROXY SOCKS5_PROXY socks_proxy socks5_proxy || true

if [[ -S "$SOCK" ]] && curl -fsS --connect-timeout 1 --unix-socket "$SOCK" http://localhost/health >/dev/null 2>&1; then
  echo "gh-relay already healthy ($SOCK)"
  exit 0
fi

if [[ -f "$PIDFILE" ]]; then
  old="$(cat "$PIDFILE" || true)"
  if [[ -n "${old:-}" ]] && kill -0 "$old" 2>/dev/null; then
    echo "Stopping stale gh-relay pid $old"
    kill "$old" 2>/dev/null || true
    sleep 0.3
  fi
  rm -f "$PIDFILE"
fi
rm -f "$SOCK"

if ! gh auth status >/dev/null 2>&1; then
  echo "gh auth status failed in this shell. Fix: gh auth login -h github.com" >&2
  gh auth status >&2 || true
  exit 1
fi

: >"$LOG"
nohup python3 -u "$ROOT/scripts/gh-relay.py" >>"$LOG" 2>&1 &
echo $! >"$PIDFILE"

for i in 1 2 3 4 5 6 7 8 9 10; do
  if [[ -S "$SOCK" ]] && curl -fsS --connect-timeout 1 --unix-socket "$SOCK" http://localhost/health >/dev/null 2>&1; then
    echo "gh-relay started (pid $(cat "$PIDFILE"))"
    echo "socket: $SOCK"
    echo "agent:  $ROOT/scripts/gh.sh auth status"
    exit 0
  fi
  sleep 0.25
done

echo "Failed to start — last log lines:" >&2
tail -30 "$LOG" >&2 || true
exit 1
