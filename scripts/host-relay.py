#!/usr/bin/env python3
"""Host resource relay for Cursor agent sandbox (Unix socket).

The agent cannot see /var/run/docker.sock nor reach api.github.com.
This process must be started from a normal host terminal; the agent talks
to it via .agents/host-relay.sock on the shared filesystem.

Allowed tools (argv[0] keys only — no shell):
  gh, docker, deploy, deploy-and-wait, maintenance, nginx-reload, nginx-status
"""
from __future__ import annotations

import json
import os
import secrets
import shutil
import socket
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from socketserver import ThreadingMixIn

ROOT = Path(os.environ.get("NEXFIT_ROOT", "/srv/mykaizenfit/pro")).resolve()
TOKEN_PATH = ROOT / ".agents" / "host-relay.token"
SOCK_PATH = Path(os.environ.get("HOST_RELAY_SOCK", str(ROOT / ".agents" / "host-relay.sock")))
# Compat symlink/path for old gh.sh clients
GH_COMPAT_SOCK = ROOT / ".agents" / "gh-relay.sock"


def which(name: str) -> str | None:
    return shutil.which(name)


def build_allowlist() -> dict[str, list[str]]:
    tools: dict[str, list[str]] = {}
    gh = which("gh")
    if gh:
        tools["gh"] = [gh]
    docker = which("docker")
    if docker:
        tools["docker"] = [docker]
    deploy = ROOT / "deploy.sh"
    if deploy.is_file():
        tools["deploy"] = [str(deploy)]
    daw = ROOT / "scripts/deployment/deploy-and-wait.sh"
    if daw.is_file():
        tools["deploy-and-wait"] = [str(daw)]
    maint = ROOT / "scripts/deployment/maintenance.sh"
    if maint.is_file():
        tools["maintenance"] = [str(maint)]
    systemctl = which("systemctl")
    if systemctl:
        tools["nginx-reload"] = [systemctl, "reload", "nginx"]
        tools["nginx-status"] = [systemctl, "status", "nginx", "--no-pager"]
    return tools


def ensure_token() -> str:
    TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    # Prefer existing gh-relay token so old clients keep working
    legacy = ROOT / ".agents" / "gh-relay.token"
    if TOKEN_PATH.exists():
        return TOKEN_PATH.read_text().strip()
    if legacy.exists():
        token = legacy.read_text().strip()
        TOKEN_PATH.write_text(token + "\n")
        TOKEN_PATH.chmod(0o600)
        return token
    token = secrets.token_urlsafe(24)
    TOKEN_PATH.write_text(token + "\n")
    TOKEN_PATH.chmod(0o600)
    # Keep legacy name in sync for scripts/gh.sh
    legacy.write_text(token + "\n")
    legacy.chmod(0o600)
    return token


TOKEN = ensure_token()
ALLOWLIST = build_allowlist()


def clean_env() -> dict:
    env = os.environ.copy()
    for k in (
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "http_proxy",
        "https_proxy",
        "ALL_PROXY",
        "all_proxy",
        "GIT_HTTP_PROXY",
        "GIT_HTTPS_PROXY",
        "SOCKS_PROXY",
        "SOCKS5_PROXY",
        "socks_proxy",
        "socks5_proxy",
    ):
        env.pop(k, None)
    return env


def resolve_command(tool: str, args: list[str]) -> list[str]:
    if tool not in ALLOWLIST:
        known = ", ".join(sorted(ALLOWLIST)) or "(none)"
        raise ValueError(f"tool not available: {tool} (have: {known})")
    base = list(ALLOWLIST[tool])
    if tool in ("nginx-reload", "nginx-status"):
        if args:
            raise ValueError(f"{tool} takes no extra args")
        return base
    # Block shell injection style args
    for a in args:
        if "\x00" in a:
            raise ValueError("nul in args")
        if len(a) > 8000:
            raise ValueError("arg too long")
    if len(args) > 80:
        raise ValueError("too many args")
    return base + args


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("[host-relay] " + (fmt % args) + "\n")

    def _auth_ok(self) -> bool:
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            return auth.removeprefix("Bearer ").strip() == TOKEN
        return self.headers.get("X-Host-Relay-Token", "") == TOKEN or self.headers.get(
            "X-Gh-Relay-Token", ""
        ) == TOKEN

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8") or "{}")

    def _send(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path in ("/health", "/"):
            self._send(
                200,
                {
                    "ok": True,
                    "service": "host-relay",
                    "sock": str(SOCK_PATH),
                    "tools": sorted(ALLOWLIST.keys()),
                },
            )
            return
        self._send(404, {"ok": False, "error": "not found"})

    def do_POST(self) -> None:
        # /gh kept for scripts/gh.sh; /run is the general endpoint
        if self.path not in ("/run", "/gh"):
            self._send(404, {"ok": False, "error": "not found"})
            return
        if not self._auth_ok():
            self._send(401, {"ok": False, "error": "unauthorized"})
            return
        try:
            data = self._read_json()
        except json.JSONDecodeError:
            self._send(400, {"ok": False, "error": "invalid json"})
            return

        if self.path == "/gh":
            tool = "gh"
            args = data.get("args")
        else:
            tool = data.get("tool")
            args = data.get("args")

        if not isinstance(tool, str) or not isinstance(args, list) or not all(
            isinstance(a, str) for a in args
        ):
            self._send(400, {"ok": False, "error": "need tool:str and args:list[str]"})
            return

        try:
            cmd = resolve_command(tool, args)
        except (ValueError, FileNotFoundError) as e:
            self._send(400, {"ok": False, "error": str(e)})
            return

        cwd = data.get("cwd") or str(ROOT)
        # Only allow cwd under repo root
        try:
            cwd_res = Path(cwd).resolve()
            if ROOT != cwd_res and ROOT not in cwd_res.parents:
                raise ValueError("cwd outside repo")
        except Exception as e:
            self._send(400, {"ok": False, "error": f"bad cwd: {e}"})
            return

        default_timeout = 2400 if tool in ("deploy", "deploy-and-wait", "docker") else 120
        timeout = int(data.get("timeout", default_timeout))
        timeout = max(5, min(timeout, 3600))

        try:
            proc = subprocess.run(
                cmd,
                cwd=str(cwd_res),
                env=clean_env(),
                capture_output=True,
                text=True,
                timeout=timeout,
            )
        except subprocess.TimeoutExpired:
            self._send(504, {"ok": False, "error": "timeout", "cmd": cmd[:3]})
            return

        self._send(
            200,
            {
                "ok": proc.returncode == 0,
                "code": proc.returncode,
                "stdout": proc.stdout,
                "stderr": proc.stderr,
                "tool": tool,
            },
        )


class ThreadingUnixHTTPServer(ThreadingMixIn, HTTPServer):
    address_family = socket.AF_UNIX
    daemon_threads = True

    def server_bind(self) -> None:
        if os.path.exists(self.server_address):
            os.unlink(self.server_address)
        HTTPServer.server_bind(self)
        os.chmod(self.server_address, 0o660)


def probe_host() -> None:
    if not ALLOWLIST:
        sys.stderr.write("host-relay: no tools found on PATH/repo.\n")
        sys.exit(1)
    env = clean_env()
    docker_ok = False
    gh_ok = False
    if "docker" in ALLOWLIST:
        docker_ok = (
            subprocess.run(
                [ALLOWLIST["docker"][0], "info"],
                capture_output=True,
                text=True,
                timeout=30,
                env=env,
            ).returncode
            == 0
        )
    if "gh" in ALLOWLIST:
        gh_ok = (
            subprocess.run(
                [ALLOWLIST["gh"][0], "auth", "status"],
                capture_output=True,
                text=True,
                timeout=30,
                env=env,
            ).returncode
            == 0
        )
    if not docker_ok and not gh_ok:
        sys.stderr.write(
            "host-relay: neither docker nor gh works in this shell.\n"
            "Start from your normal terminal (not the agent sandbox).\n"
        )
        sys.exit(1)
    sys.stderr.write(
        f"host-relay probes: docker={'ok' if docker_ok else 'FAIL'} "
        f"gh={'ok' if gh_ok else 'FAIL'} tools={','.join(sorted(ALLOWLIST))}\n"
    )


def main() -> None:
    probe_host()
    SOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    if SOCK_PATH.exists():
        SOCK_PATH.unlink()

    httpd = ThreadingUnixHTTPServer(str(SOCK_PATH), Handler)

    # Compat: point old gh-relay.sock at the same path via symlink
    try:
        if GH_COMPAT_SOCK.exists() or GH_COMPAT_SOCK.is_symlink():
            GH_COMPAT_SOCK.unlink()
        os.symlink(SOCK_PATH.name, GH_COMPAT_SOCK)  # relative symlink in same dir
    except OSError as e:
        sys.stderr.write(f"warn: could not create gh-relay.sock symlink: {e}\n")

    sys.stderr.write(
        f"host-relay listening on unix:{SOCK_PATH}\n"
        f"tools: {', '.join(sorted(ALLOWLIST))}\n"
        f"agent: scripts/host.sh docker ps\n"
        f"       scripts/gh.sh auth status\n"
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        sys.stderr.write("\nhost-relay stopped\n")
    finally:
        try:
            httpd.server_close()
        except Exception:
            pass
        for p in (SOCK_PATH, GH_COMPAT_SOCK):
            try:
                if p.exists() or p.is_symlink():
                    p.unlink()
            except OSError:
                pass


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--self-check":
        # ponytail: ceiling = unit assert only; upgrade = integration against live sock
        assert "gh" in build_allowlist() or "docker" in build_allowlist()
        cmd = resolve_command("gh", ["auth", "status"]) if "gh" in ALLOWLIST else resolve_command(
            "docker", ["ps"]
        )
        assert cmd[0]
        assert all("\x00" not in a for a in cmd)
        try:
            resolve_command("rm", ["-rf", "/"])
            raise SystemExit("should have rejected unknown tool")
        except ValueError:
            pass
        print("host-relay self-check ok")
        raise SystemExit(0)
    main()
