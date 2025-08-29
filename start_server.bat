@echo on
setlocal enabledelayedexpansion
rem --- Always run from repo root ---
cd /d "%~dp0"
if not exist logs mkdir logs
echo [START] %date% %time% > logs\server.log

rem --- Find Python ---
where python >> logs\server.log 2>&1
if errorlevel 1 (
  echo Python not found. Install Python and try again. | tee -a logs\server.log
  pause & exit /b 1
)
python --version >> logs\server.log 2>&1

rem --- Ensure venv exists; create if missing ---
if not exist .venv (
  echo Creating virtual environment... | tee -a logs\server.log
  python -m venv .venv >> logs\server.log 2>&1
)
call .venv\Scripts\activate >> logs\server.log 2>&1
if errorlevel 1 (
  echo Failed to activate venv. | tee -a logs\server.log
  pause & exit /b 1
)

rem --- Install/verify deps silently but logged ---
echo Installing/validating deps... | tee -a logs\server.log
python -m pip install --upgrade pip >> logs\server.log 2>&1
python -m pip install Flask Pillow psutil >> logs\server.log 2>&1

rem --- Print env sanity to log ---
echo VIRTUAL_ENV=!VIRTUAL_ENV! >> logs\server.log
echo PYTHONPATH=!PYTHONPATH! >> logs\server.log

rem --- Start Flask app (sticky console + logging) ---
echo Launching DRIVE\app.py on http://localhost:8000 ... | tee -a logs\server.log
python DRIVE\app.py >> logs\server.log 2>&1
set ERR=%ERRORLEVEL%
echo [EXIT CODE] !ERR! >> logs\server.log
if not "!ERR!"=="0" (
  echo Server exited with error code !ERR!. See logs\server.log for details.
  pause & exit /b !ERR!
)
echo Server stopped normally.
pause
