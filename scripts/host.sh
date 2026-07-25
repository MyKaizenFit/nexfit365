#!/usr/bin/env bash
# Call host tools (docker, gh, deploy, …) via Unix-socket host-relay.
# Usage:
#   scripts/host.sh docker ps
#   scripts/host.sh gh pr list
#   scripts/host.sh deploy --background
#   scripts/host.sh deploy-and-wait --no-pull
#   scripts/host.sh maintenance on
#   scripts/host.sh nginx-reload
set -euo pipefail

ROOT="${NEXFIT_ROOT:-/srv/mykaizenfit/pro}"
SOCK="${HOST_RELAY_SOCK:-$ROOT/.agents/host-relay.sock}"
# Fall back to legacy gh socket name (symlink)
[[ -S "$SOCK" ]] || SOCK="$ROOT/.agents/gh-relay.sock"
TOKEN_FILE="$ROOT/.agents/host-relay.token"
[[ -f "$TOKEN_FILE" ]] || TOKEN_FILE="$ROOT/.agents/gh-relay.token"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <tool> [args...]" >&2
  echo "Tools: gh docker deploy deploy-and-wait maintenance nginx-reload nginx-status" >&2
  exit 1
fi

TOOL="$1"
shift

if [[ ! -S "$SOCK" ]]; then
  echo "host-relay socket missing. Start from your terminal:" >&2
  echo "  bash $ROOT/scripts/start-host-relay.sh" >&2
  exit 1
fi
if [[ ! -f "$TOKEN_FILE" ]]; then
  echo "host-relay token missing: $TOKEN_FILE" >&2
  exit 1
fi

TOKEN="$(tr -d '\n' <"$TOKEN_FILE")"

if ! curl -fsS --connect-timeout 1 --unix-socket "$SOCK" http://localhost/health >/dev/null 2>&1; then
  echo "host-relay not healthy. Restart: bash $ROOT/scripts/start-host-relay.sh" >&2
  exit 1
fi

ARGS_JSON="$(python3 -c 'import json,sys; a=sys.argv[1:]; print(json.dumps(a[1:] if a[:1]==["--"] else a))' -- "$@")"

# Long timeout for deploy/docker builds
TIMEOUT=120
case "$TOOL" in
  deploy|deploy-and-wait|docker) TIMEOUT=2400 ;;
esac

# /gh works on legacy gh-relay and host-relay; /run is host-relay only
if [[ "$TOOL" == "gh" ]]; then
  ENDPOINT="/gh"
  PAYLOAD="$(python3 -c 'import json,sys; print(json.dumps({"args": json.loads(sys.argv[1]), "timeout": int(sys.argv[2])}))' "$ARGS_JSON" "$TIMEOUT")"
else
  ENDPOINT="/run"
  PAYLOAD="$(python3 -c 'import json,sys; print(json.dumps({"tool": sys.argv[1], "args": json.loads(sys.argv[2]), "cwd": sys.argv[3], "timeout": int(sys.argv[4])}))' "$TOOL" "$ARGS_JSON" "$ROOT" "$TIMEOUT")"
fi

HTTP_CODE="$(curl -sS -o /tmp/host-relay-resp.$$ -w '%{http_code}' \
  --unix-socket "$SOCK" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  --max-time "$TIMEOUT" \
  "http://localhost${ENDPOINT}" || true)"
RESP="$(cat /tmp/host-relay-resp.$$ 2>/dev/null || true)"
rm -f /tmp/host-relay-resp.$$

if [[ -z "$RESP" ]]; then
  echo "host-relay empty response (HTTP ${HTTP_CODE:-?})" >&2
  exit 1
fi
if [[ "$HTTP_CODE" == "404" && "$TOOL" != "gh" ]]; then
  echo "Tool '$TOOL' needs host-relay. Restart from your terminal:" >&2
  echo "  bash $ROOT/scripts/start-host-relay.sh" >&2
  exit 1
fi

python3 - <<'PY' "$RESP"
import json, sys
resp = json.loads(sys.argv[1])
sys.stdout.write(resp.get("stdout") or "")
sys.stderr.write(resp.get("stderr") or "")
if not resp.get("ok") and resp.get("error"):
    sys.stderr.write(resp["error"] + "\n")
code = resp.get("code")
sys.exit(0 if resp.get("ok") else (code if isinstance(code, int) and code != 0 else 1))
PY
