# Contributing to NexFit365

Thanks for helping improve the project. Keep changes small, reviewable, and free of secrets.

## Workflow

1. Branch from latest `main` — never commit feature work on `main`.
2. Use a typed branch name: `feat/…`, `fix/…`, `chore/…`, or `docs/…`.
3. Open a PR against `main`. CI (`quality.yml`) must pass: backend `pytest` and frontend `npm run check`.
4. Merge only when asked to merge or deploy (single-server release flow).

## Local checks

- Backend: `pytest -q` from `backend/` (see project docs / CI for env).
- Frontend: `cd frontend && npm ci && npm test -- --ci --coverage=false && npm run check`.

## Do not

- Commit `.env`, credentials, dumps with personal data, or real media.
- Reintroduce `npm ci --legacy-peer-deps` without a documented peer conflict and fix plan.
- Push force to `main`.

## Security

Report vulnerabilities privately — see [SECURITY.md](./SECURITY.md). Do not file public issues for exploitable bugs.

## License

This project is proprietary — see [LICENSE](./LICENSE). Contributions are accepted only under the same terms (copyright assigned to / licensed exclusively for the copyright holders unless otherwise agreed in writing).
