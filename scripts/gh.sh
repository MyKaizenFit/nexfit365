#!/usr/bin/env bash
# Wrapper: call `gh` via Unix-socket relay (shared FS; works across Cursor netns).
# Usage: scripts/gh.sh pr list
set -euo pipefail

ROOT="${NEXFIT_ROOT:-/srv/mykaizenfit/pro}"
SOCK="${GH_RELAY_SOCK:-$ROOT/.agents/gh-relay.sock}"
TOKEN_FILE="$ROOT/.agents/gh-relay.token"

if [[ ! -S "$SOCK" ]]; then
  echo "gh-relay socket missing: $SOCK" >&2
  echo "Start it in your normal terminal:" >&2
  echo "  bash $ROOT/scripts/start-gh-relay.sh" >&2
  exit 1
fi

if [[ ! -f "$TOKEN_FILE" ]]; then
  echo "gh-relay token missing: $TOKEN_FILE" >&2
  exit 1
fi

TOKEN="$(tr -d '\n' <"$TOKEN_FILE")"

# Health via Unix socket
if ! curl -fsS --connect-timeout 1 --unix-socket "$SOCK" http://localhost/health >/dev/null 2>&1; then
  echo "gh-relay not healthy on $SOCK. Restart:" >&2
  echo "  bash $ROOT/scripts/start-gh-relay.sh" >&2
  exit 1
fi

ARGS_JSON="$(python3 -c 'import json,sys; a=sys.argv[1:]; print(json.dumps(a[1:] if a[:1]==["--"] else a))' -- "$@")"
PAYLOAD="$(python3 -c 'import json,sys; print(json.dumps({"args": json.loads(sys.argv[1]), "cwd": sys.argv[2]}))' "$ARGS_JSON" "$ROOT")"
RESP="$(curl -fsS \
  --unix-socket "$SOCK" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  http://localhost/gh)"

python3 - <<'PY' "$RESP"
import json, sys
resp = json.loads(sys.argv[1])
sys.stdout.write(resp.get("stdout") or "")
sys.stderr.write(resp.get("stderr") or "")
sys.exit(0 if resp.get("ok") else (resp.get("code") or 1))
PY
