@echo on
setlocal enabledelayedexpansion
REM --- Always run from this .bat's directory ---
cd /d "%~dp0"

REM --- Create logs folder ---
if not exist logs mkdir logs
set LOGFILE=logs\server.log
echo [START] %date% %time% > "%LOGFILE%"

REM --- Prefer venv's Python; fallback to system python ---
set PY_EXE=.venv\Scripts\python.exe
if not exist "%PY_EXE%" set PY_EXE=python

where "%PY_EXE%" >> "%LOGFILE%" 2>&1
"%PY_EXE%" --version >> "%LOGFILE%" 2>&1

REM --- Ensure deps present (idempotent) ---
echo [DEPS] upgrading pip & installing reqs >> "%LOGFILE%"
"%PY_EXE%" -m pip install --upgrade pip >> "%LOGFILE%" 2>&1
if exist requirements.txt (
  "%PY_EXE%" -m pip install -r requirements.txt >> "%LOGFILE%" 2>&1
)

REM --- Environment hints for Windows consoles ---
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8

REM --- Launch Flask app directly (no 'start', keep in same window) ---
echo [RUN] launching DRIVE\app.py on http://127.0.0.1:8000 >> "%LOGFILE%"
"%PY_EXE%" DRIVE\app.py >> "%LOGFILE%" 2>&1
set ERR=%ERRORLEVEL%
echo [EXIT CODE] !ERR! >> "%LOGFILE%"

if not "!ERR!"=="0" (
  echo Server exited with error !ERR!. See "%LOGFILE%" for details.
  pause
  exit /b !ERR!
)

echo Server stopped normally. Press any key to close.
pause
