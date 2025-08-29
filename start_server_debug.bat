@echo on
setlocal enabledelayedexpansion
cd /d "%~dp0"
if not exist logs mkdir logs
echo [DEBUG START] %date% %time% > logs\server_debug.log
where python >> logs\server_debug.log 2>&1
python --version >> logs\server_debug.log 2>&1
call .venv\Scripts\activate >> logs\server_debug.log 2>&1
python -V >> logs\server_debug.log 2>&1
python -c "import sys,os;print('cwd=',os.getcwd());print('path0=',sys.path[0])" >> logs\server_debug.log 2>&1
dir >> logs\server_debug.log 2>&1
dir DRIVE >> logs\server_debug.log 2>&1
python -m pip freeze >> logs\server_debug.log 2>&1
python - <<PY 1>>logs\server_debug.log 2>&1
import importlib, sys
for m in ("flask","PIL","psutil"):
    try:
        importlib.import_module(m)
        print("[OK] import", m)
    except Exception as e:
        print("[FAIL] import", m, e)
PY
echo Starting app in debug...
python DRIVE\app.py >> logs\server_debug.log 2>&1
echo [EXIT %ERRORLEVEL%] >> logs\server_debug.log
echo Done. See logs\server_debug.log
pause
