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

import json
import os
import sys
import subprocess
from pathlib import Path

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


@app.route("/api/ollama/models")
def list_ollama_models():
    """Return a list of available models from the local Ollama installation.

    First attempts to call `ollama list --json` which returns a JSON
    structure describing installed models.  If the JSON output cannot be
    parsed or the command fails, falls back to parsing the plain text
    output of `ollama list` by ignoring the header line.  If the
    `ollama` executable is not found, an empty list and an error
    message are returned.
    """
    try:
        # Try JSON output first for reliable parsing
        result = subprocess.run(["ollama", "list", "--json"], capture_output=True, text=True)
        models = []
        if result.returncode == 0:
            try:
                data = json.loads(result.stdout)
                # Newer versions may return {"models": [ {"name": ...}, ... ]}
                if isinstance(data, dict) and isinstance(data.get("models"), list):
                    models = [m.get("name") for m in data["models"] if m.get("name")]
                # Older versions may return a list directly
                elif isinstance(data, list):
                    models = [m.get("name") or m.get("model") or m for m in data]
                else:
                    # Unexpected structure
                    pass
                return jsonify({"models": models})
            except Exception:
                # Fall back to plain text parsing
                pass
        # Fallback: plain text parsing, skip header row if present
        result = subprocess.run(["ollama", "list"], capture_output=True, text=True)
        if result.returncode != 0:
            return jsonify({"models": [], "error": result.stderr.strip()}), 500
        for i, line in enumerate(result.stdout.splitlines()):
            parts = line.strip().split()
            # Skip header lines containing keywords
            if not parts:
                continue
            if i == 0 and ("MODEL" in parts[0].upper() or "NAME" in parts[0].upper()):
                continue
            models.append(parts[0])
        return jsonify({"models": models})
    except FileNotFoundError:
        # ollama not installed
        return jsonify({"models": [], "error": "ollama executable not found"}), 500
    except Exception as exc:
        return jsonify({"models": [], "error": str(exc)}), 500


@app.route("/api/ollama", methods=["POST"])
def run_ollama():
    """Run a prompt against the specified model via the `ollama run` CLI.

    Expects a JSON body with `model` and `prompt` keys.  Optionally
    includes a `history` array (list of messages) which is not used
    directly but maintained by the client.  The response contains
    either a `response` field with the model output or an `error`.
    """
    data = request.get_json(silent=True) or {}
    model = data.get("model") or "llama2"
    prompt = data.get("prompt") or ""
    if not prompt:
        return jsonify({"error": "prompt is required"}), 400
    try:
        result = subprocess.run([
            "ollama",
            "run",
            model,
            prompt
        ], capture_output=True, text=True)
        if result.returncode != 0:
            return jsonify({"error": result.stderr.strip()}), 500
        # Return the raw stdout as the response
        return jsonify({"response": result.stdout.strip()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


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
        result = subprocess.run([
            sys.executable,
            str(script_path),
            str(icons_dir)
        ], capture_output=True, text=True)
        if result.returncode != 0:
            return jsonify({"success": False, "error": result.stderr.strip()}), 500
        return jsonify({"success": True, "output": result.stdout.strip()})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


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
        return jsonify({"error": "script_name is required"}), 400
    script_path = BASE_DIR / script_name
    if not script_path.exists():
        return jsonify({"error": f"Script '{script_name}' not found"}), 404
    try:
        proc = subprocess.Popen([
            sys.executable,
            str(script_path)
        ])
        processes[proc.pid] = proc
        return jsonify({"pid": proc.pid, "script": script_name})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/stop-script", methods=["POST"])
def stop_script():
    """Terminate a previously started background script.

    Expects JSON payload with a "pid" key.  If the PID is known it
    will be terminated.  Returns a confirmation or error message.
    """
    data = request.get_json(silent=True) or {}
    pid = data.get("pid")
    if pid is None:
        return jsonify({"error": "pid is required"}), 400
    proc = processes.get(pid)
    if not proc:
        return jsonify({"error": f"Process {pid} not found"}), 404
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
            alive.append({"pid": pid, "script": proc.args[-1] if hasattr(proc, 'args') else ''})
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
        return jsonify({"error": "command is required"}), 400
    tokens = cmd_line.strip().split()
    if not tokens:
        return jsonify({"error": "Empty command"}), 400
    if tokens[0] not in ALLOWED_COMMANDS:
        return jsonify({"error": f"Command '{tokens[0]}' is not allowed"}), 403
    try:
        result = subprocess.run(tokens, capture_output=True, text=True)
        return jsonify({
            "command": cmd_line,
            "returncode": result.returncode,
            "output": (result.stdout + result.stderr).strip()
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    # When run directly, start the Flask development server.  The
    # server listens on all interfaces by default (0.0.0.0) so that
    # requests from other hosts are possible if necessary.  Change
    # host/port as required.
    app.run(host="0.0.0.0", port=8000, debug=True)