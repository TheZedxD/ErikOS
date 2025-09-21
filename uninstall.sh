#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

read -r -p "Type 'erase' to remove local env and caches: " answer
if [[ "${answer}" != "erase" ]]; then
  echo "Aborted."
  exit 1
fi

rm -rf .venv
rm -rf logs && mkdir -p logs
find . -type d -name '__pycache__' -prune -exec rm -rf {} + 2>/dev/null || true
find . -type f -name '*.pyc' -delete 2>/dev/null || true

mkdir -p DRIVE/users
find DRIVE/users -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true

rm -rf dist build .pytest_cache .mypy_cache

echo "Removed virtual environment, logs, Python caches, DRIVE/users contents, and build artifacts."
