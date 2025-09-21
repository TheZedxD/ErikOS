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
if "%HOST%"=="" set "HOST=127.0.0.1"

if not exist "%ROOT_DIR%\logs" mkdir "%ROOT_DIR%\logs"

if defined PYTHONPATH (
  set "PYTHONPATH=%ROOT_DIR%;%PYTHONPATH%"
) else (
  set "PYTHONPATH=%ROOT_DIR%"
)

echo Starting ErikOS server on %HOST%:%PORT% ...
REM Launch server in a new window so this script can continue
start "ErikOS Server" cmd /k "set ROOT_DIR=%ROOT_DIR% & set PORT=%PORT% & set HOST=%HOST% & set PYTHONPATH=%PYTHONPATH% & .venv\Scripts\python -m DRIVE.app & echo. & echo Press any key to close this window... & pause"

REM Wait up to 20 seconds for the port to respond using a simple TCP check
powershell -NoProfile -Command ^
  "$p=%PORT%;$limit=(Get-Date).AddSeconds(20);while((Get-Date) -lt $limit){try{(New-Object System.Net.Sockets.TcpClient).Connect('127.0.0.1',$p);exit 0}catch{Start-Sleep -Milliseconds 500}};exit 1"

if errorlevel 1 (
  echo Server did not become ready on port %PORT%.
  echo Check logs in the 'logs' folder or the new server window.
  set "EXITCODE=1"
  goto end
)

set "URL=http://%HOST%:%PORT%/index.html"
echo ErikOS is running at %URL%
".venv\Scripts\python.exe" "scripts\print_qr.py" "%URL%"
echo Logs directory: %ROOT_DIR%\logs

start "" "%URL%"
echo Server started. A browser window should open shortly.

:end
echo Press any key to exit.
pause >nul
exit /b %EXITCODE%
