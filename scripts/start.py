#!/usr/bin/env python3
"""Cross-platform launcher for the ErikOS project.

This script bootstraps a virtual environment, installs dependencies
and starts the Flask backend together with the static front-end.  It
works on both Windows and Unix-like systems without requiring any
external packages beyond the Python standard library.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import logging
from logging.handlers import RotatingFileHandler
import os
import socket
import subprocess
import sys
import threading
import time
import urllib.request
import venv
import webbrowser
from pathlib import Path

try:  # optional dependency
    from dotenv import load_dotenv
except Exception:  # pragma: no cover - best effort
    load_dotenv = None

REPO_ROOT = Path(__file__).resolve().parents[1]
VENV_DIR = REPO_ROOT / ".venv"
REQUIREMENTS = REPO_ROOT / "requirements.txt"
DRIVE_APP = REPO_ROOT / "DRIVE" / "app.py"
LOG_DIR = REPO_ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / f"server-{_dt.date.today():%Y%m%d}.log"

# Load environment variables from .env if python-dotenv is available
if load_dotenv is not None:
    dotenv_path = REPO_ROOT / ".env"
    if dotenv_path.exists():
        load_dotenv(dotenv_path)


def ensure_python() -> None:
    if sys.version_info < (3, 10):
        print("Python 3.10+ is required", file=sys.stderr)
        sys.exit(1)


def venv_python() -> Path:
    if os.name == "nt":
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def ensure_venv() -> None:
    if not VENV_DIR.exists():
        print("Creating virtual environment...")
        venv.create(VENV_DIR, with_pip=True)


def install_requirements(python: Path) -> None:
    if REQUIREMENTS.exists():
        cmd = [str(python), "-m", "pip", "install", "-r", str(REQUIREMENTS)]
        try:
            subprocess.check_call(cmd)
        except subprocess.CalledProcessError as exc:
            print(f"Failed to install requirements: {exc}", file=sys.stderr)
            sys.exit(exc.returncode)


def find_free_port(start: int = 8000) -> int:
    port = start
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
            except OSError:
                port += 1
            else:
                return port


def start_backend(python: Path, host: str, port: int) -> subprocess.Popen[str]:
    env = os.environ.copy()
    env["PORT"] = str(port)
    env["HOST"] = host
    # Ensure the project root is on PYTHONPATH so local packages can be
    # imported when the server starts.
    existing = env.get("PYTHONPATH")
    if existing:
        env["PYTHONPATH"] = f"{REPO_ROOT}{os.pathsep}{existing}"
    else:
        env["PYTHONPATH"] = str(REPO_ROOT)
    cmd = [str(python), "-m", "DRIVE.app"]
    try:
        return subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
            cwd=REPO_ROOT,
        )
    except Exception as exc:
        print(f"Failed to start server: {exc}", file=sys.stderr)
        raise


def monitor_process(proc: subprocess.Popen[str], logger: logging.Logger) -> list[str]:
    tail: list[str] = []

    def _reader(stream, level):
        for line in iter(stream.readline, ""):
            line = line.rstrip()
            tail.append(line)
            if len(tail) > 200:
                tail.pop(0)
            logger.log(level, line)
        stream.close()

    threads = [
        threading.Thread(target=_reader, args=(proc.stdout, logging.INFO), daemon=True),
        threading.Thread(target=_reader, args=(proc.stderr, logging.ERROR), daemon=True),
    ]
    for t in threads:
        t.start()
    return tail


def wait_for_server(port: int, timeout: int = 30) -> bool:
    url = f"http://127.0.0.1:{port}/api/status"
    end = time.time() + timeout
    while time.time() < end:
        try:
            with urllib.request.urlopen(url) as resp:
                data = json.load(resp)
                if data.get("status"):
                    return True
        except Exception:
            time.sleep(0.5)
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Launch ErikOS")
    parser.add_argument("--port", type=int, default=8000, help="preferred port")
    parser.add_argument("--host", default="127.0.0.1", help="host interface")
    parser.add_argument("--no-browser", action="store_true", help="do not open browser")
    args = parser.parse_args()

    ensure_python()
    ensure_venv()
    py = venv_python()
    install_requirements(py)
    port = find_free_port(args.port)

    handler = RotatingFileHandler(
        LOG_FILE, maxBytes=1_000_000, backupCount=10, encoding="utf-8"
    )
    logging.basicConfig(level=logging.INFO, handlers=[handler])
    logger = logging.getLogger("server")

    try:
        proc = start_backend(py, args.host, port)
    except Exception:
        return 1
    tail = monitor_process(proc, logger)

    if wait_for_server(port):
        if not args.no_browser:
            webbrowser.open(f"http://{args.host}:{port}/index.html")
    else:
        print("Server did not start in time", file=sys.stderr)

    try:
        returncode = proc.wait()
    except KeyboardInterrupt:
        proc.terminate()
        returncode = proc.wait()

    if returncode != 0:
        print(f"Server exited with code {returncode}")
        print("Last 200 log lines:")
        for line in tail[-200:]:
            print(line)
    else:
        print("Server stopped.")
    return returncode


if __name__ == "__main__":
    sys.exit(main())
