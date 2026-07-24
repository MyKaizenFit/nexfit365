#!/usr/bin/env python3
"""Filesystem Unix-socket GitHub CLI relay for Cursor agent sandbox.

TCP 127.0.0.1 does NOT work across Cursor agent vs host terminal network
namespaces. A Unix socket on the shared repo filesystem does.

Start from a normal terminal (working `gh`):
  bash scripts/start-gh-relay.sh

Agent calls:
  scripts/gh.sh pr list
"""
from __future__ import annotations

import json
import os
import secrets
import socket
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from socketserver import ThreadingMixIn

ROOT = Path(os.environ.get("NEXFIT_ROOT", "/srv/mykaizenfit/pro"))
TOKEN_PATH = ROOT / ".agents" / "gh-relay.token"
SOCK_PATH = Path(os.environ.get("GH_RELAY_SOCK", str(ROOT / ".agents" / "gh-relay.sock")))
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
            self._send(200, {"ok": True, "service": "gh-relay", "sock": str(SOCK_PATH)})
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


class ThreadingUnixHTTPServer(ThreadingMixIn, HTTPServer):
    address_family = socket.AF_UNIX
    daemon_threads = True

    def server_bind(self) -> None:
        if os.path.exists(self.server_address):
            os.unlink(self.server_address)
        HTTPServer.server_bind(self)
        os.chmod(self.server_address, 0o660)


def main() -> None:
    # Clear proxy for the probe too (Cursor integrated terminal may inject it).
    clean = os.environ.copy()
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
        clean.pop(k, None)

    probe = subprocess.run(
        [GH_BIN, "auth", "status"],
        capture_output=True,
        text=True,
        timeout=30,
        env=clean,
    )
    if probe.returncode != 0:
        sys.stderr.write(probe.stdout + probe.stderr)
        sys.stderr.write(
            "\ngh-relay: refuse to start — `gh auth status` failed (even without proxy).\n"
            "Fix: gh auth login -h github.com\n"
        )
        sys.exit(1)

    SOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    if SOCK_PATH.exists():
        SOCK_PATH.unlink()

    httpd = ThreadingUnixHTTPServer(str(SOCK_PATH), Handler)
    sys.stderr.write(
        f"gh-relay listening on unix:{SOCK_PATH}\n"
        f"token file: {TOKEN_PATH}\n"
        f"agent wrapper: scripts/gh.sh\n"
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        sys.stderr.write("\ngh-relay stopped\n")
    finally:
        try:
            httpd.server_close()
        except Exception:
            pass
        if SOCK_PATH.exists():
            SOCK_PATH.unlink()


if __name__ == "__main__":
    main()
