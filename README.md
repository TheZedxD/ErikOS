# Win95-Style Browser Desktop

## Overview
A Windows 95 inspired desktop environment that runs entirely in the browser. A lightweight Flask backend enables file access, terminal commands and other utilities.

## Features
- **Desktop** with icons, start menu and taskbar
- **Notepad** text editor
  - Auto-saves your work in the browser
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

## Requirements

- Python 3.12+ (Windows: use the Python launcher `py -3.12`)
- Chromium-based browser (Chrome/Edge/Brave) for best support (File System Access API, media capture)
- Optional: FFmpeg on Windows (add to `PATH`) for broader media compatibility
- Optional: Ollama running locally for the Chat app (<https://ollama.com/>)

## Install

**Linux (Arch/CachyOS, Ubuntu/Mint):**

```bash
./install.sh
```

**Windows:**

```
install.bat
```

## Start

**Linux:**

```bash
./start_server.sh
```

**Windows:**

```
start_server.bat
```

The browser opens automatically at <http://127.0.0.1:8000/>.

## LAN Access (optional)

Edit `.env` and set:

```
HOST=0.0.0.0
```

Then access from another device via `http://<your-computer-LAN-IP>:8000/`. Firewall rules may be required.

## Features & External Services

- **Chat (LLM):** Requires Ollama running locally. If not installed, the Chat app will show a connection error.
- **Crypto tracker:** Needs internet for live price refresh. Offline mode shows saved amounts only; prices cannot update without internet.
- **Sound recorder:** Uses browser mic permissions (no server codec needed). Grant permission when prompted.

## Terminal Safety

The terminal app allows only whitelisted commands (configurable via `.env` → `TERMINAL_WHITELIST`) and enforces a timeout (`TERMINAL_TIMEOUT_SECONDS`).

## Roadmap / Not Yet Implemented

The “Recipe Saver” and “YouTube Downloader” apps are planned but not included yet. They are intentionally not visible so they won’t break the UI. Future implementations will:

- **Recipe Saver:** simple CRUD that stores recipes under `DRIVE/users/<profile>/recipes/`
- **YouTube Downloader:** integrate `yt-dlp` via a backend endpoint with progress display

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
- **Windows blocked the launcher scripts**: Unblock the `.bat` files via their
  **Properties** dialog or run the shell as an administrator so they can create
  the `logs` folder.

## Security
The backend only executes whitelisted terminal commands and protects file APIs against path traversal.

## Diagnostics
Launch the *Diagnostics* app to verify repository health. Results are written to `logs/diagnostics.log`.

---
Enjoy your nostalgic browsing experience!
