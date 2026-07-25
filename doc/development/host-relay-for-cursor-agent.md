# Host resources from the Cursor agent (docker, gh, deploy)

## Problem

The Cursor **agent sandbox** on this server:

- Cannot see `/var/run/docker.sock` → `docker` client fails
- Cannot reach `api.github.com` (proxy CONNECT 403) → bare `gh` fails
- Does not share TCP `127.0.0.1` with your normal terminal (netns)

Your interactive terminal **can** use docker and gh.

## Fix: host-relay (Unix socket)

1. Start once per reboot **in your normal terminal**:

```bash
bash /srv/mykaizenfit/pro/scripts/start-host-relay.sh
```

2. From the agent (or scripts), use wrappers:

```bash
scripts/host.sh docker ps
scripts/host.sh docker compose -f docker-compose.prod.yml ps
scripts/gh.sh auth status          # == host.sh gh …
scripts/host.sh deploy --background
scripts/host.sh deploy-and-wait --no-pull
scripts/host.sh maintenance on
scripts/host.sh nginx-reload
```

Socket: `.agents/host-relay.sock`  
Token: `.agents/host-relay.token` (gitignored)

Only allowlisted tools run — no arbitrary shell.

## Stop

```bash
kill "$(cat /srv/mykaizenfit/pro/.agents/host-relay.pid)"
rm -f /srv/mykaizenfit/pro/.agents/host-relay.sock
```

## Compat

`start-gh-relay.sh` and `gh.sh` still work; they now use host-relay.
