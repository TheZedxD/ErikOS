#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  bash install.sh
fi
. .venv/bin/activate
python scripts/start.py "$@"
