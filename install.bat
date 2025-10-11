@echo off
setlocal enabledelayedexpansion

echo === ErikOS Windows Installer ===
where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher not found. Install Python 3.12 from https://www.python.org/downloads/windows/
  exit /b 1
)

echo [1/5] Creating virtualenv with Python 3.12...
py -3.12 -m venv .venv
if errorlevel 1 (
  echo Failed to create venv with Python 3.12.
  echo Please install Python 3.12 x64 and ensure "py -3.12" works.
  exit /b 1
)

echo [2/5] Activating venv and upgrading pip...
call ".venv\Scripts\activate"
python -m pip install -U pip setuptools wheel

echo [3/5] Installing requirements...
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo Pip install failed.
  exit /b 1
)

echo [4/5] Creating folders and .env
if not exist DRIVE mkdir DRIVE
if not exist DRIVE\users mkdir DRIVE\users
if not exist logs mkdir logs
if not exist .env (
  copy /Y .env.sample .env >nul
)

echo [5/5] Done.
echo.
echo To start ErikOS:
echo   start_server.bat
echo.
echo Optional: Install FFmpeg and add it to PATH for best media compatibility: https://www.gyan.dev/ffmpeg/builds/
endlocal
