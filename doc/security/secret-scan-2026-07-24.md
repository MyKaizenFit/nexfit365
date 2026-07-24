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

- [ ] PostgreSQL role password(s) that ever matched the scrubbed PowerShell scripts
- [ ] Django `SECRET_KEY` / `JWT_SECRET` / `JWT_REFRESH_SECRET` (if ever committed historically — verify with scan links)
- [ ] `ENCRYPTION_KEY` — **STOP and plan re-encrypt** before rotating if data is encrypted at rest with it
- [ ] Redis password
- [ ] SMTP / SendGrid
- [ ] VAPID key pair (regenerate + update clients)
- [ ] FatSecret / other third-party API secrets
- [ ] Restart services after rotation (`deploy.sh` when operator requests)

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
