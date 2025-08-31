#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

STEP=1
TOTAL=7

echo "[$STEP/$TOTAL] Locating Python 3.12+ ..."
PY_CMD=""
for cmd in python3 python; do
  if command -v "$cmd" >/dev/null 2>&1; then
    if "$cmd" - <<'PY'
import sys
sys.exit(0 if sys.version_info >= (3,12) else 1)
PY
    then
      PY_CMD="$cmd"
      break
    fi
  fi
done
if [ -z "$PY_CMD" ]; then
  echo "Error: Python 3.12+ is required." >&2
  exit 1
fi

STEP=$((STEP+1))
echo "[$STEP/$TOTAL] Creating virtual environment (.venv) ..."
if ! "$PY_CMD" -m venv .venv; then
  echo "Error: venv creation failed." >&2
  exit 1
fi

STEP=$((STEP+1))
echo "[$STEP/$TOTAL] Activating venv ..."
# shellcheck disable=SC1091
if ! source .venv/bin/activate; then
  echo "Error: could not activate .venv" >&2
  exit 1
fi

STEP=$((STEP+1))
echo "[$STEP/$TOTAL] Upgrading pip ..."
if ! python -m pip install -U pip; then
  echo "Error: pip upgrade failed." >&2
  exit 1
fi

STEP=$((STEP+1))
echo "[$STEP/$TOTAL] Installing requirements (wheels only) ..."
if ! pip install --only-binary=:all: -r requirements.txt; then
  echo "Error: dependency install failed." >&2
  exit 1
fi

if [ ! -f .env ]; then
  STEP=$((STEP+1))
  echo "[$STEP/$TOTAL] Creating .env defaults ..."
  cat > .env <<'ENV'
FLASK_ENV=development
PORT=8000
ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
ENV
fi

STEP=$((STEP+1))
echo "[$STEP/$TOTAL] Verifying imports ..."
if ! python - <<'PY'
import importlib, sys
for m in ("flask", "PIL", "psutil"):
    try:
        importlib.import_module(m)
    except Exception as e:
        print("FAIL:", m, e)
        sys.exit(1)
print("OK")
PY
then
  echo "Error: dependency verification failed." >&2
  exit 1
fi

echo "Install complete. Now run start_server.sh"
if [ -t 1 ]; then
  read -n 1 -s -r -p "Press any key to exit..."
  echo
fi
