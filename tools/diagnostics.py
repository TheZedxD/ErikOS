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
* Confirm each application's icon path in ``main.js`` points to an
  existing file.

Results are appended to ``logs/diagnostics.log`` and a summary is
returned to the caller.
"""

import json
import logging
import subprocess
import sys
from pathlib import Path
from typing import Any

from flask import Flask

BASE_DIR = Path(__file__).resolve().parent.parent
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "diagnostics.log"

logger = logging.getLogger("diagnostics")
logger.setLevel(logging.INFO)
handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
handler.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(handler)


def _log(line: str) -> None:
    """Log ``line`` to the diagnostics log."""
    logger.info(line)


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
    """Ensure application icon paths in ``main.js`` exist."""
    main_js = BASE_DIR / "main.js"
    if not main_js.exists():
        issues.append("main.js not found")
        return
    text = main_js.read_text(encoding="utf-8")
    import re

    for match in re.finditer(r"icon:\s*\"([^\"]+)\"", text):
        icon_path = match.group(1)
        if not (BASE_DIR / icon_path).exists():
            issues.append(f"Missing icon file: {icon_path}")


def run_diagnostics(app: Flask) -> dict[str, Any]:
    """Run diagnostics and return a summary dictionary."""
    issues: list[str] = []
    _check_files(issues)
    _probe_endpoints(app, issues)
    _check_icons_and_profiles(issues)
    _check_application_icons(issues)
    return {"ok": not issues, "issues": issues}
