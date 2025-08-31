"""
Flask backend for the Win95‑style browser desktop.

This module defines a simple API and static file server to accompany
the front‑end application.  It exposes endpoints for checking the
server status, processing icon images to make white backgrounds
transparent, running arbitrary Python scripts in the background,
terminating those scripts, listing running scripts and executing
whitelisted shell commands.  Static assets (HTML, JavaScript, CSS,
images and icons) are served from the parent directory of this file.

Note: This server assumes that Flask and Pillow are installed in the
Python environment.  If they are unavailable you will need to
install them (e.g. via pip).  The server does not perform any
authentication or rate limiting; it is intended for a trusted local
environment.
"""

import base64
import json
import os
import shlex
import subprocess
import sys
import tempfile
import time
import traceback
import uuid
from datetime import datetime
from pathlib import Path
import logging
from logging.handlers import RotatingFileHandler
import threading
from io import StringIO

from flask import Flask, jsonify, request, send_from_directory, g
from werkzeug.utils import secure_filename

import requests

from tools.diagnostics import run_diagnostics
from .config import settings
from .__version__ import __version__

BASE_DIR = settings.root_dir
STATIC_DIR = BASE_DIR
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)
LOG_FILE = LOGS_DIR / f"server-{datetime.now():%Y%m%d}.log"


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        data: dict[str, object] = {
            "time": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "message": record.getMessage(),
        }
        for key in ("request_id", "path", "status", "duration"):
            value = getattr(record, key, None)
            if value is not None:
                data[key] = value
        return json.dumps(data)


handler = RotatingFileHandler(LOG_FILE, maxBytes=1_000_000, backupCount=5)
handler.setFormatter(JsonFormatter())
logger = logging.getLogger("server")
logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
logger.addHandler(handler)


app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")
app.logger = logger


@app.before_request
def _start_request() -> None:
    g.request_id = uuid.uuid4().hex
    g.start_time = time.time()


def _origin_allowed(origin: str) -> bool:
    for allowed in settings.allowed_origins:
        if allowed.endswith("*"):
            if origin.startswith(allowed[:-1]):
                return True
        elif origin == allowed:
            return True
    return False


@app.after_request
def _log_response(response):
    duration = time.time() - g.start_time
    logger.info(
        "request",
        extra={
            "request_id": g.request_id,
            "path": request.path,
            "status": response.status_code,
            "duration": round(duration, 3),
        },
    )
    response.headers["X-Request-ID"] = g.request_id
    origin = request.headers.get("Origin")
    if origin and _origin_allowed(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response
for d in ("icons", "profiles", "logs", "documents"):
    (BASE_DIR / d).mkdir(exist_ok=True)


@app.get("/api/health")
def health():
    """Simple health check endpoint."""
    return jsonify({"ok": True, "cwd": str(BASE_DIR)})

try:  # optional dependency
    import psutil  # type: ignore
except Exception:  # pragma: no cover - best effort logging
    psutil = None
    logger.warning("psutil module not found; /api/system-stats will be unavailable")

# In-memory store of running subprocesses.  Keys are integer PIDs and
# values are subprocess.Popen objects.  The mapping is persisted to a
# small JSON file so that PIDs can be verified between requests.
RUNTIME_DIR = Path(__file__).resolve().parent / "runtime"
RUNTIME_DIR.mkdir(exist_ok=True)
STATE_FILE = RUNTIME_DIR / "processes.json"
processes: dict[int, subprocess.Popen] = {}


def _save_state() -> None:
    try:
        with STATE_FILE.open("w", encoding="utf-8") as fh:
            json.dump({pid: proc.args[-1] if hasattr(proc, "args") else "" for pid, proc in processes.items()}, fh)
    except Exception:
        app.logger.exception("Failed saving process state")


def _load_state() -> dict[int, str]:
    try:
        with STATE_FILE.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
            return {int(k): v for k, v in data.items()}
    except Exception:
        return {}


# Whitelist of allowed shell commands for execute_command.
ALLOWED_COMMANDS = set(settings.terminal_whitelist)

# Registry for asynchronous command execution
command_jobs: dict[str, dict[str, object]] = {}

# Directory where chat histories are stored.  A JSON file is created for
# each profile under this folder.
CHAT_HISTORY_DIR = BASE_DIR / "chat_history"
CHAT_HISTORY_DIR.mkdir(exist_ok=True)


def _safe_profile_name(name: str) -> str:
    """Return a filesystem‑safe version of a profile name."""
    return "".join(c for c in name if c.isalnum() or c in {"-", "_"}) or "default"


def load_chat_history(profile: str) -> list[dict]:
    """Load chat history for ``profile`` from disk."""
    path = CHAT_HISTORY_DIR / f"{profile}.json"
    if path.exists():
        try:
            with path.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
                if isinstance(data, list):
                    return data
        except Exception:
            app.logger.exception("Failed reading chat history for %s", profile)
    return []


def detect_ollama_models() -> tuple[list[str], str | None]:
    """Detect installed Ollama models via HTTP API."""
    models: list[str] = []
    error: str | None = None

    try:
        # Call Ollama API to list models
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if "models" in data:
                models = [model["name"] for model in data["models"]]
        else:
            error = f"Ollama API returned status {response.status_code}"
    except requests.exceptions.ConnectionError:
        error = "Cannot connect to Ollama. Make sure Ollama is running (ollama serve)"
    except requests.exceptions.Timeout:
        error = "Ollama request timed out"
    except Exception as exc:
        error = str(exc)
        app.logger.exception("Error connecting to Ollama API")

    if not models and error is None:
        error = "No models found. Install models using: ollama pull llama3.2:3b"

    return models, error


@app.route("/api/ollama/models")
def list_ollama_models():
    """Return a list of available models from Ollama."""
    models, error = detect_ollama_models()

    if error and not models:
        return jsonify({"ok": False, "models": [], "error": error}), 500

    response = {"ok": True, "models": models}
    if error:
        response["warning"] = error

    # Set default models if none selected
    response["defaultText"] = "llama3.2:3b" if "llama3.2:3b" in models else (models[0] if models else None)
    response["defaultImage"] = "llava:7b" if "llava:7b" in models else None

    return jsonify(response)


@app.get("/api/ollama/history/<profile>")
def get_chat_history(profile: str):
    """Return stored chat history for the given profile."""
    profile = _safe_profile_name(profile)
    history = load_chat_history(profile)
    return jsonify({"history": history})


@app.route("/api/ollama/chat", methods=["POST"])
def run_ollama():
    """Run a prompt against Ollama via HTTP API."""
    data = request.get_json(silent=True) or {}
    model = data.get("model")
    prompt = data.get("prompt", "")
    image_b64 = data.get("image")
    history = data.get("history", [])
    profile = data.get("profile")

    if not prompt and not image_b64:
        return jsonify({"ok": False, "error": "prompt is required"}), 400

    # Get available models and set defaults
    models, _ = detect_ollama_models()

    # If no model specified, use defaults
    if not model:
        if image_b64:
            model = "llava:7b" if "llava:7b" in models else "llava"
        else:
            model = "llama3.2:3b" if "llama3.2:3b" in models else (models[0] if models else "llama3.2")

    # Prepare the request to Ollama API
    ollama_url = "http://localhost:11434/api/generate"

    # Build the request payload
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False  # Always false for simplicity
    }

    # Add image if provided (for multimodal models)
    if image_b64:
        payload["images"] = [image_b64]

    # Add context from history if available
    if history:
        context = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history[-5:]])  # Last 5 messages
        payload["prompt"] = f"{context}\nuser: {prompt}\nassistant:"

    try:
        # Make request to Ollama
        response = requests.post(ollama_url, json=payload, timeout=60)

        if response.status_code != 200:
            error_msg = response.text or f"Ollama returned status {response.status_code}"
            return jsonify({"ok": False, "error": error_msg}), 500

        # Parse response
        result = response.json()
        response_text = result.get("response", "")

        # Update conversation history
        if history:
            history.append({"role": "user", "content": prompt})
            history.append({"role": "assistant", "content": response_text})
        else:
            history = [
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": response_text}
            ]

        # Save to profile if provided
        if profile:
            try:
                prof = _safe_profile_name(profile)
                path = CHAT_HISTORY_DIR / f"{prof}.json"
                with path.open("w", encoding="utf-8") as fh:
                    json.dump(history, fh)
            except Exception:
                app.logger.exception("Failed writing chat history for %s", profile)

        return jsonify({
            "ok": True,
            "response": response_text,
            "model": model,
            "history": history
        })

    except requests.exceptions.ConnectionError:
        return jsonify({
            "ok": False,
            "error": "Cannot connect to Ollama. Please ensure Ollama is running."
        }), 500
    except requests.exceptions.Timeout:
        return jsonify({
            "ok": False,
            "error": "Request timed out. The model may be loading or the prompt is too complex."
        }), 500
    except Exception as exc:
        app.logger.exception("Error calling Ollama API")
        return jsonify({"ok": False, "error": str(exc)}), 500


@app.route("/")
def index() -> "str":
    """Serve the main HTML page for the desktop application."""
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/<path:filename>")
def serve_static(filename: str):
    """Serve other static assets such as JS, CSS, images or icons.

    Flask will look up files relative to the static folder specified
    above.  If the file does not exist a 404 will be returned.
    """
    return send_from_directory(STATIC_DIR, filename)


@app.route("/api/status")
def status() -> "Response":
    """Return health information for readiness checks."""
    return jsonify(
        {
            "status": "ok",
            "version": __version__,
            "time": datetime.utcnow().isoformat(),
        }
    )


@app.route("/api/version")
def get_version():
    """Return the application version."""
    return jsonify({"version": __version__})


@app.route("/api/process-icons", methods=["POST"])
def process_icons_endpoint():
    """Run the icon processing script on the icons directory.

    This endpoint spawns the process_icons.py script as a child
    process, passing the icons directory as its argument.  On
    completion it returns a JSON response indicating success or
    failure.  Errors are returned with an "error" key in the
    response.
    """
    icons_dir = BASE_DIR / "icons"
    script_path = Path(__file__).resolve().parent / "process_icons.py"
    try:
        result = subprocess.run(
            [sys.executable, str(script_path), str(icons_dir)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            return (
                jsonify(
                    {"ok": False, "success": False, "error": result.stderr.strip()}
                ),
                500,
            )
        return jsonify({"success": True, "output": result.stdout.strip()})
    except Exception as exc:
        return jsonify({"ok": False, "success": False, "error": str(exc)}), 500


@app.route("/api/system-stats")
def system_stats():
    """Return current CPU and RAM utilisation as percentages."""
    try:
        cpu = psutil.cpu_percent()
        ram = psutil.virtual_memory().percent
        return jsonify({"cpu": cpu, "ram": ram})
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


@app.route("/api/list-icons")
def list_icons():
    """Return a list of available PNG icon filenames."""
    icon_dir = BASE_DIR / "icons"
    files = [f.name for f in icon_dir.glob("*.png")]
    return jsonify({"ok": True, "icons": files})


@app.route("/api/upload-icon", methods=["POST"])
def upload_icon():
    """Upload a PNG icon to the icons directory."""
    file = request.files.get("file")
    if request.content_length and request.content_length > settings.max_upload_mb * 1024 * 1024:
        return json_error("File too large", 413)
    if not file or file.mimetype != "image/png" or not file.filename.lower().endswith(".png"):
        return json_error("png only")
    icon_dir = BASE_DIR / "icons"
    icon_dir.mkdir(parents=True, exist_ok=True)
    filename = secure_filename(file.filename)
    dest = icon_dir / filename
    file.save(dest)
    return jsonify({"ok": True, "file": filename})


# ---------------------------------------------------------------------------
# File manager endpoints
# ---------------------------------------------------------------------------

# Base directory that the file manager is allowed to access. Paths provided by
# the client are interpreted relative to this directory. The resolved path is
# always checked to ensure it does not escape this directory to mitigate
# directory traversal attacks.
FILE_BASE = settings.root_dir.resolve()


def safe_join(rel_path: str) -> Path:
    """Return an absolute path under ``FILE_BASE`` for ``rel_path``.

    The ``rel_path`` may come from untrusted sources, so this function
    normalises path separators, rejects absolute paths/drives and ensures the
    final resolved path is still within ``FILE_BASE``.  ``ValueError`` is
    raised if the path escapes the base directory.
    """

    # Treat Windows backslashes as separators even when running on POSIX
    # systems.  This prevents traversal attempts such as ``..\\secret`` from
    # being interpreted as a literal file name on Unix.
    normalised = rel_path.replace("\\", "/")
    rel = Path(normalised)

    # Disallow absolute paths or explicit drive references
    if rel.is_absolute() or getattr(rel, "drive", ""):
        raise ValueError("Path escapes base directory")

    target = (FILE_BASE / rel).resolve()
    try:
        if not target.is_relative_to(FILE_BASE):  # type: ignore[attr-defined]
            raise ValueError("Path escapes base directory")
    except AttributeError:  # Python <3.9 fallback
        if os.path.commonpath([FILE_BASE, target]) != str(FILE_BASE):
            raise ValueError("Path escapes base directory")
    return target


def json_error(message: str, status: int = 400):
    return jsonify({"ok": False, "error": message}), status


@app.route("/api/list-directory")
def list_directory():
    """Return contents of a directory as JSON."""
    rel = request.args.get("path", "")
    try:
        path = safe_join(rel)
        if not path.exists() or not path.is_dir():
            return json_error("Not a directory")
        items = []
        for entry in os.scandir(path):
            info = entry.stat()
            items.append(
                {
                    "name": entry.name,
                    "path": str(Path(rel) / entry.name),
                    "isDir": entry.is_dir(),
                    "size": info.st_size,
                    "mtime": int(info.st_mtime),
                }
            )
        return jsonify({"items": items, "path": rel})
    except ValueError:
        return json_error("Invalid path")
    except Exception as exc:
        return json_error(str(exc), 500)


@app.route("/api/create-folder", methods=["POST"])
def create_folder():
    data = request.get_json(silent=True) or {}
    rel = data.get("path", "")
    name = data.get("name")
    if not name:
        return json_error("name is required")
    try:
        path = safe_join(rel) / name
        path.mkdir(parents=False, exist_ok=False)
        return jsonify({"success": True})
    except FileExistsError:
        return json_error("Folder exists")
    except ValueError:
        return json_error("Invalid path")
    except Exception as exc:
        return json_error(str(exc), 500)


@app.route("/api/rename", methods=["POST"])
def rename_item():
    data = request.get_json(silent=True) or {}
    rel = data.get("path")
    new_name = data.get("new_name")
    if not rel or not new_name:
        return json_error("path and new_name required")
    try:
        src = safe_join(rel)
        dst = src.parent / new_name
        src.rename(dst)
        return jsonify({"success": True})
    except FileNotFoundError:
        return json_error("Not found", 404)
    except ValueError:
        return json_error("Invalid path")
    except Exception as exc:
        return json_error(str(exc), 500)


@app.route("/api/delete", methods=["POST"])
def delete_item():
    data = request.get_json(silent=True) or {}
    rel = data.get("path")
    if not rel:
        return json_error("path is required")
    try:
        target = safe_join(rel)
        if target.is_dir():
            os.rmdir(target)
        else:
            target.unlink()
        return jsonify({"success": True})
    except FileNotFoundError:
        return json_error("Not found", 404)
    except OSError as exc:
        return json_error(str(exc))
    except ValueError:
        return json_error("Invalid path")
    except Exception as exc:
        return json_error(str(exc), 500)


@app.route("/api/upload", methods=["POST"])
def upload_file():
    rel = request.form.get("path", "")
    file = request.files.get("file")
    if not file:
        return jsonify({"ok": False, "error": "file is required"}), 400
    if request.content_length and request.content_length > settings.max_upload_mb * 1024 * 1024:
        return jsonify({"ok": False, "error": "File too large"}), 413
    try:
        directory = safe_join(rel)
        directory.mkdir(parents=True, exist_ok=True)
        dest = directory / file.filename
        file.save(dest)
        return jsonify({"success": True})
    except ValueError:
        return jsonify({"ok": False, "error": "Invalid path"}), 400
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


@app.route("/api/run-script", methods=["POST"])
def run_script():
    """Start a Python script as a background process.

    Expects JSON payload with a "script_name" key specifying the
    filename (relative to the project root) of the Python script to
    execute.  The script is launched using the same Python interpreter
    as this server.  Returns the PID of the spawned process.
    """
    data = request.get_json(silent=True) or {}
    script_name = data.get("script_name")
    if not script_name:
        return jsonify({"ok": False, "error": "script_name is required"}), 400
    script_path = BASE_DIR / script_name
    if not script_path.exists():
        return jsonify({"ok": False, "error": f"Script '{script_name}' not found"}), 404
    try:
        proc = subprocess.Popen([sys.executable, str(script_path)])
        processes[proc.pid] = proc
        _save_state()
        return jsonify({"pid": proc.pid, "script": script_name})
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


@app.route("/api/stop-script", methods=["POST"])
def stop_script():
    """Terminate a previously started background script.

    Expects JSON payload with a "pid" key.  If the PID is known it
    will be terminated.  Returns a confirmation or error message.
    """
    data = request.get_json(silent=True) or {}
    pid = data.get("pid")
    if pid is None:
        return jsonify({"ok": False, "error": "pid is required"}), 400
    state = _load_state()
    if pid not in state:
        return jsonify({"ok": False, "error": f"Process {pid} not found"}), 404
    proc = processes.get(pid)
    if not proc:
        return jsonify({"ok": False, "error": f"Process {pid} not running"}), 404
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
    processes.pop(pid, None)
    _save_state()
    return jsonify({"stopped": pid})


@app.route("/api/list-scripts")
def list_scripts():
    """Return a list of running background scripts and their PIDs."""
    alive = []
    # Remove processes that have exited
    for pid, proc in list(processes.items()):
        if proc.poll() is not None:
            processes.pop(pid)
        else:
            alive.append(
                {"pid": pid, "script": proc.args[-1] if hasattr(proc, "args") else ""}
            )
    _save_state()
    return jsonify({"processes": alive})


@app.route("/api/execute-command", methods=["POST"])
def execute_command():
    """Execute a whitelisted shell command asynchronously.

    Returns a job ID immediately which can be polled via
    ``/api/command-status/<job_id>``.
    """
    data = request.get_json(silent=True) or {}
    cmd_line = data.get("command")
    if not cmd_line:
        return json_error("command is required")
    try:
        tokens = shlex.split(cmd_line)
    except ValueError as exc:
        return json_error(str(exc))
    if not tokens:
        return json_error("Empty command")
    if tokens[0] not in ALLOWED_COMMANDS:
        return json_error("Command not permitted")

    job_id = uuid.uuid4().hex
    buffer = StringIO()

    def _run():
        try:
            proc = subprocess.Popen(tokens, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            out, err = proc.communicate()
            buffer.write((out or "") + (err or ""))
            command_jobs[job_id]["returncode"] = proc.returncode
        except Exception as exc:  # pragma: no cover - propagate to job
            buffer.write(str(exc))
        finally:
            command_jobs[job_id]["status"] = "finished"
            command_jobs[job_id]["output"] = buffer.getvalue().strip()

    command_jobs[job_id] = {"status": "running"}
    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    return jsonify({"job_id": job_id})


@app.route("/api/command-status/<job_id>")
def command_status(job_id: str):
    job = command_jobs.get(job_id)
    if not job:
        return json_error("Unknown job ID", 404)
    if job.get("status") == "finished":
        return jsonify({
            "status": "finished",
            "returncode": job.get("returncode", 0),
            "output": job.get("output", ""),
        })
    return jsonify({"status": "running"})


@app.route("/api/diagnostics/run")
def run_diagnostics_endpoint():
    """Run diagnostics and return a summary result."""
    result = run_diagnostics(app)
    status = 200 if result.get("ok") else 500
    return jsonify(result), status


if __name__ == "__main__":
    try:
        logger.info(
            "boot",
            extra={"request_id": "-", "path": "startup", "status": 0, "duration": 0},
        )
        app.run(host=settings.host, port=settings.port, debug=False, use_reloader=False)
    except Exception:
        logger.exception("server crashed")
        raise
