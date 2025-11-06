@echo off
setlocal enabledelayedexpansion
title ErikOS Installer

echo ================================================
echo ErikOS - Windows 2000 Desktop Emulator
echo Installation Script
echo ================================================
echo.

REM Create logs directory
if not exist logs mkdir logs

REM Find Python
echo [1/4] Locating Python...
set PYEXE=
for %%P in ("py -3","python","python3") do (
  for /f "delims=" %%Q in ('%%~P -c "import sys; print(sys.executable)" 2^>nul') do (
    set PYEXE=%%Q
    goto :found_python
  )
)

:found_python
if "%PYEXE%"=="" (
  echo ERROR: Python not found.
  echo Please install Python 3.8 or higher from:
  echo https://www.python.org/downloads/
  echo.
  pause
  exit /b 1
)

echo Found: %PYEXE%

REM Check Python version
echo [2/4] Checking Python version...
"%PYEXE%" -c "import sys; exit(0) if sys.version_info[:2]>=(3,8) else exit(1)"
if errorlevel 1 (
  echo ERROR: Python 3.8+ required.
  echo Please install a newer version of Python.
  echo.
  pause
  exit /b 1
)

REM Create virtual environment
echo [3/4] Creating virtual environment...
"%PYEXE%" -m venv .venv
if errorlevel 1 (
  echo ERROR: Failed to create virtual environment.
  echo.
  pause
  exit /b 1
)

REM Activate and install dependencies
echo [4/4] Installing dependencies...
call ".venv\Scripts\activate"
if errorlevel 1 (
  echo ERROR: Failed to activate virtual environment.
  echo.
  pause
  exit /b 1
)

python -m pip install -U pip >logs\pip_install.log 2>&1
python -m pip install -r requirements.txt >>logs\pip_install.log 2>&1
if errorlevel 1 (
  echo ERROR: Failed to install dependencies.
  echo Check logs\pip_install.log for details.
  echo.
  pause
  exit /b 1
)

echo.
echo ================================================
echo Installation complete!
echo.
echo To start ErikOS, run: start_server.bat
echo ================================================
echo.
pause
endlocal
