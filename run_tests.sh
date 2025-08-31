#!/bin/bash
set -e
if [ ! -d ".venv" ]; then
  echo "Virtual environment not found. Please run install.sh first." >&2
  exit 1
fi
. .venv/bin/activate
pytest -q
