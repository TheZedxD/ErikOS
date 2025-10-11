#!/usr/bin/env bash
set -euo pipefail
if [ ! -d logs ]; then mkdir -p logs; fi

echo "[1/6] Detecting distro"
source /etc/os-release || true
IDL="${ID_LIKE:-$ID}"
if echo "$IDL" | grep -qi arch; then
  sudo pacman -Syu --needed --noconfirm python python-pip python-virtualenv ffmpeg base-devel ca-certificates openssl
elif echo "$IDL" | grep -qi debian; then
  sudo apt-get update
  sudo apt-get install -y python3 python3-venv python3-pip ffmpeg build-essential libssl-dev libffi-dev libjpeg-dev zlib1g-dev ca-certificates
else
  echo "Unsupported distro. Ensure: python3(>=3.12), venv, pip, ffmpeg, build tools." >&2
  exit 1
fi

echo "[2/6] Verifying Python >=3.12"
python3 - <<'PY'
import sys
raise SystemExit(0 if sys.version_info[:2] >= (3,12) else 1)
PY
if [ $? -ne 0 ]; then
  echo "Python 3.12+ required." >&2
  exit 1
fi

echo "[3/6] Creating venv"
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -U pip setuptools wheel

echo "[4/6] Ensuring requirements.txt exists"
if [ ! -f requirements.txt ]; then
  cat > requirements.txt <<'REQ'
Flask>=2.3,<4
Pillow>=10,<12
psutil>=5.9,<6
requests>=2.31,<3
python-dotenv>=1.0,<2
REQ
fi

echo "[5/6] Installing deps"
python -m pip install -r requirements.txt | tee logs/pip_linux.log

echo "[6/6] Preparing dirs & .env"
mkdir -p DRIVE/users logs
[ -f .env ] || { [ -f .env.sample ] && cp .env.sample .env || cat > .env <<'ENV'
HOST=127.0.0.1
PORT=8000
TERMINAL_TIMEOUT_SECONDS=10
TERMINAL_WHITELIST=echo,ls,dir,uname,date,whoami,ping
USERS_DIR=DRIVE/users
LOGS_DIR=logs
ENV
}
echo "Done. Start with: ./start_server.sh"
