#!/usr/bin/env bash
# Config-level push smoke (no browser). Does not print secret values.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE=( "$ROOT/scripts/host.sh" docker compose -f docker-compose.prod.yml )

echo "== VAPID presence + pywebpush =="
"${COMPOSE[@]}" exec -T backend python manage.py shell -c "
import os
for k in ('VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_CLAIM_EMAIL'):
    v = os.environ.get(k) or ''
    print(f'{k}: {\"present\" if v else \"MISSING\"} len={len(v)}')
import pywebpush
print('pywebpush OK')
from notifications.models import PushSubscription
print('total', PushSubscription.objects.count())
print('active', PushSubscription.objects.filter(is_active=True).count())
print('users_with_active', PushSubscription.objects.filter(is_active=True).values('user_id').distinct().count())
"

echo
echo "Browser steps for full delivery smoke:"
echo "  1) Log in as a normal user on https://nexfit365.dpdns.org"
echo "  2) Allow notifications when prompted (or from settings)"
echo "  3) Admin → Notificaciones → send to that user"
echo "  4) Re-run this script; active should be >= 1 and the device should receive the push"
