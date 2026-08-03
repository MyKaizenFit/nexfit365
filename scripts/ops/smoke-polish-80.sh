#!/usr/bin/env bash
# Smoke QA for polish #80 public surfaces (no auth admin UI).
set -euo pipefail
BASE="${1:-https://nexfit365.dpdns.org}"

echo "== /entrenamientos redirect =="
code=$(curl -sS -o /dev/null -w '%{http_code}' -L --max-redirs 0 "$BASE/entrenamientos" || true)
# Next client redirect may 200 with HTML; also accept 307/308/302
loc=$(curl -sS -o /dev/null -w '%{redirect_url}' "$BASE/entrenamientos" || true)
echo "status_first=$code redirect_url=${loc:-none}"

echo "== manifest shortcut =="
curl -sS "$BASE/manifest.json" | python3 -c 'import json,sys; m=json.load(sys.stdin); sc=m.get("shortcuts") or [];
print("ok" if any("workouts-3" in (s.get("url") or "") for s in sc) else "FAIL missing workouts-3");
[print(" ", s.get("name"), s.get("url")) for s in sc]'

echo "== homepage =="
curl -sS -o /dev/null -w 'home %{http_code}\n' "$BASE/"

echo "Admin membership/tips UI requires logged-in staff browser check."
