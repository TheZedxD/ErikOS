#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .venv/bin/activate ]; then
  echo "Error: missing virtual environment. Run install.sh first." >&2
  exit 1
fi

# shellcheck disable=SC1091
source .venv/bin/activate

HOST=${HOST:-127.0.0.1}
PORT=${PORT:-8000}
URL="http://${HOST}:${PORT}/"

if [ -f scripts/start.py ]; then
  CMD=(python scripts/start.py --host "$HOST" --port "$PORT")
else
  CMD=(gunicorn main:app --bind "${HOST}:${PORT}")
fi

"${CMD[@]}" &
SERVER_PID=$!

echo "Server running at ${URL} (PID: ${SERVER_PID})"

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 || true
fi

wait "$SERVER_PID"
