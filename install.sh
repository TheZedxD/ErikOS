#!/usr/bin/env bash
set -euo pipefail

RED() { printf "\033[31m%s\033[0m\n" "$*"; }
GRN() { printf "\033[32m%s\033[0m\n" "$*"; }
BLU() { printf "\033[34m%s\033[0m\n" "$*"; }

step(){ BLU "==> $*"; }
ok(){ GRN "✔ $*"; }

step "Detecting distro"
IDLIKE="$(. /etc/os-release; echo "${ID_LIKE:-$ID}")"

if echo "$IDLIKE" | grep -qi arch; then
  step "Arch-based detected"
  sudo pacman -Syu --needed --noconfirm python python-pip python-virtualenv ffmpeg base-devel ca-certificates openssl
elif echo "$IDLIKE" | grep -qi debian; then
  step "Debian/Ubuntu-based detected"
  sudo apt-get update
  sudo apt-get install -y \
    python3 python3-venv python3-pip ffmpeg build-essential \
    libssl-dev libffi-dev libjpeg-dev zlib1g-dev ca-certificates
else
  RED "Unsupported distro. Please install: python3 (>=3.12), python3-venv, python3-pip, ffmpeg, build tools."
  RED "Then run: python3 -m venv .venv && . .venv/bin/activate && pip install -U pip && pip install -r requirements.txt"
  exit 1
fi
ok "System packages installed"

step "Checking Python version >= 3.12"
PYV=$(python3 - <<'PY'
import sys
print(".".join(map(str, sys.version_info[:3])))
PY
)
PYMAJOR=$(echo "$PYV" | cut -d. -f1)
PYMINOR=$(echo "$PYV" | cut -d. -f2)
if [ "$PYMAJOR" -lt 3 ] || { [ "$PYMAJOR" -eq 3 ] && [ "$PYMINOR" -lt 12 ]; }; then
  RED "Found Python $PYV. Python 3.12+ required."
  RED "On Ubuntu/Mint, consider using deadsnakes PPA or pyenv to install Python 3.12."
  exit 1
fi
ok "Python $PYV OK"

step "Creating virtualenv"
python3 -m venv .venv
. .venv/bin/activate
pip install -U pip setuptools wheel
pip install -r requirements.txt
ok "Python dependencies installed"

step "Preparing directories and env"
mkdir -p DRIVE/users logs
[ -f .env ] || cp -n .env.sample .env
ok "Folders and .env ready"

GRN "Installation complete."
echo
echo "Run the server with:"
echo "  ./start_server.sh"
echo
echo "To allow LAN access, edit .env and set HOST=0.0.0.0"
