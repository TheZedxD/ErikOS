#!/usr/bin/env bash
set -euo pipefail

echo "================================================"
echo "ErikOS - Windows 2000 Desktop Emulator"
echo "Installation Script"
echo "================================================"
echo

# Create logs directory
mkdir -p logs

# Check Python
echo "[1/3] Checking for Python 3..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 not found."
    echo "Please install Python 3.8 or higher."
    exit 1
fi

# Check Python version
echo "[2/3] Creating virtual environment..."
if ! python3 -m venv .venv; then
    echo "ERROR: Failed to create virtual environment."
    echo "You may need to install python3-venv:"
    echo "  Ubuntu/Debian: sudo apt-get install python3-venv"
    echo "  Fedora: sudo dnf install python3-virtualenv"
    exit 1
fi

# Activate and install
echo "[3/3] Installing dependencies..."
source .venv/bin/activate
python -m pip install -U pip > logs/pip_install.log 2>&1
python -m pip install -r requirements.txt >> logs/pip_install.log 2>&1

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies."
    echo "Check logs/pip_install.log for details."
    exit 1
fi

echo
echo "================================================"
echo "Installation complete!"
echo
echo "To start ErikOS, run: ./start_server.sh"
echo "================================================"
