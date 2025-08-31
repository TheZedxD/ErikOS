@echo off
setlocal ENABLEEXTENSIONS
cd /d "%~dp0"
set "ROOT_DIR=%cd%"
set "EXITCODE=0"

if not exist ".venv\Scripts\python.exe" (
  echo Missing virtual environment. Run install.bat first.
  set "EXITCODE=1"
  goto end
)

call ".venv\Scripts\activate"
if errorlevel 1 (
  echo Error: could not activate .venv
  set "EXITCODE=1"
  goto end
)

if "%PORT%"=="" set "PORT=8000"

echo Starting ErikOS server on port %PORT% ...
REM Launch server in a new window so this script can continue
start "ErikOS Server" cmd /k ".venv\Scripts\python -m DRIVE.app & echo. & echo Press any key to close this window... & pause"

REM Wait up to 20 seconds for the port to respond using a simple TCP check
powershell -NoProfile -Command ^
  "$p=%PORT%;$limit=(Get-Date).AddSeconds(20);while((Get-Date) -lt $limit){try{(New-Object System.Net.Sockets.TcpClient).Connect('127.0.0.1',$p);exit 0}catch{Start-Sleep -Milliseconds 500}};exit 1"

if errorlevel 1 (
  echo Server did not become ready on port %PORT%.
  echo Check logs in the 'logs' folder or the new server window.
  set "EXITCODE=1"
  goto end
)

start "" "http://127.0.0.1:%PORT%/index.html"
echo Server started. A browser window should open shortly.

:end
echo Press any key to exit.
pause >nul
exit /b %EXITCODE%
