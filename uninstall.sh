#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

prompt() {
  local message="$1"
  if [ "${AUTO_CONFIRM:-0}" = "1" ]; then
    return 0
  fi
  read -r -p "$message [y/N]: " reply || reply=""
  case "$reply" in
    [yY]|[yY][eE][sS]) return 0 ;;
    *) echo "Aborted."; return 1 ;;
  esac
}

remove_path() {
  local target="$1"
  if [ -e "$target" ]; then
    rm -rf -- "$target"
    echo "Removed $target"
  else
    echo "Skipped $target (not found)"
  fi
}

clean_logs() {
  if [ -d logs ]; then
    find logs -mindepth 1 -not -name '.gitignore' -exec rm -rf {} + 2>/dev/null || true
    if [ -f logs/.gitignore ]; then
      echo "Cleared logs directory"
    else
      printf 'diagnostics.log\n' > logs/.gitignore
      echo "Reset logs directory"
    fi
  else
    mkdir -p logs
    printf 'diagnostics.log\n' > logs/.gitignore
    echo "Created logs directory"
  fi
}

AUTO_CONFIRM=0
if [ "${1:-}" = "--yes" ] || [ "${1:-}" = "--force" ]; then
  AUTO_CONFIRM=1
fi

if ! prompt "This will remove ErikOS dependencies, caches, logs, and user data"; then
  exit 0
fi

remove_path ".venv"
clean_logs
remove_path "DRIVE/users"
remove_path "DRIVE/tmp"
remove_path "DRIVE/cache"
remove_path ".pytest_cache"
remove_path ".mypy_cache"
remove_path ".coverage"

# Clean Python caches
find . -type d -name '__pycache__' -prune -exec rm -rf {} + 2>/dev/null || true
find . -type f \( -name '*.pyc' -o -name '*.pyo' \) -delete 2>/dev/null || true

echo "Uninstall complete."
if [ -t 1 ]; then
  read -n 1 -s -r -p "Press any key to exit..."
  echo
fi
