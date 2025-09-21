#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

cd "$(dirname "$0")"

TOTAL_STEPS=13
STEP_INDEX=0
STEP_DESC=""
STEP_START=0

print_step() {
  STEP_INDEX=$((STEP_INDEX + 1))
  STEP_DESC="$1"
  STEP_START=$SECONDS
  printf '[%02d/%02d] %s … ' "$STEP_INDEX" "$TOTAL_STEPS" "$STEP_DESC"
}

ok() {
  local elapsed=$((SECONDS - STEP_START))
  if [[ $# -gt 0 && -n ${1:-} ]]; then
    printf 'OK (%ds) - %s\n' "$elapsed" "$1"
  else
    printf 'OK (%ds)\n' "$elapsed"
  fi
}

skip() {
  local elapsed=$((SECONDS - STEP_START))
  local reason=${1:-skipped}
  printf 'SKIPPED (%ds) - %s\n' "$elapsed" "$reason"
}

fail() {
  local elapsed=$((SECONDS - STEP_START))
  local message=${1:-"Unknown error"}
  printf 'FAILED (%ds)\n' "$elapsed"
  printf '    %s\n' "$message" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

have_pkg() {
  pacman -Qi "$1" >/dev/null 2>&1
}

pacman_install() {
  local pkgs=("$@")
  ((${#pkgs[@]} == 0)) && return 0
  "$SUDO" pacman -S --needed --noconfirm "${pkgs[@]}"
}

resolve_python() {
  if command -v python >/dev/null 2>&1; then
    echo python
    return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    echo python3
    return 0
  fi
  return 1
}

enable_ollama_service() {
  if ! command -v systemctl >/dev/null 2>&1; then
    return 0
  fi

  local service_file=""
  for path in /etc/systemd/system/ollama.service /usr/lib/systemd/system/ollama.service; do
    if [[ -f $path ]]; then
      service_file=$path
      break
    fi
  done

  [[ -z $service_file ]] && return 0

  if "$SUDO" systemctl enable --now ollama.service >/dev/null 2>&1; then
    return 0
  fi

  printf '    Warning: Failed to enable ollama.service (ignored)\n' >&2
  return 0
}

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  SUDO=sudo
else
  SUDO=""
fi

print_step "Checking operating system"
if [[ ! -f /etc/os-release ]]; then
  fail "/etc/os-release not found; unsupported operating system"
fi
# shellcheck disable=SC1091
. /etc/os-release

is_supported=false
for candidate in "${ID:-}" ${ID_LIKE:-}; do
  case "$candidate" in
    arch|archlinux|cachyos)
      is_supported=true
      ;;
  esac
  [[ $is_supported == true ]] && break
done

[[ $is_supported == true ]] || fail "This installer supports Arch Linux and CachyOS only"
need_cmd pacman
ok "detected ${NAME:-Arch Linux}"

print_step "Syncing pacman databases"
if "$SUDO" pacman -Sy --noconfirm; then
  ok
else
  fail "Failed to synchronize pacman databases"
fi

print_step "Installing base packages"
if pacman_install git curl unzip xdg-utils ca-certificates openssl; then
  ok
else
  fail "Failed to install base packages"
fi

print_step "Installing runtime packages"
if pacman_install python python-pip nodejs npm ffmpeg portaudio alsa-lib libjpeg-turbo zlib; then
  ok
else
  fail "Failed to install runtime packages"
fi

print_step "Installing optional clipboard tools"
if pacman_install xclip wl-clipboard; then
  ok
else
  skip "optional packages failed to install"
fi

print_step "Ensuring Ollama is available"
if command -v ollama >/dev/null 2>&1; then
  enable_ollama_service
  ok "already installed"
else
  if pacman_install ollama; then
    enable_ollama_service
    ok "installed Ollama"
  else
    skip "could not install Ollama via pacman (install manually)"
  fi
fi

print_step "Preparing Python virtual environment"
PYTHON_BIN=$(resolve_python || true)
if [[ -z ${PYTHON_BIN:-} ]]; then
  fail "Python is required but was not found"
fi
if [[ -d .venv ]]; then
  skip ".venv already exists"
else
  if "$PYTHON_BIN" -m venv .venv; then
    ok
  else
    fail "Failed to create Python virtual environment"
  fi
fi

print_step "Upgrading pip tooling"
if [[ ! -d .venv ]]; then
  fail "Virtual environment not found"
fi
if .venv/bin/python -m pip install --upgrade pip setuptools wheel; then
  ok
else
  fail "Failed to upgrade pip tooling"
fi

print_step "Installing Python dependencies"
if [[ -f requirements.txt ]]; then
  if .venv/bin/pip install -r requirements.txt; then
    ok
  else
    fail "Failed to install Python dependencies"
  fi
else
  skip "requirements.txt not found"
fi

print_step "Installing Node.js dependencies"
if [[ -f package.json ]]; then
  if npm ci; then
    ok
  else
    fail "npm ci failed"
  fi
else
  skip "package.json not found"
fi

print_step "Running build script"
if [[ -f package.json ]] && node -e "process.exit((require('./package.json').scripts||{}).build?0:1)" >/dev/null 2>&1; then
  if npm run build; then
    ok
  else
    fail "npm run build failed"
  fi
else
  skip "no build script"
fi

print_step "Creating runtime directories"
if mkdir -p DRIVE/users logs; then
  ok
else
  fail "Failed to create runtime directories"
fi

print_step "Final summary"
ok "installation complete"
echo
echo "All steps completed successfully."
echo "Next, start the server with:" 
echo "  ./start_server.sh"
