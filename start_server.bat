@echo off
setlocal
title ErikOS Start
cd /d %~dp0

if not exist .venv (
  echo [.venv not found] Running install.bat...
  call install.bat
  if errorlevel 1 (
    echo ERROR: Installation failed.
    echo.
    pause
    exit /b 1
  )
)

call ".venv\Scripts\activate"
if errorlevel 1 (
  echo ERROR: Failed to activate virtual environment.
  echo.
  pause
  exit /b 1
)

python -c "import importlib; importlib.import_module('flask')" >nul 2>&1
if errorlevel 1 (
  echo [Deps missing] Re-installing requirements...
  python -m pip install -r requirements.txt
  if errorlevel 1 (
    echo ERROR: Failed to install requirements.
    echo.
    pause
    exit /b 1
  )
)

echo [Starting server] Opening browser automatically...
python scripts\start.py %*
if errorlevel 1 (
  echo.
  echo ERROR: Server failed to start or crashed.
  echo Check logs for details.
  echo.
  pause
  exit /b 1
)
echo.
pause
endlocal
