#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

log() {
  echo "==> $*"
}

die() {
  echo "Error: $*" >&2
  exit 1
}

if [[ ! -f /etc/os-release ]]; then
  die "/etc/os-release not found; unsupported operating system."
fi

# shellcheck disable=SC1091
. /etc/os-release

is_supported=false
for candidate in "${ID:-}" ${ID_LIKE:-}; do
  case "$candidate" in
    arch|cachyos)
      is_supported=true
      break
      ;;
  esac
done

if [[ $is_supported != true ]]; then
  die "This installer supports Arch Linux and CachyOS only."
fi

if ! command -v pacman >/dev/null 2>&1; then
  die "pacman package manager is required but was not found."
fi

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  SUDO=sudo
else
  SUDO=""
fi

log "Updating system packages (pacman -Syu)..."
$SUDO pacman -Syu --noconfirm

log "Installing required packages via pacman..."
$SUDO pacman -S --needed --noconfirm \
  python python-pip nodejs npm ffmpeg xdg-utils portaudio alsa-lib \
  libjpeg-turbo zlib openssl ca-certificates xclip wl-clipboard

log "Creating Python virtual environment (.venv)..."
python -m venv .venv

log "Installing Python dependencies from requirements.txt..."
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

if [[ -f package.json ]]; then
  log "Installing Node.js dependencies (npm ci)..."
  npm ci

  log "Building Node.js project (npm run build)..."
  npm run build --if-present
fi

log "Ensuring required directories exist..."
mkdir -p DRIVE/users logs

log "Installation complete."
