@echo off
setlocal ENABLEEXTENSIONS
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Missing virtual environment. Run install.bat first.
  exit /b 1
)

call ".venv\Scripts\activate"
if errorlevel 1 (
  echo Error: could not activate .venv
  exit /b 1
)

if "%PORT%"=="" set "PORT=8000"

echo Starting ErikOS server on port %PORT% ...
REM Launch server in a new window so this script can continue
start "ErikOS Server" cmd /c ".venv\Scripts\python -m DRIVE.app"

REM Wait up to 20 seconds for the port to respond
powershell -NoProfile -Command ^
  "$p=%PORT%;$ok=$false;for($i=0;$i -lt 20;$i++){if((Test-NetConnection 127.0.0.1 -Port $p -WarningAction SilentlyContinue).TcpTestSucceeded){$ok=$true;break};Start-Sleep -Seconds 1}; if(-not $ok){exit 1}"

if errorlevel 1 (
  echo Server did not become ready on port %PORT%.
  echo Check logs in the 'logs' folder or the new server window.
  exit /b 1
)

start "" "http://127.0.0.1:%PORT%/index.html"
echo Server started. A browser window should open shortly.
exit /b 0
