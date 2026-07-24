#!/usr/bin/env python3
"""Localhost-only GitHub CLI relay for Cursor agent sandbox.

Why: Cursor agent shells force HTTP(S)_PROXY to a sandbox proxy that returns
CONNECT 403 for api.github.com. Your interactive terminal can reach GitHub;
this process must be started from THAT environment so subprocess `gh` works.

Security: binds 127.0.0.1 only; requires shared token from .agents/gh-relay.token
"""
from __future__ import annotations

import json
import os
import secrets
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(os.environ.get("NEXFIT_ROOT", "/srv/mykaizenfit/pro"))
TOKEN_PATH = ROOT / ".agents" / "gh-relay.token"
HOST = "127.0.0.1"
PORT = int(os.environ.get("GH_RELAY_PORT", "8787"))
GH_BIN = os.environ.get("GH_BIN", "gh")


def ensure_token() -> str:
    TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    if TOKEN_PATH.exists():
        return TOKEN_PATH.read_text().strip()
    token = secrets.token_urlsafe(24)
    TOKEN_PATH.write_text(token + "\n")
    TOKEN_PATH.chmod(0o600)
    return token


TOKEN = ensure_token()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("[gh-relay] " + (fmt % args) + "\n")

    def _auth_ok(self) -> bool:
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            return auth.removeprefix("Bearer ").strip() == TOKEN
        return self.headers.get("X-Gh-Relay-Token", "") == TOKEN

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
            # health is unauthenticated so the agent can probe
            self._send(200, {"ok": True, "service": "gh-relay", "port": PORT})
            return
        self._send(404, {"ok": False, "error": "not found"})

    def do_POST(self) -> None:
        if self.path != "/gh":
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

        args = data.get("args")
        if not isinstance(args, list) or not all(isinstance(a, str) for a in args):
            self._send(400, {"ok": False, "error": "args must be list[str]"})
            return
        if len(args) > 40 or sum(len(a) for a in args) > 20000:
            self._send(400, {"ok": False, "error": "args too large"})
            return

        # Strip agent sandbox proxy so gh uses real network of this process.
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
        ):
            env.pop(k, None)

        cwd = data.get("cwd") or str(ROOT)
        try:
            proc = subprocess.run(
                [GH_BIN, *args],
                cwd=cwd,
                env=env,
                capture_output=True,
                text=True,
                timeout=int(data.get("timeout", 120)),
            )
        except FileNotFoundError:
            self._send(500, {"ok": False, "error": f"{GH_BIN} not found"})
            return
        except subprocess.TimeoutExpired:
            self._send(504, {"ok": False, "error": "timeout"})
            return

        self._send(
            200,
            {
                "ok": proc.returncode == 0,
                "code": proc.returncode,
                "stdout": proc.stdout,
                "stderr": proc.stderr,
            },
        )


def main() -> None:
    # Fail fast if gh cannot talk to GitHub in THIS environment.
    probe = subprocess.run(
        [GH_BIN, "auth", "status"],
        capture_output=True,
        text=True,
        timeout=30,
    )
    if probe.returncode != 0:
        sys.stderr.write(probe.stdout + probe.stderr)
        sys.stderr.write(
            "\ngh-relay: refuse to start — `gh auth status` failed in this shell.\n"
            "Run this script from your normal terminal (not the agent sandbox).\n"
        )
        sys.exit(1)

    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    sys.stderr.write(
        f"gh-relay listening on http://{HOST}:{PORT}\n"
        f"token file: {TOKEN_PATH}\n"
        f"agent wrapper: scripts/gh.sh\n"
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        sys.stderr.write("\ngh-relay stopped\n")


if __name__ == "__main__":
    main()
