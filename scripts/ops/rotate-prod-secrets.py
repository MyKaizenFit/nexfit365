#!/usr/bin/env python3
"""Rotate selected production secrets in place. Never prints secret values.

Usage (host, with backups):
  python3 scripts/ops/rotate-prod-secrets.py --apply

Safe to rotate here: SECRET_KEY, JWT_*, REDIS_PASSWORD(+REDIS_URL), VAPID_*.
Never rotates ENCRYPTION_KEY / DB / SMTP / FatSecret (manual or STOP).
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import re
import secrets
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("/srv/mykaizenfit/pro")
BACKEND_ENV = ROOT / "docker" / "backend.env.production"
FRONTEND_ENV = ROOT / "frontend" / "docker.env.production"
BACKUP_DIR = ROOT / "data" / "secret-rotation-backups"


def _fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]


def _set_env_key(path: Path, key: str, value: str) -> None:
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(rf"^(?:export\s+)?{re.escape(key)}=.*$", re.M)
    line = f"{key}={value}"
    if pattern.search(text):
        text = pattern.sub(line, text, count=1)
    else:
        if not text.endswith("\n"):
            text += "\n"
        text += line + "\n"
    path.write_text(text, encoding="utf-8")


def _get_env_key(path: Path, key: str) -> str | None:
    text = path.read_text(encoding="utf-8")
    m = re.search(rf"^(?:export\s+)?{re.escape(key)}=(.*)$", text, re.M)
    if not m:
        return None
    return m.group(1).strip().strip('"').strip("'")


def _django_secret() -> str:
    # Same charset approach as Django get_random_secret_key
    chars = "abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(-_=+)"
    return "".join(secrets.choice(chars) for _ in range(50))


def _token() -> str:
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode("ascii")


def _redis_password() -> str:
    return secrets.token_urlsafe(32)


def _generate_vapid() -> tuple[str, str]:
    """Return (public, private-env-escaped) via backend container; no values printed."""
    cmd = [
        str(ROOT / "scripts" / "host.sh"),
        "docker",
        "compose",
        "-f",
        "docker-compose.prod.yml",
        "exec",
        "-T",
        "backend",
        "python",
        "manage.py",
        "generate_vapid_keys",
    ]
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=True)
    out = proc.stdout
    m_pub = re.search(r"^VAPID_PUBLIC_KEY=(\S+)\s*$", out, re.M)
    m_priv = re.search(r'^VAPID_PRIVATE_KEY="([^"]+)"\s*$', out, re.M)
    if not m_pub or not m_priv:
        raise RuntimeError("generate_vapid_keys output missing expected KEY= lines")
    return m_pub.group(1), m_priv.group(1)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write new secrets")
    parser.add_argument("--dry-run", action="store_true", help="Show plan only")
    args = parser.parse_args()
    if not args.apply and not args.dry_run:
        args.dry_run = True

    for path in (BACKEND_ENV, FRONTEND_ENV):
        if not path.is_file():
            print(f"MISSING {path}", file=sys.stderr)
            return 1

    plan = [
        "SECRET_KEY",
        "JWT_SECRET",
        "JWT_REFRESH_SECRET",
        "REDIS_PASSWORD (+ REDIS_URL)",
        "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (+ frontend NEXT_PUBLIC_VAPID_PUBLIC_KEY)",
    ]
    skip = [
        "ENCRYPTION_KEY (STOP — ciphertext in DB; needs re-encrypt plan)",
        "DB/POSTGRES passwords (already distinct from historical tip leak)",
        "SMTP_* (rotate at provider console if history ever matched)",
        "FATSECRET_* (rotate at FatSecret console)",
    ]
    print("Will rotate:")
    for item in plan:
        print(f"  - {item}")
    print("Will NOT rotate:")
    for item in skip:
        print(f"  - {item}")

    if args.dry_run and not args.apply:
        print("Dry-run only. Re-run with --apply to write.")
        return 0

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    for path in (BACKEND_ENV, FRONTEND_ENV):
        dest = BACKUP_DIR / f"{path.name}.{stamp}.bak"
        shutil.copy2(path, dest)
        dest.chmod(0o600)
        print(f"backup {path.name} -> {dest.name}")

    before = {
        "SECRET_KEY": _fingerprint(_get_env_key(BACKEND_ENV, "SECRET_KEY") or ""),
        "JWT_SECRET": _fingerprint(_get_env_key(BACKEND_ENV, "JWT_SECRET") or ""),
        "REDIS_PASSWORD": _fingerprint(_get_env_key(BACKEND_ENV, "REDIS_PASSWORD") or ""),
        "VAPID_PUBLIC_KEY": _fingerprint(_get_env_key(BACKEND_ENV, "VAPID_PUBLIC_KEY") or ""),
    }

    secret_key = _django_secret()
    jwt_secret = _token()
    jwt_refresh = _token()
    redis_pw = _redis_password()
    vapid_pub, vapid_priv = _generate_vapid()
    claim = _get_env_key(BACKEND_ENV, "VAPID_CLAIM_EMAIL") or "mailto:admin@nexfit365.dpdns.org"

    _set_env_key(BACKEND_ENV, "SECRET_KEY", secret_key)
    _set_env_key(BACKEND_ENV, "JWT_SECRET", jwt_secret)
    _set_env_key(BACKEND_ENV, "JWT_REFRESH_SECRET", jwt_refresh)
    _set_env_key(BACKEND_ENV, "REDIS_PASSWORD", redis_pw)
    _set_env_key(BACKEND_ENV, "REDIS_URL", f"redis://:{redis_pw}@nexfit-pro-redis:6379/0")
    _set_env_key(BACKEND_ENV, "VAPID_PUBLIC_KEY", vapid_pub)
    _set_env_key(BACKEND_ENV, "VAPID_PRIVATE_KEY", f'"{vapid_priv}"')
    _set_env_key(BACKEND_ENV, "VAPID_CLAIM_EMAIL", claim)
    _set_env_key(FRONTEND_ENV, "NEXT_PUBLIC_VAPID_PUBLIC_KEY", vapid_pub)

    after = {
        "SECRET_KEY": _fingerprint(_get_env_key(BACKEND_ENV, "SECRET_KEY") or ""),
        "JWT_SECRET": _fingerprint(_get_env_key(BACKEND_ENV, "JWT_SECRET") or ""),
        "REDIS_PASSWORD": _fingerprint(_get_env_key(BACKEND_ENV, "REDIS_PASSWORD") or ""),
        "VAPID_PUBLIC_KEY": _fingerprint(_get_env_key(BACKEND_ENV, "VAPID_PUBLIC_KEY") or ""),
    }

    print("fingerprints (sha256[:12] before -> after):")
    for key in before:
        changed = "CHANGED" if before[key] != after[key] else "SAME"
        print(f"  {key}: {before[key]} -> {after[key]} [{changed}]")
        if before[key] == after[key]:
            print("ERROR: fingerprint did not change", file=sys.stderr)
            return 2

    print("OK — secrets written. Restart redis then backend/celery/frontend (rebuild).")
    print(f"Backups in {BACKUP_DIR} (gitignored data/).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
