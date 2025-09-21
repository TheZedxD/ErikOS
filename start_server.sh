#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -d .venv ]]; then
  echo "Missing .venv. Run ./install.sh." >&2
  exit 1
fi

# shellcheck disable=SC1091
source .venv/bin/activate

HOST=${HOST:-127.0.0.1}
PORT=${PORT:-8000}
URL="http://$HOST:$PORT"

if [[ -f scripts/start.py ]]; then
  CMD=(python scripts/start.py --host "$HOST" --port "$PORT")
elif command -v gunicorn >/dev/null 2>&1 && python - <<'PY' 2>/dev/null
import importlib
import sys
try:
    mod = importlib.import_module('main')
    getattr(mod, 'app')
except Exception:
    sys.exit(1)
PY
then
  CMD=(gunicorn -k gthread -w 1 -b "$HOST:$PORT" main:app)
elif python - <<'PY' 2>/dev/null
import os
import pathlib
import re
import sys
try:
    import flask  # noqa: F401
except Exception:
    sys.exit(1)
if os.getenv('FLASK_APP'):
    sys.exit(0)
text = ''
path = pathlib.Path('main.py')
if path.exists():
    text = path.read_text(encoding='utf-8', errors='ignore')
if re.search(r'\b(app\s*=\s*Flask|def\s+create_app\s*\()', text):
    sys.exit(0)
sys.exit(1)
PY
then
  if [[ -z "${FLASK_APP:-}" && -f main.py ]]; then
    export FLASK_APP=main
  fi
  CMD=(python -m flask run --host "$HOST" --port "$PORT")
else
  echo "No server entrypoint found." >&2
  echo "Provide scripts/start.py, main:app for gunicorn, or a Flask CLI entrypoint." >&2
  exit 1
fi

"${CMD[@]}" &
PID=$!

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 || true
fi

echo "Server running at $URL"

wait "$PID"
