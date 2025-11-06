@echo off
setlocal enabledelayedexpansion
title ErikOS Windows Installer
if not exist logs mkdir logs

echo [1/7] Locating Python 3.12+
set PYEXE=
for %%P in ("py -3.12","py -3.13","py -3","python") do (
  for /f "delims=" %%Q in ('%%~P -c "import sys; print(sys.executable)" 2^>nul') do (
    set PYEXE=%%Q
    goto :gotpy
  )
)
:gotpy
if "%PYEXE%"=="" (
  echo ERROR: Python 3.12+ not found.
  echo Install Python 3.12 x64 and ensure the Python Launcher (py) is installed.
  echo https://www.python.org/downloads/windows/
  echo.
  pause
  exit /b 1
)

echo [2/7] Checking version...
"%PYEXE%" -c "import sys; exit(0) if sys.version_info[:2]>=(3,12) else exit(1)"
if errorlevel 1 (
  echo ERROR: Python ^>= 3.12 required.
  echo Current: "%PYEXE%"
  echo Install Python 3.12+ and retry.
  echo.
  pause
  exit /b 1
)

echo [3/7] Creating venv .venv
"%PYEXE%" -m venv .venv
if errorlevel 1 (
  echo ERROR: Failed to create venv.
  echo.
  pause
  exit /b 1
)

echo [4/7] Activating venv and upgrading pip
call ".venv\Scripts\activate"
if errorlevel 1 (
  echo ERROR: Failed to activate virtual environment.
  echo.
  pause
  exit /b 1
)
python -m pip install -U pip setuptools wheel >nul 2>&1

echo [5/7] Ensuring requirements.txt exists
if not exist requirements.txt (
  (
    echo Flask^>=2.3,^<4
    echo Pillow^>=10,^<12
    echo psutil^>=5.9,^<6
    echo requests^>=2.31,^<3
    echo python-dotenv^>=1.0,^<2
  ) > requirements.txt
)

echo [6/7] Installing Python deps (see logs\pip_windows.log)
python -m pip install -r requirements.txt 1>logs\pip_windows.log 2>&1
if errorlevel 1 (
  echo ERROR: pip install failed. See logs\pip_windows.log
  echo.
  pause
  exit /b 1
)

echo [7/7] Creating folders and .env
if not exist DRIVE mkdir DRIVE
if not exist DRIVE\users mkdir DRIVE\users
if not exist logs mkdir logs
if not exist .env (
  if exist .env.sample (copy /Y .env.sample .env >nul) else (
    echo HOST=127.0.0.1>.env
    echo PORT=8000>>.env
    echo TERMINAL_TIMEOUT_SECONDS=10>>.env
    echo TERMINAL_WHITELIST=echo,ls,dir,uname,date,whoami,ping>>.env
    echo USERS_DIR=DRIVE/users>>.env
    echo LOGS_DIR=logs>>.env
  )
)

echo.
echo Install complete. Start ErikOS with: start_server.bat
echo (Optional) Install FFmpeg and add to PATH for best media compatibility: https://www.gyan.dev/ffmpeg/builds/
echo.
pause
endlocal
