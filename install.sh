#!/usr/bin/env bash
set -e
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install Flask Pillow psutil
echo "Installed Flask/Pillow/psutil."
