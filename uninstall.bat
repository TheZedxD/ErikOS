@echo off
setlocal ENABLEEXTENSIONS
cd /d "%~dp0"

set "AUTO_CONFIRM=0"
if /I "%~1"=="--yes" set "AUTO_CONFIRM=1"
if /I "%~1"=="--force" set "AUTO_CONFIRM=1"

if NOT "%AUTO_CONFIRM%"=="1" (
  set "CHOICE=N"
  set /p "CHOICE=This will remove ErikOS dependencies, caches, logs, and user data. Continue? (y/N): "
  if /I not "%CHOICE%"=="Y" (
    if /I not "%CHOICE%"=="YES" (
      echo Aborted.
      goto :end
    )
  )
)

call :removePath .venv
call :cleanLogs
call :removePath DRIVE\users
call :removePath DRIVE\tmp
call :removePath DRIVE\cache
call :removePath .pytest_cache
call :removePath .mypy_cache
call :removePath .coverage

for /d /r %%D in (__pycache__) do (
  if exist "%%~fD" rd /s /q "%%~fD"
)
for /r %%F in (*.pyc *.pyo) do (
  if exist "%%~fF" del /f /q "%%~fF"
)

echo Uninstall complete.

echo Press any key to exit.
pause >nul

:end
exit /b 0

:removePath
set "TARGET=%~1"
if exist "%TARGET%" (
  echo Removing %TARGET%
  rd /s /q "%TARGET%" 2>nul
  if exist "%TARGET%" del /f /q "%TARGET%" 2>nul
) else (
  echo Skipped %TARGET% (not found)
)
exit /b 0

:cleanLogs
if exist "logs" (
  pushd "logs" >nul
  for /d %%D in (*) do rd /s /q "%%~fD"
  for %%F in (*) do (
    if /I not "%%~nxF"==".gitignore" del /f /q "%%~fF"
  )
  if not exist ".gitignore" (
    > ".gitignore" echo diagnostics.log
  )
  popd >nul
  echo Cleared logs directory
) else (
  mkdir "logs"
  > "logs\.gitignore" echo diagnostics.log
  echo Created logs directory
)
exit /b 0
