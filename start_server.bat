@echo off
setlocal
title ErikOS - Windows 2000 Desktop Emulator
cd /d %~dp0

echo ================================================
echo ErikOS - Windows 2000 Desktop Emulator
echo ================================================
echo.

REM Check if virtual environment exists
if not exist .venv (
  echo Virtual environment not found.
  echo Running installation...
  echo.
  call install.bat
  if errorlevel 1 (
    echo ERROR: Installation failed.
    echo.
    pause
    exit /b 1
  )
)

REM Activate virtual environment
call ".venv\Scripts\activate"
if errorlevel 1 (
  echo ERROR: Failed to activate virtual environment.
  echo Try running install.bat again.
  echo.
  pause
  exit /b 1
)

REM Check if Flask is installed
python -c "import flask" >nul 2>&1
if errorlevel 1 (
  echo Flask not found. Installing dependencies...
  python -m pip install -r requirements.txt
  if errorlevel 1 (
    echo ERROR: Failed to install dependencies.
    echo.
    pause
    exit /b 1
  )
)

REM Start the server
echo Starting ErikOS server...
echo Browser will open automatically.
echo Press Ctrl+C to stop the server.
echo.
python scripts\start.py %*

echo.
echo Server stopped.
pause
endlocal
