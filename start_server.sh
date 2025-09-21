#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PYTHON_BIN=""
if [ -x .venv/bin/python ]; then
  # shellcheck disable=SC1091
  if ! source .venv/bin/activate; then
    echo "Error: could not activate .venv" >&2
    exit 1
  fi
  PYTHON_BIN="python"
else
  for candidate in python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
      if "$candidate" - <<'PY' >/dev/null 2>&1
import importlib
for mod in ("flask", "PIL", "psutil"):
    importlib.import_module(mod)
PY
      then
        PYTHON_BIN="$candidate"
        break
      fi
    fi
  done
  if [ -z "$PYTHON_BIN" ]; then
    echo "Missing virtual environment and no system Python with required packages was found. Run install.sh first." >&2
    exit 1
  fi
fi

export ROOT_DIR="${ROOT_DIR:-$PWD}"
export HOST="${HOST:-127.0.0.1}"
export PORT="${PORT:-8000}"
if [ -n "${PYTHONPATH:-}" ]; then
  export PYTHONPATH="$ROOT_DIR:$PYTHONPATH"
else
  export PYTHONPATH="$ROOT_DIR"
fi

mkdir -p logs

echo "Starting ErikOS server on ${HOST}:${PORT} ..."
"$PYTHON_BIN" -m DRIVE.app &
SERVER_PID=$!

READY=""
for i in {1..20}; do
  if curl -fs "http://127.0.0.1:$PORT/api/status" >/dev/null 2>&1; then
    READY=1
    break
  elif command -v nc >/dev/null 2>&1 && nc -z 127.0.0.1 "$PORT" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [ -z "$READY" ]; then
  echo "Server did not become ready on port $PORT." >&2
  kill "$SERVER_PID" 2>/dev/null
  exit 1
fi

URL="http://${HOST}:${PORT}/index.html"
echo "ErikOS is running at $URL"

if command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  "$PYTHON_BIN" scripts/print_qr.py "$URL" || true
fi

echo "Logs directory: $ROOT_DIR/logs"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open "$URL" >/dev/null 2>&1 &
elif command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  "$PYTHON_BIN" - <<'PY' "$URL" >/dev/null 2>&1 &
import sys
import webbrowser

url = sys.argv[1]
if not webbrowser.open(url):
    raise SystemExit(1)
PY
else
  echo "Open $URL in your browser."
fi

echo "Server started."
exit 0
