@echo off
setlocal ENABLEEXTENSIONS
cd /d "%~dp0"
set "EXITCODE=0"

echo [1/7] Locating Python 3.12+ ...
set "PY_CMD="
where py >nul 2>&1 && (py -3.12 -c "print(1)" >nul 2>&1 && set "PY_CMD=py -3.12")
if not defined PY_CMD where py >nul 2>&1 && (py -3.13 -c "print(1)" >nul 2>&1 && set "PY_CMD=py -3.13")
if not defined PY_CMD where py >nul 2>&1 && (py -3 -c "import sys; assert sys.version_info[:2]>=(3,12)" >nul 2>&1 && set "PY_CMD=py -3")
if not defined PY_CMD (python -c "import sys; assert sys.version_info[:2]>=(3,12)" >nul 2>&1 && set "PY_CMD=python")

if not defined PY_CMD (
  echo Error: Python 3.12+ is required. Install from https://www.python.org/downloads/windows/
  set "EXITCODE=1"
  goto end
)

echo [2/7] Creating virtual environment (.venv) ...
%PY_CMD% -m venv ".venv"
if errorlevel 1 (
  echo Error: venv creation failed.
  set "EXITCODE=1"
  goto end
)

echo [3/7] Activating venv ...
call ".venv\Scripts\activate"
if errorlevel 1 (
  echo Error: could not activate .venv
  set "EXITCODE=1"
  goto end
)

echo [4/7] Upgrading pip ...
python -m pip install -U pip
if errorlevel 1 (
  set "EXITCODE=1"
  goto end
)

echo [5/7] Installing requirements (wheels only) ...
pip install --only-binary=:all: -r requirements.txt
if errorlevel 1 (
  echo Error: dependency install failed.
  set "EXITCODE=1"
  goto end
)

if not exist ".env" (
  echo [6/7] Creating .env defaults ...
  > ".env" (
    echo FLASK_ENV=development
    echo PORT=8000
    echo ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
  )
)

echo [7/7] Verifying imports ...
python - <<PY
import importlib,sys
for m in ("flask","PIL","psutil"):
    try:
        importlib.import_module(m)
    except Exception as e:
        print("FAIL:", m, e)
        sys.exit(1)
print("OK")
PY
if errorlevel 1 (
  echo Error: dependency verification failed.
  set "EXITCODE=1"
  goto end
)

echo Installation successful. You may now run start_server.bat

:end
echo Press any key to exit.
pause >nul
exit /b %EXITCODE%
