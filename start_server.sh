#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "================================================"
echo "ErikOS - Windows 2000 Desktop Emulator"
echo "================================================"
echo

# Check if virtual environment exists
if [ ! -d .venv ]; then
  echo "Virtual environment not found."
  echo "Running installation..."
  echo
  bash install.sh
fi

# Activate virtual environment
source .venv/bin/activate

# Start the server
echo "Starting ErikOS server..."
echo "Browser will open automatically."
echo "Press Ctrl+C to stop the server."
echo
python scripts/start.py "$@"
