from __future__ import annotations

"""Self-check diagnostics for the ErikOS backend.

This module walks the repository to perform a series of quick health
checks.  It is intended to be invoked via the ``/api/diagnostics/run``
endpoint and therefore focuses on inexpensive verifications:

* Syntax check all ``.js`` files with ``node --check``.
* Byte-compile all ``.py`` files.
* Parse ``.json`` files.
* Probe all ``/api/...`` endpoints using Flask's test client and record
  their HTTP status codes.
* Ensure the ``icons`` directory exists and contains at least one icon.
* Attempt to load ``profiles.json`` if present.
* Confirm each application's icon path declared in the front-end app
  modules points to an existing file.

Results are appended to ``logs/diagnostics.log`` and a summary is
returned to the caller.
"""

import json
import logging
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

from flask import Flask

BASE_DIR = Path(__file__).resolve().parent.parent
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "diagnostics.log"
CLIENT_ERROR_LOG = LOG_DIR / "client-errors.log"

logger = logging.getLogger("diagnostics")
logger.setLevel(logging.INFO)
handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
handler.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(handler)


def _log(line: str) -> None:
    """Log ``line`` to the diagnostics log."""
    logger.info(line)


def _load_recent_client_errors(limit: int = 50) -> list[dict[str, str]]:
    if limit <= 0 or not CLIENT_ERROR_LOG.exists():
        return []
    try:
        lines = CLIENT_ERROR_LOG.read_text(encoding="utf-8").splitlines()
    except Exception:
        return []
    errors: list[dict[str, str]] = []
    for record in lines[-limit:]:
        try:
            data = json.loads(record)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict):
            normalised = {
                "timestamp": str(data.get("timestamp", "")),
                "app": str(data.get("app", "")),
                "message": str(data.get("message", "")),
                "stack": str(data.get("stack", "")),
            }
            errors.append(normalised)
    return errors


def _check_files(issues: list[str]) -> None:
    """Run syntax/parse checks on repository files."""
    for path in BASE_DIR.rglob("*"):
        if path.is_dir():
            continue
        if path.suffix == ".js":
            try:
                result = subprocess.run(
                    ["node", "--check", str(path)],
                    capture_output=True,
                    text=True,
                )
                _log(f"check js {path} -> {result.returncode}")
                if result.returncode != 0:
                    issues.append(f"JS syntax error in {path}: {result.stderr.strip()}")
            except FileNotFoundError:
                issues.append("node not found for JS check")
                break
        elif path.suffix == ".py":
            result = subprocess.run(
                [sys.executable, "-m", "py_compile", str(path)],
                capture_output=True,
                text=True,
            )
            _log(f"check py {path} -> {result.returncode}")
            if result.returncode != 0:
                issues.append(
                    f"Python compile error in {path}: {result.stderr.strip()}"
                )
        elif path.suffix == ".json":
            try:
                json.loads(path.read_text(encoding="utf-8"))
                _log(f"check json {path} -> ok")
            except Exception as exc:  # pragma: no cover - logging
                issues.append(f"JSON parse error in {path}: {exc}")


def _probe_endpoints(app: Flask, issues: list[str]) -> None:
    """Probe all ``/api/`` endpoints using Flask's test client."""
    with app.test_client() as client:
        for rule in app.url_map.iter_rules():
            if not rule.rule.startswith("/api/") or rule.endpoint == "static":
                continue
            if rule.rule == "/api/diagnostics/run" or "<" in rule.rule:
                continue
            methods = rule.methods - {"HEAD", "OPTIONS"}
            for method in methods:
                try:
                    if method == "GET":
                        resp = client.get(rule.rule)
                    else:
                        resp = client.post(rule.rule, json={})
                    _log(f"probe {rule.rule} {method} -> {resp.status_code}")
                    if resp.status_code >= 500:
                        issues.append(
                            f"Endpoint {rule.rule} {method} returned {resp.status_code}"
                        )
                except Exception as exc:  # pragma: no cover - logging
                    msg = f"Error probing {rule.rule}: {exc}"
                    issues.append(msg)
                    _log(msg)


def _check_icons_and_profiles(issues: list[str]) -> None:
    """Validate icons directory and profile data."""
    icons_dir = BASE_DIR / "icons"
    if not icons_dir.exists() or not any(icons_dir.iterdir()):
        issues.append("icons directory missing or empty")
    else:
        _log(f"icons dir -> {len(list(icons_dir.iterdir()))} files")

    audit_script = BASE_DIR / "tools" / "icon_audit.js"
    if audit_script.exists():
        result = subprocess.run(
            ["node", str(audit_script)],
            capture_output=True,
            text=True,
        )
        _log(f"icon audit -> {result.returncode}")
        if result.stdout:
            _log(result.stdout.strip())
        if result.stderr:
            _log(result.stderr.strip())
        if result.returncode != 0:
            message = (result.stderr or result.stdout or "icon audit failed").strip()
            issues.append(f"Icon audit failed: {message}")
    else:
        issues.append("icon audit script not found")

    profiles = BASE_DIR / "profiles.json"
    if profiles.exists():
        try:
            json.loads(profiles.read_text(encoding="utf-8"))
            _log("profiles.json loaded")
        except Exception as exc:
            issues.append(f"profiles.json invalid: {exc}")
    else:
        _log("profiles.json not found")


def _check_application_icons(issues: list[str]) -> None:
    """Ensure application icon paths in ``src/js/apps`` exist."""
    apps_dir = BASE_DIR / "src" / "js" / "apps"
    if not apps_dir.exists():
        issues.append("apps directory not found")
        return
    for path in apps_dir.glob("*.js"):
        text = path.read_text(encoding="utf-8")
        for match in re.finditer(r"icon:\s*['\"]([^'\"]+)['\"]", text):
            icon_path = match.group(1)
            # Support absolute and relative references
            resolved = (BASE_DIR / icon_path.lstrip("./")).resolve()
            if not resolved.exists():
                issues.append(f"Missing icon file: {icon_path}")


def run_diagnostics(app: Flask) -> dict[str, Any]:
    """Run diagnostics and return a summary dictionary."""
    issues: list[str] = []
    _check_files(issues)
    _probe_endpoints(app, issues)
    _check_icons_and_profiles(issues)
    _check_application_icons(issues)
    return {
        "ok": not issues,
        "issues": issues,
        "errors": _load_recent_client_errors(50),
    }
