#!/usr/bin/env bash
# Self-check for scripts/lib/frontend-health-path.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=scripts/lib/frontend-health-path.sh
. "$ROOT/scripts/lib/frontend-health-path.sh"

assert_eq() {
  local got="$1" expected="$2" label="$3"
  if [ "$got" != "$expected" ]; then
    echo "FAIL $label: got '$got' expected '$expected'" >&2
    exit 1
  fi
}

assert_eq "$(normalize_frontend_health_path '')" "/" "empty"
assert_eq "$(normalize_frontend_health_path '/')" "/" "slash"
assert_eq "$(normalize_frontend_health_path '/nexfit')" "/nexfit/" "nexfit"
assert_eq "$(normalize_frontend_health_path '/nexfit/')" "/nexfit/" "nexfit-slash"
assert_eq "$(frontend_local_health_url '')" "http://localhost:3000/" "url-empty"
assert_eq "$(frontend_local_health_url '/nexfit')" "http://localhost:3000/nexfit/" "url-nexfit"

tmp="$(mktemp)"
printf 'NEXT_PUBLIC_BASE_PATH=/nexfit\n' > "$tmp"
assert_eq "$(read_named_env_value "$tmp" "NEXT_PUBLIC_BASE_PATH")" "/nexfit" "read-env"
rm -f "$tmp"

echo "frontend-health-path self-check OK"
