# GitHub CLI from the Cursor agent

**Superseded by** [host-relay-for-cursor-agent.md](./host-relay-for-cursor-agent.md).

The old `gh`-only relay is replaced by **host-relay**, which also covers
`docker`, `deploy`, `maintenance`, and nginx reload over the same Unix socket.

Start once per reboot from your normal terminal:

```bash
bash /srv/mykaizenfit/pro/scripts/start-host-relay.sh
```

Agent wrappers (unchanged names still work):

```bash
/srv/mykaizenfit/pro/scripts/gh.sh pr list
/srv/mykaizenfit/pro/scripts/host.sh docker ps
```
