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

REPO_ROOT = Path(__file__).resolve().parents[1]
VENV_DIR = REPO_ROOT / ".venv"
REQUIREMENTS = REPO_ROOT / "requirements.txt"
DRIVE_APP = REPO_ROOT / "DRIVE" / "app.py"
LOG_DIR = REPO_ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / f"server-{_dt.date.today():%Y%m%d}.log"


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
        subprocess.check_call(cmd)


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


def start_backend(python: Path, port: int) -> subprocess.Popen[str]:
    env = os.environ.copy()
    env["FLASK_RUN_PORT"] = str(port)
    cmd = [str(python), str(DRIVE_APP)]
    return subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
    )


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

    proc = start_backend(py, port)
    tail = monitor_process(proc, logger)

    if wait_for_server(port):
        webbrowser.open(f"http://localhost:{port}/index.html")
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
