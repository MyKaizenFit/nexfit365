# Secret scan report — 2026-07-24

**Tool:** Gitleaks 8.24.3  
**Scope:** full git history (`gitleaks git .`)  
**HEAD at scan:** `a5d7ee0` (branch `chore/audit-002-secret-scan` may be ahead with tip scrub)  
**Policy:** this file lists **types and paths only** — never secret values.

## Summary

| Metric | Value |
|--------|------:|
| Commits scanned | 1026 |
| Raw findings | 62 |
| Unique (rule+file+commit) | ~26 |
| Tip secrets scrubbed in this PR | DB password hardcodes in 2 PowerShell scripts |

## Tip (working tree) actions taken

| Path | Secret type | Action |
|------|-------------|--------|
| `backend/cambiar_contraseña_nexfit_app.ps1` | postgres password (hardcoded) | Replaced with env vars `NEXFIT_DB_CURRENT_PASSWORD` / `NEXFIT_DB_NEW_PASSWORD` |
| `backend/cambiar_contraseña_usuario.ps1` | postgres password (hardcoded) | Replaced with `NEXFIT_DB_NEW_PASSWORD` |
| `docker/backend.env.production` | VAPID private key (local file) | **Not tracked** (`.gitignore` `*.env.production`); never appeared in git history under that path |

## History findings (redacted inventory)

| Rule | Path (historical and/or current) | Secret type | Recommended action |
|------|----------------------------------|-------------|--------------------|
| `private-key` | `docker-compose.dev.yml` (old commits) | VAPID / PEM private key | Confirm tip clean; **rotate VAPID** if that key was ever used in prod |
| `private-key` | `doc/PUSH_NOTIFICATIONS_SETUP_COMPLETADO.md` (old) | VAPID private key in docs | Tip appears clean; rotate if key matched prod |
| `private-key` | `backend/docker/backend.env` / `docker/backend.env` (old) | env private keys | Files no longer tracked; rotate matching prod secrets |
| `private-key` | `backend/notifications/.../generate_vapid_keys.py` (old) | example key material | Review tip; ensure only generated-at-runtime samples |
| `generic-api-key` | `backend/cambiar_contraseña_*.ps1` | DB password | Tip scrubbed; **rotate DB role password** if that value was used |
| `generic-api-key` | `backend/update_env_credentials.py` (old) | credentials helper | File gone from tip; rotate any embedded values that matched prod |
| `generic-api-key` / JWT-like | `doc/api/openapi-specification.md`, `doc/backend/api-urls.md`, `IMPORT_EXPORT_COMPLETADO.md` (old) | JWT / Bearer examples | Tip docs appear without live JWTs; treat as expired examples |
| `curl-auth-header` | various docs (old) | Authorization header examples | Same as above |
| `generic-api-key` | `backend/api/auth_views.py`, `seed_demo.py` (old commits) | false positive / demo material likely | Spot-check tip; no action if placeholders only |

## Rotation checklist (operator — do on server/providers)

Do **not** paste new values into git.

- [x] PostgreSQL role password(s) from scrubbed PowerShell / manual docs — **2026-07-24:** live `DB_PASSWORD` / `POSTGRES_PASSWORD` do **not** match the leaked tip values (compared without logging secrets). Remaining tip doc `cambiar_contraseña_manual.md` removed. History may still contain the old value → prefer option A (already distinct live secrets) or B/C before a public marketing push.
- [x] Django `SECRET_KEY` / `JWT_SECRET` / `JWT_REFRESH_SECRET` — **rotated 2026-08-03** via `scripts/ops/rotate-prod-secrets.py` (fingerprints changed; backups under `data/secret-rotation-backups/`). Invalidates sessions/JWTs until users re-login.
- [~] `ENCRYPTION_KEY` — **STOP**: Fernet ciphertext present on live user PII columns; do **not** rotate without dual-key re-encrypt. Left unchanged 2026-08-03.
- [x] Redis password — **rotated 2026-08-03** (`REDIS_PASSWORD` + `REDIS_URL`).
- [~] SMTP / SendGrid — SMTP only (no SendGrid keys). Not in tip; rotate at provider if a historical dump ever matched prod. Left unchanged 2026-08-03.
- [x] VAPID key pair — **rotated 2026-08-03** (backend + `NEXT_PUBLIC_VAPID_PUBLIC_KEY`). Existing push subscriptions must re-subscribe (prod had 0 active at rotation).
- [~] FatSecret / other third-party API secrets — rotate at FatSecret console when convenient; left unchanged 2026-08-03.
- [x] Restart services after rotation — deploy after this checklist update.

Helper: `python3 scripts/ops/rotate-prod-secrets.py --apply` (never prints values).

## History rewrite decision (NOT done in this plan)

Gitleaks still reports secrets in **old commits**. Options for the operator:

| Option | When |
|--------|------|
| A) Rotate only + leave history | Acceptable if all leaked values are rotated and unused |
| B) `git filter-repo` + coordinated force-push | If keys may still be valid and repo is public |
| C) Fresh public repo without history | Portfolio publish path from `PUBLIC_RELEASE_CHECKLIST.md` |

**This plan stops before B/C.**

## Follow-ups

- Plan **011**: Gitleaks/Dependabot/CodeQL in CI so tip regressions fail PRs.
- Plan **003**: scrub CSV/HTML/docs for non-secret PII.
- Plan **009**: move one-off password scripts to `scripts/deprecated/`.

## Re-scan command

```bash
gitleaks git . --redact --report-path /tmp/gitleaks-nexfit.json
```
