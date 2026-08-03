# Ops closeout — 2026-08-03

Stripe/payments intentionally deferred (separate paid phase).

## Done

| Item | Notes |
|------|-------|
| P0.4 secret rotation | `SECRET_KEY`, `JWT_*`, Redis, VAPID rotated via `scripts/ops/rotate-prod-secrets.py`. `ENCRYPTION_KEY` **not** rotated (ciphertext in DB). DB already ≠ historical tip leak. SMTP/FatSecret left for provider console. |
| Dependabot high/medium (npm) | Bumped `next`/`eslint-config-next` → `15.5.21`, `postcss` → `8.5.18`, overrides for `js-yaml`, `brace-expansion`, `sharp`. |
| Push config smoke | `scripts/ops/smoke-push-config.sh` — VAPID/pywebpush/counts. Delivery needs browser subscribe (0 active at rotation). |
| Polish #80 smoke | `scripts/ops/smoke-polish-80.sh` — `/entrenamientos` + manifest shortcut. Admin membership/tips = staff browser. |

## Operator follow-ups (optional)

1. Browser: enable notifications once → admin send → confirm delivery; re-run `smoke-push-config.sh`.
2. FatSecret / SMTP app-password rotation at provider if desired.
3. History rewrite (filter-repo / fresh repo) still optional; rotation + option A is the chosen path.
4. Dependabot version-bump PRs (#44–#57) are non-security noise — review later, not required for this closeout.
