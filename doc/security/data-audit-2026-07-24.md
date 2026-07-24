# Tracked-data audit — 2026-07-24

## Decisions

| Path | Decision | Reason |
|------|----------|--------|
| `admin.html` | delete | One-line debug redirect snapshot |
| `root.html` | delete | Full Next.js HTML dump; not used by deploy |
| `recetas_sin_imagen.csv` | delete | Tiny working list in repo root |
| `backend/exercises_export.csv` | move → `doc/archive/exports/` | Catalog/test rows, not user PII |
| `backend/recipes_export.csv` | move → `doc/archive/exports/` | Recipe catalog export |
| `backend/workouts_exercise_missing.csv` | move → `doc/archive/exports/` | Exercise catalog export |
| Django admin/email HTML templates | keep | App templates |
| `scripts/deployment/maintenance-page.html` | keep | Ops maintenance page |
| `backups/` | ignored | Already in `.gitignore` |

## Emails / credentials in docs

- `doc/docker/TEST_USERS_CREDENTIALS.md`: passwords and `@test.com` emails replaced with `ChangeMeTest123!` / `@example.invalid`.
- Other docs mostly already use `example.com` / `example.invalid`.

## Absolute paths

- Replaced `/srv/mykaizenfit/pro` with `${REPO_ROOT}` in `DATA_PROTECTION_GUIDE.md`, `MONITORING_SETUP.md`, `RECOVERY.md`.

## Residual risk

- Historical commits may still contain old HTML/CSV/path strings (see plan 002 history rewrite options).
- Catalog CSVs under `doc/archive/exports/` remain public content of the product; OK for this private/ops repo, review before a marketing-public fork.
