#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -x .venv/bin/python ]; then
  echo "Missing virtual environment. Run install.sh first." >&2
  exit 1
fi

# shellcheck disable=SC1091
if ! source .venv/bin/activate; then
  echo "Error: could not activate .venv" >&2
  exit 1
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
python -m DRIVE.app &
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

if command -v python >/dev/null 2>&1; then
  python scripts/print_qr.py "$URL" || true
fi

echo "Logs directory: $ROOT_DIR/logs"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open "$URL" >/dev/null 2>&1 &
else
  echo "Open $URL in your browser."
fi

echo "Server started."
exit 0
