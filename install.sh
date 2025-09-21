#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

step() { printf '\n==> %s\n' "$1"; }
ok() { printf '    ok: %s\n' "$1"; }
skip() { printf '    skip: %s\n' "$1"; }

step "Checking system"
if ! grep -qiE '^(ID|ID_LIKE)=.*arch' /etc/os-release; then
    echo "This installer supports Arch Linux and derivatives only." >&2
    exit 1
fi
ok "Arch-based system detected"

step "1. System sync & packages"
sudo pacman -Syu --needed --noconfirm git curl unzip xdg-utils ca-certificates openssl python python-pip ffmpeg
ok "Core packages ready"
if sudo pacman -S --needed --noconfirm base-devel; then
    ok "Optional base-devel installed"
else
    skip "base-devel (optional)"
fi

PY_BIN="python"
if ! command -v "$PY_BIN" >/dev/null 2>&1; then
    PY_BIN="python3"
fi

step "2. Python virtualenv"
if [ -d .venv ]; then
    skip ".venv already exists"
else
    "$PY_BIN" -m venv .venv
    ok "Created .venv"
fi

step "3. Upgrade pip tooling"
# shellcheck source=/dev/null
. .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
ok "pip, setuptools, wheel upgraded"

step "4. Project requirements"
if [ -f requirements.txt ]; then
    python -m pip install -r requirements.txt
    ok "requirements.txt installed"
else
    skip "requirements.txt missing"
fi

step "5. Data directories"
mkdir -p DRIVE/users logs
ok "DRIVE/users and logs ready"

step "6. Next steps"
echo "Run ./start_server.sh"
