@echo on
setlocal enabledelayedexpansion
cd /d "%~dp0"
if not exist logs mkdir logs
set DLOG=logs\server_debug.log
echo [DEBUG START] %date% %time% > "%DLOG%"

set PY_EXE=.venv\Scripts\python.exe
if not exist "%PY_EXE%" set PY_EXE=python

where "%PY_EXE%" >> "%DLOG%" 2>&1
"%PY_EXE%" --version >> "%DLOG%" 2>&1

"%PY_EXE%" - <<PY 1>>"%DLOG%" 2>&1
import sys, os, importlib, traceback
print("cwd=", os.getcwd())
print("sys.executable=", sys.executable)
for m in ("flask","PIL","psutil"):
    try:
        importlib.import_module(m)
        print("[OK] import", m)
    except Exception as e:
        print("[FAIL] import", m, e)
PY

echo [RUN] Starting DRIVE\app.py ... >> "%DLOG%"
"%PY_EXE%" DRIVE\app.py >> "%DLOG%" 2>&1
echo [EXIT %ERRORLEVEL%] >> "%DLOG%"
echo See "%DLOG%" for details.
pause
