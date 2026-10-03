import json
from datetime import datetime, timedelta, timezone
from io import StringIO

import pytest
from django.core.management import call_command

from api.error_reporting import REPORT_FORMAT_VERSION, cleanup_error_reports


def _name(stamp: str, report_id: str) -> str:
    return f"{stamp}-{report_id}.json"


def _sanitized(report_id: str, when: datetime) -> dict:
    return {
        "id": report_id,
        "format_version": REPORT_FORMAT_VERSION,
        "timestamp_utc": when.isoformat(),
        "user": {"authenticated": True, "id": 7},
        "request": {
            "method": "PATCH",
            "path": "/api/profile/",
            "headers": {"content-type": "application/json"},
        },
    }


def _write(directory, name: str, payload) -> None:
    (directory / name).write_text(json.dumps(payload), encoding="utf-8")


@pytest.fixture
def report_dir(tmp_path, settings):
    directory = tmp_path / "error-reports"
    directory.mkdir()
    settings.ERROR_REPORT_LOG_DIR = str(directory)
    settings.ERROR_REPORT_RETENTION_DAYS = 90
    return directory


def test_cleanup_deletes_old_reports_and_keeps_fresh_sanitized_ones(report_dir, tmp_path):
    now = datetime(2026, 10, 3, tzinfo=timezone.utc)
    old_id = "a" * 32
    health_id = "b" * 32
    fresh_id = "c" * 32
    stale_id = "d" * 32
    _write(
        report_dir,
        _name("20261003-000001", old_id),
        {
            "id": old_id,
            "user": {"email": "persona@example.invalid"},
            "request": {"data": {"weight": 81.25}, "full_path": "/api/profile/?token=qa-token"},
        },
    )
    _write(
        report_dir,
        _name("20261003-000002", health_id),
        {"id": health_id, "request": {"data": {"allergies": "qa-alergia-1ea3", "medical_conditions": "qa-condicion"}}},
    )
    _write(report_dir, _name("20261003-000003", fresh_id), _sanitized(fresh_id, now - timedelta(days=10)))
    _write(report_dir, _name("20260701-000004", stale_id), _sanitized(stale_id, now - timedelta(days=100)))
    outside = tmp_path / "fuera.txt"
    outside.write_text("no tocar", encoding="utf-8")
    (report_dir / "notas.txt").write_text("archivo ajeno", encoding="utf-8")
    target = tmp_path / "objetivo.txt"
    target.write_text("fuera del directorio", encoding="utf-8")
    link = report_dir / _name("20261003-000005", "e" * 32)
    link.symlink_to(target)

    preview = cleanup_error_reports(execute=False, now=now)
    assert preview["old_format"] == 2
    assert preview["expired"] == 1
    assert preview["kept"] == 1
    assert preview["rejected"] == 1
    assert preview["deleted"] == 0
    assert preview["errors"] == 0
    assert outside.read_text(encoding="utf-8") == "no tocar"
    assert target.read_text(encoding="utf-8") == "fuera del directorio"
    assert link.is_symlink()

    done = cleanup_error_reports(execute=True, now=now)
    assert done["deleted"] == 3
    assert done["errors"] == 0
    assert not (report_dir / _name("20261003-000001", old_id)).exists()
    assert not (report_dir / _name("20261003-000002", health_id)).exists()
    assert (report_dir / _name("20261003-000003", fresh_id)).exists()
    assert not (report_dir / _name("20260701-000004", stale_id)).exists()
    assert (report_dir / "notas.txt").exists()
    assert outside.exists()
    assert target.exists()
    assert link.is_symlink()

    again = cleanup_error_reports(execute=True, now=now)
    assert again["deleted"] == 0
    assert again["old_format"] == 0
    assert again["expired"] == 0
    assert again["errors"] == 0
    assert (report_dir / _name("20261003-000003", fresh_id)).exists()


def test_cleanup_command_dry_run_does_not_print_payload(report_dir):
    report_id = "f" * 32
    _write(
        report_dir,
        _name("20261003-000009", report_id),
        {"id": report_id, "user": {"email": "persona@example.invalid"}, "request": {"data": {"weight": 81.25}}},
    )
    stdout = StringIO()
    call_command("cleanup_error_reports", "--dry-run", stdout=stdout)
    text = stdout.getvalue()
    assert "old_format=1" in text
    assert "deleted=0" in text
    assert "persona@example.invalid" not in text
    assert "81.25" not in text
    assert (report_dir / _name("20261003-000009", report_id)).exists()

    call_command("cleanup_error_reports", "--execute", stdout=StringIO())
    assert not (report_dir / _name("20261003-000009", report_id)).exists()
