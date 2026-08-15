#!/usr/bin/env bash
# Self-check: deploy must not clear a pre-existing maintenance flag.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=scripts/lib/maintenance-lifecycle.sh
. "$ROOT/scripts/lib/maintenance-lifecycle.sh"

assert_eq() {
  local got="$1" expected="$2" label="$3"
  if [ "$got" != "$expected" ]; then
    echo "FAIL $label: got '$got' expected '$expected'" >&2
    exit 1
  fi
}

# A) initially OFF, this deploy enabled it → cleanup disables (ends OFF)
assert_eq "$(should_disable_deploy_maintenance false true)" "1" "A-off-then-deploy-on"

# A') initially OFF, enable failed → do not disable
assert_eq "$(should_disable_deploy_maintenance false false)" "0" "A-off-enable-failed"

# B) initially ON, this deploy also called enable → keep ON
assert_eq "$(should_disable_deploy_maintenance true true)" "0" "B-already-on-deploy-enabled"

# B') initially ON, enable skipped/failed → keep ON
assert_eq "$(should_disable_deploy_maintenance true false)" "0" "B-already-on-enable-skipped"

echo "maintenance-lifecycle self-check OK"
