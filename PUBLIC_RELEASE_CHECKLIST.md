# Public Release Checklist

Use this checklist before publishing this repository publicly.

## Required Before Public Push

- Rotate any secret that ever appeared in the repository history:
  - Django `SECRET_KEY`
  - `ENCRYPTION_KEY`
  - JWT signing secrets
  - PostgreSQL passwords and hosted database credentials
  - Redis passwords
  - SMTP/API provider credentials
  - VAPID private keys
- Do not publish the current historical branch directly if it contains old env files,
  database exports, backups, media files, or secrets.
- Prefer one of these approaches:
  - Create a fresh public repository from a sanitized working tree without history.
  - Or rewrite history with `git filter-repo`/BFG and force-push only after verifying
    every collaborator understands the rewrite.
- Run a secret scanner before publishing.
- Confirm `git ls-files -ci --exclude-standard` returns no tracked ignored files.
- Confirm no `.env`, backup, dump, database, coverage, media, or generated output files
  are tracked.

## Current Sanitization Notes

- Runtime media under `backend/test_media/` must remain ignored and untracked.
- Local `.env` files must stay outside Git.
- Documentation must use placeholders such as `CHANGE_ME_*` and `example.invalid`.
- Production incident notes must not include real users, emails, phones, tokens,
  passwords, host credentials, or encryption keys.

## Last secret scan

- **Date:** 2026-07-24
- **Tool:** Gitleaks 8.24.3 (full history)
- **Result:** findings in history (see redacted report); tip scrub of hardcoded DB
  passwords in PowerShell change-password scripts
- **Report:** [`doc/security/secret-scan-2026-07-24.md`](doc/security/secret-scan-2026-07-24.md)
- **Rotation:** operator must still rotate any secret that matched historical findings
  (DB password from those scripts, VAPID if old keys were real, etc.)
- **History rewrite:** not performed; choose option A/B/C in the report before a
  public marketing push

