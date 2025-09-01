# Win95-Style Browser Desktop

## Overview
A Windows 95 inspired desktop environment that runs entirely in the browser. A lightweight Flask backend enables file access, terminal commands and other utilities.

## Features
- **Desktop** with icons, start menu and taskbar
- **Notepad** text editor
- **File Manager** for browsing and manipulating files
- **Terminal** executing a whitelist of safe commands
- **System Monitor** for background scripts
- **Crypto Portfolio** tracker
- **Chat** interface for local Ollama models
- **Paint** canvas
- **Sheets** spreadsheet
- **Gallery** image viewer
- **Clocks & Calendar** including world clocks
- **Temperature Converter**
- **Sound Recorder**
- **Volume** control
- **Logs** viewer
- **Profile Manager** for up to 5 users
- **Switch User / Log Out** directly from the Start menu
- **Per-user file storage** sandboxed under `DRIVE/users/<id>`
- **Diagnostics** self-check tool

## User data
Each profile's files are isolated in `DRIVE/users/<id>` on the server. File
API requests must include the profile's `X-User-Id` (or a `user` parameter)
so the backend can resolve paths within that sandbox. Profiles are limited to
five to keep things tidy.

## Installation

Requires **Python 3.12+**. On Python 3.13, Pillow 11+ is automatically selected
from the wheels defined in `requirements.txt`.

### Quick start
#### Windows
1. Double-click `install.bat` to create the virtual environment and install dependencies.
2. Double-click `start_server.bat` to launch the server and open the app.

#### macOS/Linux
1. Run `./install.sh` to set up the virtual environment and dependencies.
2. Run `./start_server.sh` to start the server and open the app.

The server will open your default browser to the correct URL and reuse the
virtual environment on subsequent runs. You can also launch it cross-platform
with the Python script:

```bash
python scripts/start.py --port 8000
```

## Testing

After installing, run the test suite with:

```bash
./run_tests.sh
```

## Customization
- Switch themes and wallpapers in **Settings**.
- Use the **Icon Manager** to show/hide desktop icons or change their graphics.

## Troubleshooting
- **Ollama not found**: install the `ollama` CLI and make sure it is on your `PATH`.
- **Permission denied** when accessing files: ensure the server has rights to the path and grant access when the browser prompts.
- **Server exits or can't write logs**: ensure the project folder is writable and not blocked by Windows *Controlled Folder Access*.

## Security
The backend only executes whitelisted terminal commands and protects file APIs against path traversal.

## Diagnostics
Launch the *Diagnostics* app to verify repository health. Results are written to `logs/diagnostics.log`.

---
Enjoy your nostalgic browsing experience!
