---
name: cleanup-workflow
description: >-
  How to audit and refactor NexFit365 safely with improve + ponytail +
  branch-pr-deploy. Use when the user asks to improve, audit, clean up,
  refactor, pay tech debt, or run /improve after rapid feature growth.
---

# Cleanup workflow (NexFit365)

Stack installed in this repo:

| Piece | Path | Role |
|-------|------|------|
| **improve** | `.cursor/skills/improve/` | Audit → prioritized plans (read-only on source) |
| **ponytail** | `.cursor/rules/ponytail.mdc` | Always-on: smallest working diff while implementing |
| **branch-pr-deploy** | `.cursor/skills/branch-pr-deploy/` | Branch → PR → CI → merge → deploy |

Never dump a giant refactor on `main`. Never let improve edit source itself.

## Correct loop

```
1. Audit     → invoke improve (plans only)
2. Pick      → user chooses 3–5 findings
3. Branch    → chore/ or fix/ from main (branch-pr-deploy)
4. Execute   → implement ONE plan per PR; ponytail keeps diffs small
5. Verify    → backend pytest / frontend npm run check (CI)
6. Review    → /review bugbot or security if risky
7. Merge     → only when user asks to deploy/merge
8. Reconcile → next session: improve reconcile
```

## How to invoke improve

Say one of these (or `@improve` / ask the agent to follow the improve skill):

| Phrase | Effect |
|--------|--------|
| `improve` / `/improve` | Full audit → findings table → wait for pick → write `plans/` |
| `improve quick` | Cheap pass: hotspots only, top findings |
| `improve deep` | Exhaustive (slow; use when you have time) |
| `improve security` | One category (`perf`, `tests`, `bugs`, `tech debt`, …) |
| `improve branch` | Only files changed on the current branch |
| `improve plan <desc>` | Skip audit; spec one known change |
| `improve reconcile` | Refresh backlog after work landed |

Plans land in `plans/` at the repo root (`plans/README.md` + `001-*.md`, …).  
Improve must **not** modify `backend/`, `frontend/`, or app code — only `plans/`.

## How to execute a plan

1. Read `plans/README.md` and the chosen `plans/00N-*.md`.
2. Create branch: `chore/<slug>` or `fix/<slug>` from latest `main`.
3. Implement **only** that plan’s in-scope files. Ponytail is always on — prefer reuse/stdlib/native, no extra abstractions.
4. Run verification commands listed in the plan (and CI equivalents).
5. Commit when asked; push; open PR; babysit CI.
6. One plan ≈ one PR. Do not batch unrelated cleanups.

## Ponytail (always on)

Already active via `.cursor/rules/ponytail.mdc`. While cleaning:

- Shortest working diff after understanding the problem
- No new deps / factories / “for later” scaffolding
- Never strip validation, security, accessibility, or data-loss guards
- To soften for a session: tell the agent `normal mode` / `stop ponytail` for that chat only (rule still loads; override verbally)

## Anti-patterns

- Running improve and then rewriting half the monorepo in one PR
- Treating every finding as must-fix (many are “not worth it”)
- Skipping characterization/tests before risky refactors
- Deploying cleanup without green CI
- Mixing product features and debt cleanup in the same PR

## First session recipe (after a feature binge)

```
User: improve quick
→ review findings table
→ pick top 3
→ agent writes plans/
→ for each plan: new branch + implement + PR
```
