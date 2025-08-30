#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
mkdir -p logs
LOGFILE="logs/server.log"
trap 'echo "Server exited with error. See $LOGFILE for details." >&2' ERR

echo "[START] $(date)" | tee "$LOGFILE"

if [ ! -d .venv ]; then
  echo "[VENV] creating virtual environment" | tee -a "$LOGFILE"
  python3 -m venv .venv >>"$LOGFILE" 2>&1
fi

source .venv/bin/activate

echo "[DEPS] installing requirements" | tee -a "$LOGFILE"
python -m pip install --upgrade pip >>"$LOGFILE" 2>&1
python -m pip install -r requirements.txt >>"$LOGFILE" 2>&1

echo "[RUN] launching DRIVE/app.py on http://127.0.0.1:8000" | tee -a "$LOGFILE"
python3 DRIVE/app.py >>"$LOGFILE" 2>&1

echo "Server stopped. See $LOGFILE for details." | tee -a "$LOGFILE"
