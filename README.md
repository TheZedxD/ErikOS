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
- **Profile Manager** for multiple users
- **Diagnostics** self-check tool

## Installation

### Install scripts
Run `install.sh` (Linux) or `install.bat` (Windows) to create a virtual environment and install Python dependencies:

```
Flask
Pillow
psutil
```

### Starting the server
Use `start_server.sh` or `start_server.bat` to launch the backend on port 8000.

```
./start_server.sh
# or
start_server.bat
```

## Usage

### Windows
1. Run `start_server.bat`.
2. Open `http://localhost:8000/index.html` in Chrome or Edge.

### Linux
1. `./start_server.sh`
2. Open `http://localhost:8000/index.html` in a Chromium browser.

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
