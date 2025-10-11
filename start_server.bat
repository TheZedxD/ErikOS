@echo off
setlocal
title ErikOS Start
cd /d %~dp0

if not exist .venv (
  echo [.venv not found] Running install.bat...
  call install.bat
)

call ".venv\Scripts\activate"

python - <<PY
import importlib, sys
try:
    importlib.import_module("flask")
    sys.exit(0)
except Exception:
    sys.exit(1)
PY
if errorlevel 1 (
  echo [Deps missing] Re-installing requirements...
  python -m pip install -r requirements.txt
)

echo [Starting server] Opening browser automatically...
python scripts\start.py %*
echo.
pause
endlocal
