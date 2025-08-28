@echo off
REM
REM start_server.bat – Simple launcher script for the Win95‑style browser desktop
REM
REM This batch file starts a local HTTP server so that the File System Access API
REM functions correctly.  It requires Python to be installed and available in
REM the PATH.  The server listens on port 8000 by default.

cd /d %~dp0
echo Starting local HTTP server on http://localhost:8000 ...
echo Press Ctrl+C to stop.

python -m http.server 8000
pause