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
import subprocess
import sys
import tempfile
from pathlib import Path

import psutil
from flask import Flask, jsonify, request, send_from_directory

# Determine the base directory where static files live.  The static
# folder is the parent directory of this script (i.e. project root).
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")

# In‑memory store of running subprocesses.  Keys are integer PIDs and
# values are subprocess.Popen objects.  When a process exits it is
# removed from this dictionary.  This simple store is not
# persisted across server restarts.
processes: dict[int, subprocess.Popen] = {}

# Whitelist of allowed shell commands for execute_command.  Only
# commands in this list (by base command name) will be executed.  You
# can customise this list to meet your needs.  For example, on
# Windows you may wish to permit "dir" instead of "ls".
ALLOWED_COMMANDS = {"ls", "dir", "echo", "ping"}

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


def _scan_model_dirs() -> list[str]:
    """Return model names by scanning known model directories."""
    dirs = []
    env_dir = os.environ.get("OLLAMA_MODELS")
    if env_dir:
        dirs.append(Path(env_dir))
    dirs.extend(
        [
            Path.home() / ".ollama" / "models",
            Path("/usr/share/ollama/models"),
        ]
    )
    models: set[str] = set()
    for d in dirs:
        if d.is_dir():
            for f in d.rglob("*"):
                if f.suffix in {".bin", ".gguf"}:
                    models.add(f.stem)
    return sorted(models)


def detect_ollama_models() -> tuple[list[str], str | None]:
    """Detect installed Ollama models returning (models, error)."""
    models: list[str] = []
    error: str | None = None
    try:
        result = subprocess.run(
            ["ollama", "list", "--json"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            try:
                data = json.loads(result.stdout)
                if isinstance(data, dict) and isinstance(data.get("models"), list):
                    models = [m.get("name") for m in data["models"] if m.get("name")]
                elif isinstance(data, list):
                    models = [m.get("name") or m.get("model") or m for m in data]
            except Exception:
                app.logger.exception("Failed parsing ollama JSON output")
        else:
            app.logger.warning(
                "ollama list returned %s: %s",
                result.returncode,
                result.stderr.strip(),
            )
    except FileNotFoundError:
        error = "ollama executable not found"
    except Exception as exc:
        error = str(exc)
        app.logger.exception("Error running 'ollama list'")

    if not models:
        models = _scan_model_dirs()
    if not models and error is None:
        error = "No Ollama models detected"
    return models, error


@app.route("/api/ollama/models")
def list_ollama_models():
    """Return a list of available models from the local Ollama installation."""
    models, error = detect_ollama_models()
    if not models:
        return jsonify({"ok": False, "models": [], "error": error}), 500
    resp = {"models": models}
    if error:
        resp["warning"] = error
    return jsonify(resp)


@app.route("/api/ollama/history/<profile>")
def get_chat_history(profile: str):
    """Return stored chat history for the given profile."""
    profile = _safe_profile_name(profile)
    history = load_chat_history(profile)
    return jsonify({"history": history})


@app.route("/api/ollama", methods=["POST"])
@app.route("/api/ollama/chat", methods=["POST"])
def run_ollama():
    """Run a prompt against the specified model via the `ollama run` CLI.

    Expects JSON with `model`, `prompt` and optional `image` (base64).  The
    request may also include `history` (list of messages) and `profile` to
    persist conversation history to disk.  The response contains either a
    `response` field with the model output or an `error`.
    """
    data = request.get_json(silent=True) or {}
    model = data.get("model") or "llama2"
    prompt = data.get("prompt") or ""
    image_b64 = data.get("image")
    history = data.get("history") or []
    profile = data.get("profile")
    image_file: str | None = None
    if not prompt and not image_b64:
        return jsonify({"ok": False, "error": "prompt is required"}), 400
    if image_b64:
        try:
            raw = base64.b64decode(image_b64)
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
            tmp.write(raw)
            tmp.close()
            image_file = tmp.name
        except Exception as exc:
            return jsonify({"ok": False, "error": f"invalid image: {exc}"}), 400
    models, err = detect_ollama_models()
    if model not in models:
        return jsonify({"ok": False, "error": f"model '{model}' is not installed"}), 400
    try:
        cmd = ["ollama", "run", model, prompt]
        if image_file:
            cmd.extend(["--image", image_file])
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode != 0:
            app.logger.error("ollama run failed: %s", result.stderr.strip())
            return jsonify({"ok": False, "error": result.stderr.strip()}), 500
        response_text = result.stdout.strip()
        convo = list(history) if isinstance(history, list) else []
        convo.append({"role": "assistant", "content": response_text})
        if profile:
            try:
                prof = _safe_profile_name(profile)
                path = CHAT_HISTORY_DIR / f"{prof}.json"
                with path.open("w", encoding="utf-8") as fh:
                    json.dump(convo, fh)
            except Exception:
                app.logger.exception("Failed writing chat history for %s", profile)
        return jsonify({"response": response_text})
    except FileNotFoundError:
        app.logger.exception("ollama executable not found while running model")
        return jsonify({"ok": False, "error": "ollama executable not found"}), 500
    except Exception as exc:
        app.logger.exception("Error running ollama model")
        return jsonify({"ok": False, "error": str(exc)}), 500
    finally:
        if image_file and os.path.exists(image_file):
            os.unlink(image_file)


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
    """Return a simple JSON object indicating the server is running."""
    return jsonify({"status": "running"})


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
    if not file or not file.filename.lower().endswith(".png"):
        return jsonify({"ok": False, "error": "png only"}), 400
    icon_dir = BASE_DIR / "icons"
    icon_dir.mkdir(parents=True, exist_ok=True)
    dest = icon_dir / file.filename
    file.save(dest)
    return jsonify({"ok": True, "file": file.filename})


# ---------------------------------------------------------------------------
# File manager endpoints
# ---------------------------------------------------------------------------

# Base directory that the file manager is allowed to access.  Paths provided
# by the client are interpreted relative to this directory.  The resolved path
# is always checked to ensure it does not escape this directory to mitigate
# directory traversal attacks.  The base directory can be overridden with the
# FILE_BASE environment variable for flexibility.
FILE_BASE = Path(os.environ.get("FILE_BASE", BASE_DIR)).resolve()


def _safe_path(rel_path: str) -> Path:
    """Return an absolute path under FILE_BASE for rel_path.

    Raises ValueError if the resulting path is outside FILE_BASE."""
    target = (FILE_BASE / rel_path).resolve()
    if not str(target).startswith(str(FILE_BASE.resolve())):
        raise ValueError("Path escapes base directory")
    return target


@app.route("/api/list-directory")
def list_directory():
    """Return contents of a directory as JSON."""
    rel = request.args.get("path", "")
    try:
        path = _safe_path(rel)
        if not path.exists() or not path.is_dir():
            return jsonify({"ok": False, "error": "Not a directory"}), 400
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
        return jsonify({"ok": False, "error": "Invalid path"}), 400
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


@app.route("/api/create-folder", methods=["POST"])
def create_folder():
    data = request.get_json(silent=True) or {}
    rel = data.get("path", "")
    name = data.get("name")
    if not name:
        return jsonify({"ok": False, "error": "name is required"}), 400
    try:
        path = _safe_path(rel) / name
        path.mkdir(parents=False, exist_ok=False)
        return jsonify({"success": True})
    except FileExistsError:
        return jsonify({"ok": False, "error": "Folder exists"}), 400
    except ValueError:
        return jsonify({"ok": False, "error": "Invalid path"}), 400
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


@app.route("/api/rename", methods=["POST"])
def rename_item():
    data = request.get_json(silent=True) or {}
    rel = data.get("path")
    new_name = data.get("new_name")
    if not rel or not new_name:
        return jsonify({"ok": False, "error": "path and new_name required"}), 400
    try:
        src = _safe_path(rel)
        dst = src.parent / new_name
        src.rename(dst)
        return jsonify({"success": True})
    except FileNotFoundError:
        return jsonify({"ok": False, "error": "Not found"}), 404
    except ValueError:
        return jsonify({"ok": False, "error": "Invalid path"}), 400
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


@app.route("/api/delete", methods=["POST"])
def delete_item():
    data = request.get_json(silent=True) or {}
    rel = data.get("path")
    if not rel:
        return jsonify({"ok": False, "error": "path is required"}), 400
    try:
        target = _safe_path(rel)
        if target.is_dir():
            os.rmdir(target)
        else:
            target.unlink()
        return jsonify({"success": True})
    except FileNotFoundError:
        return jsonify({"ok": False, "error": "Not found"}), 404
    except OSError as exc:
        # e.g. directory not empty
        return jsonify({"ok": False, "error": str(exc)}), 400
    except ValueError:
        return jsonify({"ok": False, "error": "Invalid path"}), 400
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


@app.route("/api/upload", methods=["POST"])
def upload_file():
    rel = request.form.get("path", "")
    file = request.files.get("file")
    if not file:
        return jsonify({"ok": False, "error": "file is required"}), 400
    try:
        directory = _safe_path(rel)
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
    proc = processes.get(pid)
    if not proc:
        return jsonify({"ok": False, "error": f"Process {pid} not found"}), 404
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
    processes.pop(pid, None)
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
    return jsonify({"processes": alive})


@app.route("/api/execute-command", methods=["POST"])
def execute_command():
    """Execute a whitelisted shell command and return its output.

    The request body should contain a JSON object with a "command"
    field specifying the full command line.  The first token of the
    command must appear in ALLOWED_COMMANDS or the request will be
    rejected.  The command is executed synchronously and both
    standard output and standard error are returned in the response.
    """
    data = request.get_json(silent=True) or {}
    cmd_line = data.get("command")
    if not cmd_line:
        return jsonify({"ok": False, "error": "command is required"}), 400
    tokens = cmd_line.strip().split()
    if not tokens:
        return jsonify({"ok": False, "error": "Empty command"}), 400
    if tokens[0] not in ALLOWED_COMMANDS:
        return (
            jsonify({"ok": False, "error": f"Command '{tokens[0]}' is not allowed"}),
            403,
        )
    try:
        result = subprocess.run(tokens, capture_output=True, text=True)
        return jsonify(
            {
                "command": cmd_line,
                "returncode": result.returncode,
                "output": (result.stdout + result.stderr).strip(),
            }
        )
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


if __name__ == "__main__":
    # When run directly, start the Flask development server.  The
    # server listens on all interfaces by default (0.0.0.0) so that
    # requests from other hosts are possible if necessary.  Change
    # host/port as required.
    app.run(host="0.0.0.0", port=8000, debug=True)
