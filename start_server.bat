@echo on
setlocal enabledelayedexpansion

REM --- Always run from this .bat's directory ---
cd /d "%~dp0"

REM --- Create logs folder ---
if not exist logs mkdir logs
set LOGFILE=logs\server.log
echo [START] %date% %time% > "%LOGFILE%"

REM --- Ensure virtual environment exists ---
if not exist .venv (
  echo [VENV] creating virtual environment >> "%LOGFILE%"
  python -m venv .venv >> "%LOGFILE%" 2>&1 || goto :error
)

REM --- Activate virtual environment ---
call .venv\Scripts\activate >> "%LOGFILE%" 2>&1 || goto :error

REM --- Ensure deps present (idempotent) ---
echo [DEPS] upgrading pip & installing reqs >> "%LOGFILE%"
python -m pip install --upgrade pip >> "%LOGFILE%" 2>&1 || goto :error
if exist requirements.txt (
  python -m pip install -r requirements.txt >> "%LOGFILE%" 2>&1 || goto :error
)

REM --- Environment hints for Windows consoles ---
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8

REM --- Launch Flask app directly (no 'start', keep in same window) ---
echo [RUN] launching DRIVE\app.py on http://127.0.0.1:8000 >> "%LOGFILE%"
python DRIVE\app.py >> "%LOGFILE%" 2>&1
set ERR=%ERRORLEVEL%
echo [EXIT CODE] !ERR! >> "%LOGFILE%"

if not "!ERR!"=="0" goto :error

echo Server stopped normally. Press any key to close.
pause
exit /b 0

:error
set ERR=%ERRORLEVEL%
echo Server exited with error !ERR!. See "%LOGFILE%" for details.
pause
exit /b !ERR!
