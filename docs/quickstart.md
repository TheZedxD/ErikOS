# Quick Start

## Installation

1. Optional: run `install.sh` (macOS/Linux) or `install.bat` (Windows) to create a virtual environment and install Python dependencies (`Flask`, `Pillow`, `psutil`).
2. Start the backend with `start_server.sh`, `start_server.bat`, or the cross-platform launcher `python scripts/start.py --port 8000`.
3. Open `http://localhost:8000/index.html` in a Chromium browser.

## Usage

- **Windows**: double-click `start_server.bat`, then browse to the URL above.
- **Linux**: run `./start_server.sh` in a terminal, then open the URL.

## Customization

- Switch themes and wallpapers from **Settings → Appearance**.
- Organize desktop icons with the **Icon Manager** under **Settings → Desktop**.

## Troubleshooting

- **"ollama not found"**: install the `ollama` CLI and ensure it is on your `PATH`.
- **Permission errors**: when the browser denies file access, reload and grant permission again.

## Diagnostics

Open the *Diagnostics* app to run automated self-checks. Results are saved to `logs/diagnostics.log`.
