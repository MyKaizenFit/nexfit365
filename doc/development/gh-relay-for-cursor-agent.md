# GitHub CLI from the Cursor agent

The Cursor **agent sandbox** forces traffic through a local HTTP proxy that
returns `CONNECT 403` for `api.github.com`. Your normal SSH/terminal session
can use `gh` fine; the agent cannot call GitHub’s API directly.

TCP `127.0.0.1` also fails across agent vs terminal **network namespaces**.
This relay uses a **Unix socket** on the shared filesystem instead.

## Fix (Unix-socket relay)

1. In **your** terminal (where `gh auth status` works), once per reboot:

```bash
bash /srv/mykaizenfit/pro/scripts/start-gh-relay.sh
```

2. Agent uses:

```bash
/srv/mykaizenfit/pro/scripts/gh.sh auth status
/srv/mykaizenfit/pro/scripts/gh.sh pr list
```

Socket: `.agents/gh-relay.sock` (gitignored). Token: `.agents/gh-relay.token`.

## Stop

```bash
kill "$(cat /srv/mykaizenfit/pro/.agents/gh-relay.pid)"
rm -f /srv/mykaizenfit/pro/.agents/gh-relay.sock
```
