@echo off
python -m venv .venv
call .venv\Scripts\activate
pip install --upgrade pip
pip install Flask Pillow psutil
echo Installed Flask/Pillow/psutil.
