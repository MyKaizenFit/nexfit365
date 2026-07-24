#!/usr/bin/env bash
# Wrapper: call `gh` via localhost relay when agent sandbox blocks api.github.com.
# Usage: scripts/gh.sh pr list
#        scripts/gh.sh pr create --title '...' --body '...'
set -euo pipefail

ROOT="${NEXFIT_ROOT:-/srv/mykaizenfit/pro}"
PORT="${GH_RELAY_PORT:-8787}"
TOKEN_FILE="$ROOT/.agents/gh-relay.token"
URL="http://127.0.0.1:${PORT}/gh"

if [[ ! -f "$TOKEN_FILE" ]]; then
  echo "gh-relay token missing. Start the relay first:" >&2
  echo "  bash $ROOT/scripts/start-gh-relay.sh" >&2
  exit 1
fi

TOKEN="$(tr -d '\n' <"$TOKEN_FILE")"

# Probe health
if ! curl -fsS --connect-timeout 1 "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
  echo "gh-relay not running on :${PORT}. Start it in your terminal:" >&2
  echo "  bash $ROOT/scripts/start-gh-relay.sh" >&2
  exit 1
fi

# Build JSON args array safely
ARGS_JSON="$(python3 -c 'import json,sys; print(json.dumps(sys.argv[1:]))' -- "$@")"
PAYLOAD="$(python3 -c 'import json,sys; print(json.dumps({"args": json.loads(sys.argv[1]), "cwd": sys.argv[2]}))' "$ARGS_JSON" "$ROOT")"

RESP="$(curl -fsS \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$URL")"

python3 - <<'PY' "$RESP"
import json, sys
resp = json.loads(sys.argv[1])
sys.stdout.write(resp.get("stdout") or "")
sys.stderr.write(resp.get("stderr") or "")
sys.exit(0 if resp.get("ok") else (resp.get("code") or 1))
PY
