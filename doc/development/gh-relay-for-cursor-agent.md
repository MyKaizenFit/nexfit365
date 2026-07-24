# GitHub CLI from the Cursor agent

The Cursor **agent sandbox** forces traffic through a local HTTP proxy that
returns `CONNECT 403` for `api.github.com`. Your normal SSH/terminal session
can use `gh` fine; the agent cannot call GitHub’s API directly.

## Fix (localhost relay)

1. In **your** terminal (not the agent), once per reboot:

```bash
bash /srv/mykaizenfit/pro/scripts/start-gh-relay.sh
```

2. Tell the agent to use the wrapper instead of bare `gh`:

```bash
/srv/mykaizenfit/pro/scripts/gh.sh auth status
/srv/mykaizenfit/pro/scripts/gh.sh pr list
/srv/mykaizenfit/pro/scripts/gh.sh pr create ...
```

The relay listens on `127.0.0.1:8787`, runs `gh` in the process started from
your terminal (real network), and requires a token in `.agents/gh-relay.token`
(gitignored under `.agents/`).

## Stop

```bash
kill "$(cat /srv/mykaizenfit/pro/.agents/gh-relay.pid)"
```

## Why not “just disable the sandbox”?

Sandbox networking is controlled by Cursor; without host DNS/`nsenter` the agent
has no path to GitHub except the blocking proxy. The relay is the reliable fix
on this server.
