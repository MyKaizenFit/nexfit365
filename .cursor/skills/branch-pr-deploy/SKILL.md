---
name: branch-pr-deploy
description: >-
  Enforces branch + PR workflow for NexFit365 on a single server. Creates feature
  branches from main, opens PRs for GitHub history, babysits CI until green, merges
  on deploy request, then runs deploy.sh. Use at session start, before commits,
  when opening PRs, or when the user asks to deploy, merge, or release.
---

# Branch → PR → Deploy (NexFit365)

Single-server workflow. Never commit feature work directly to `main`. Every change
goes through a PR for GitHub history; merge only when deploying (or when the user
explicitly asks to merge).

## Hard rules

- **Never** commit feature/fix work on `main`. Checkout or create a branch first.
- **Never** run `./deploy.sh` from a feature branch or with unmerged local changes.
- **Never** force-push `main`.
- Stage only files in scope — no `git add .` / `git add -A`.
- Commits only when the user asks (or when completing an approved deploy merge step).

## Session start

1. `git fetch origin`
2. Read `.agents/state.md` if it exists (branch, PR number, task summary).
3. If on `main` with uncommitted changes → create a branch before editing further.
4. If `.agents/state.md` is missing, create it after picking a branch name.

### `.agents/state.md` template

```markdown
# Agent state (local, not versioned)

- branch: feat/my-task
- pr: 123
- task: short description
- updated: YYYY-MM-DD
```

Update this file whenever branch, PR, or task changes.

## Branch naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<short-kebab>` | `feat/exercise-cover-upload` |
| Fix | `fix/<short-kebab>` | `fix/workout-video-ios` |
| Chore | `chore/<short-kebab>` | `chore/gitignore-cursor` |
| Docs | `docs/<short-kebab>` | `docs/readme-deploy` |

Create from latest `main`:

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b feat/<name>
```

## Development loop

1. Work on the feature branch.
2. Commit with conventional messages (`feat:`, `fix:`, `chore:`, `docs:`).
3. Push: `git push -u origin HEAD`
4. Open PR if none exists:

```bash
gh pr create --base main --title "<title>" --body "$(cat <<'EOF'
## Summary
- ...

## Test plan
- [ ] ...

EOF
)"
```

5. Save PR number in `.agents/state.md`.
6. Watch CI (`quality.yml`): backend pytest + frontend `npm run check`.
7. If CI fails → fix on the branch, push, re-check. Use the **babysit** skill for
   comment/CI loops on existing PRs.

## Deploy request

When the user says **deploy**, **desplegar**, **subir a producción**, or similar:

```
Deploy checklist:
- [ ] On the correct feature branch (or PR identified in state)
- [ ] All changes committed and pushed
- [ ] PR open against main
- [ ] CI green on the PR
- [ ] No merge conflicts
```

Then:

1. **Babysit** the PR until merge-ready (CI green, conflicts resolved).
2. **Merge** the PR (prefer squash merge for clean history):

```bash
gh pr merge <number> --squash --delete-branch
```

3. Update local `main`:

```bash
git checkout main
git pull origin main
```

4. **Deploy** (background by default — survives SSH/Cursor disconnects):

```bash
./deploy.sh --background
./deploy.sh --status    # confirm it started
```

5. Clear or update `.agents/state.md` (remove PR, note deploy date).

If deploy fails, diagnose from `data/logs/deploy-latest.log` — do not merge
additional unrelated changes until the current deploy is resolved.

## Quick commands

| Intent | Command |
|--------|---------|
| Current branch / PR | `git branch --show-current` + read `.agents/state.md` |
| PR status | `gh pr view --json state,mergeable,statusCheckRollup,url` |
| CI on PR | `gh pr checks <number>` |
| Merge + deploy | see Deploy request above |

## Repo context

- Remote: `origin` → `MyKaizenFit/nexfit365`
- Default branch: `main`
- CI workflow: `.github/workflows/quality.yml`
- Deploy script: `./deploy.sh` (prod Docker Compose, `--background` recommended)
