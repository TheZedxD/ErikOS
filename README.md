# Win95‑Style Browser Desktop

## Overview

This project implements a Windows‑95 inspired desktop environment that runs entirely in your browser.  Using only standard Web APIs and a few small libraries, it recreates a classic desktop complete with draggable windows, a taskbar, a start menu, right‑click context menus and a selection of built‑in applications.  A lightweight Flask backend (provided under the `DRIVE/` directory) can optionally be run to enable file‑system operations, icon processing, background script management and shell command execution.  The desktop works without the backend, but some advanced features (such as the terminal’s remote commands and the system process viewer) require it.

## Features

* **Desktop and icons** – A classic desktop surface featuring icons for a wide range of built‑in applications including Notepad, File Manager, Terminal, Settings, Media Player, Clock, Calendar, World Clocks, Calculator, Paint, Gallery, Temperature Converter, Sound Recorder, Volume Control, Logs, Profile Manager, Chat and Sheets.  New applications can be added easily by editing the `applications` array in `main.js`.
  You can switch between **free‑form** and **snap‑to‑grid** icon layout modes via the desktop’s right‑click menu.  In free‑form mode you can drag icons anywhere on the desktop and their positions persist across sessions; in grid mode icons snap to a neat padded grid.  Each profile can choose which application icons appear on its desktop from the Settings→Desktop tab, allowing you to hide rarely used icons while keeping them accessible via the Start menu and Spotlight.
* **Start menu with search** – A spotlight‑style launcher opens when you click the Start button.  Type to filter available applications and press Enter or click to launch.  All installed applications, including your custom links and the new tools described below, appear here.
* **Profiles and login** – Multiple users can be created from the login screen.  Each profile stores its own theme, wallpaper, custom links and security preferences.  If no profiles exist, you are prompted to create a master user when the app starts.  Your chosen settings persist in the browser’s local storage, which MDN notes is saved across sessions and has no expiration time【960474158399754†L185-L193】.
* **Spotlight overlay** – Press `Ctrl + Space` at any time to open a global search overlay.  The overlay lists all installed applications and any custom links you have created.  Type to filter results and press Enter or click to open them.  This feature complements the Start menu and provides a quick way to launch apps without using the mouse.
* **Link Editor** – A hierarchical tree‑view editor for organising custom shortcuts.  You can create folders, add links inside any folder, drag and drop items to reorder them and delete entries.  Links are stored on your profile and appear in the Spotlight overlay.
* **Context menus** – Right‑click anywhere on the desktop, on an icon, on a window or on a taskbar button to access relevant actions such as Open, Rename, Minimise or Close.  A placeholder “Ask AI…” item hints at future integration with multimodal models.
* **Notepad** – A fully featured text editor powered by CodeMirror 5.  In addition to syntax highlighting and line numbers, the revamped Notepad includes a toolbar with buttons for **New**, **Open**, **Save**, **Save As**, **Undo**, **Redo** and **Word Wrap**.  Word wrap can be toggled on or off, and undo/redo operations are performed through CodeMirror’s history API.  Files are opened and saved using the File System Access API when available, falling back to a download when necessary.  The editor automatically resizes with its window and smart indentation is enabled.
* **File Manager** – Browse the contents of a local folder and double‑click text files to open them in Notepad.  Uses `window.showDirectoryPicker()` with graceful degradation in unsupported browsers.
* **Terminal** – A lightweight terminal interface.  A few built‑in commands (`help`, `clear`, `theme` and `about`) are provided locally.  Any other command is sent to the Flask backend’s `/api/execute-command` endpoint and executed on the host system, subject to a whitelist of safe commands (e.g. `ls`, `dir`, `echo`, `ping`).  The output is streamed back and displayed in the terminal.
* **System Processes** – Monitor and control background scripts started via the API.  The System Processes application fetches a list of running scripts from `/api/list-scripts` and allows you to terminate them via `/api/stop-script`.
* **Settings** – Change the desktop theme (classic, matrix, high contrast, red, pink, Solarized or Vaporwave) and choose a custom wallpaper.  A live preview shows each theme as you hover over it.  Preferences persist across sessions using `localStorage`.
  The settings application has been redesigned as a tabbed interface.  It groups related options into **Appearance**, **Desktop**, **Account** and **Audio** sections.  In addition to themes and wallpapers, you can now:

  - Choose between free‑form or snap‑to‑grid icon layouts and decide whether to show the system clock, volume control and quick‑links tray on the taskbar.
  - Adjust the global volume via a dedicated slider in the **Audio** tab.
  - Change your account password or remove the password requirement entirely from within the **Account** tab.
  - Set a custom login background image that appears behind the profile bubbles.

  Login backgrounds and wallpapers are stored as data URLs in the browser and do not leave your machine.
* **Media Player** – Play local audio and video files.  Supports multiple formats via the File System Access API or a file input fallback.  Media elements integrate with the global volume control.
* **Clock and Calendar** – A simple digital clock window shows the current time and date, while a full calendar lets you browse months and highlights the current day.
* **World Clocks** – Add clocks for multiple time zones using IANA zone names (e.g. America/New_York).  Times update every second and persist across sessions.
* **Calculator** – A basic calculator supporting the four arithmetic operations, decimal numbers and a clear key.
* **Paint** – Draw freehand on a canvas, choose colours, change brush size, clear your artwork or save it as a PNG.  The Paint application has been upgraded with a toolbar that includes a brush and an eraser, adjustable brush sizes, a colour picker and the ability to insert images onto the canvas.  Coordinates have been corrected so drawing follows the cursor precisely.

* **Sheets** – A lightweight spreadsheet application enabling you to open, edit and save simple CSV spreadsheets.  The Sheets app now supports **multiple sheets** within a single workbook: a tab bar at the top lets you switch between sheets, rename them or add new ones.  Each sheet can be imported from or exported to a CSV file via the **Open** and **Save** buttons.  Within a sheet you can add rows or columns, and edit cell values directly.  Complex formats such as `.xls` or `.xlsx` are not currently supported, so please convert spreadsheets to CSV before importing.
* **Gallery** – Select images from your computer to view as thumbnails; click any thumbnail to open a larger viewer.
* **Temperature Converter** – Convert between Celsius, Fahrenheit and Kelvin with immediate results.
* **Sound Recorder** – Capture audio from your microphone using the MediaRecorder API.  Recordings can be played back and downloaded.
* **Volume Control** – Adjust a global volume slider that applies to all media elements across applications.
* **Logs** – A lightweight logging system records key events like application launches and profile changes.  View and clear logs by date in the Logs application.
* **Chat** – A simple chat interface allows you to interact with local language models via the Flask backend’s `/api/ollama` endpoint.  Select from installed models, type a message and view the model’s response.  Conversation history is maintained client‑side.
* **Profile Manager** – Manage existing profiles, rename or delete them, switch between users and log out from within the desktop.
* **Window management** – Windows are draggable, resizable, minimisable and closable.  Each open window creates a button on the taskbar; clicking toggles minimise/restore and brings the window to the front.  A small clock in the bottom‑right corner of the taskbar shows the current time.

## Browser requirements

The desktop uses the [File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) to provide a native‑like file browsing and editing experience.  At the time of writing this API is only supported in Chromium‑based browsers (Chrome, Edge and compatible)【670670972276501†L104-L110】.  The application therefore detects support and falls back to traditional file inputs and downloads when necessary.  Safari and Firefox users can still explore the desktop and use the terminal and settings, but will not be able to browse directories or save files directly【670670972276501†L104-L110】.  When permission is granted, access to a file or directory lasts only while the page remains open and the user is always prompted through the browser’s picker dialogs【670670972276501†L139-L146】.

## Installation

### Windows

1. Download the release ZIP archive and extract its contents into a folder of your choice, e.g. `C:\\Win95Desktop`.
2. Open a terminal (PowerShell or Command Prompt) and navigate into the extracted folder.
3. Start a local server.  Serving the files over `http://localhost` is necessary for the File System Access API to work – opening the HTML file directly via `file://` disables many features【889520036319150†L185-L193】.

   *To use the Flask backend (recommended):*  Ensure you have Python and the dependencies `flask` and `pillow` installed.  Open a terminal, navigate to the extracted folder and run:

   ```powershell
   python DRIVE\app.py
   ```

   This will start the API server on port 8000 and serve the front‑end assets.  All API endpoints (e.g. `/api/status`, `/api/run-script`) will be available.

   *To use the simple static server:*  If you prefer not to install Flask or Pillow, a convenient batch file, `start_server.bat`, is included; double‑click it in Explorer to launch a basic HTTP server:

   ```powershell
   start_server.bat
   ```

   Alternatively, open a terminal and run:

   ```powershell
   python -m http.server 8000
   ```

4. Open your browser (Chrome or Edge) and navigate to `http://localhost:8000/index.html`.  The desktop will load and you can begin using the applications.

### Linux

1. Download and extract the ZIP archive into a directory, for example `~/win95-desktop`.
2. Open a terminal and change into that directory.
3. Start a local server.  Serving the files over `http://localhost` is necessary for the File System Access API to work – opening the HTML file directly via `file://` disables many features【889520036319150†L185-L193】.

   *To use the Flask backend (recommended):*  Ensure Python, Flask and Pillow are installed.  Run the backend with:

   ```bash
   python DRIVE/app.py
   ```

   This starts the API server on port 8000 and also serves the static assets.

   *To use the simple static server:*  A helper script, `start_server.sh`, is provided to launch Python’s built‑in HTTP server:

   ```bash
   ./start_server.sh
   ```

   You can also manually run:

   ```bash
   python3 -m http.server 8000
   ```

4. Open a Chromium‑based browser and visit `http://localhost:8000/index.html` to use the desktop environment.

### Running directly from the file system

Opening `index.html` directly via the `file://` protocol is possible, but file operations (opening directories and saving to arbitrary locations) will not work because the File System Access API is disabled outside of a secure or `localhost` origin.  MDN notes that `showDirectoryPicker()` is an experimental method available only in secure contexts【889520036319150†L185-L193】, so serving the files via `http://localhost` is essential.  Running a local web server as described above is therefore strongly recommended.

## Customisation

* **Themes** – Launch the Settings application and choose a theme.  When you are logged in, the theme is saved on your profile; otherwise it is stored in the browser’s local storage.  You can also change themes from the Terminal using the `theme` command (e.g. `theme matrix`).
* **Wallpaper** – In Settings, pick an image file to use as your desktop wallpaper.  Each user may have their own wallpaper, stored as a data URL on their profile.  Use the “Reset Wallpaper” button to return to the default wallpaper.
* **Login background** – For an extra personal touch, choose an image for the login screen background.  This setting is global to the installation and can be reset at any time.
* **Custom links** – Open the Link Editor to create or delete shortcuts to external websites or resources.  Links live on your profile, can be organised into folders and appear in the Spotlight overlay when you search.
* **Adding applications** – To add new applications, edit the `applications` array near the top of `main.js`.  Provide a unique `id`, a `name`, an icon (place the PNG in `icons/` and reference it) and a `launch` function that creates the application window.

## Limitations

* When using the Flask backend, the terminal can execute only a restricted set of shell commands defined on the server.  Without the backend, the terminal falls back to the built‑in commands described above.
* Directory browsing and persistent file editing rely on the File System Access API and therefore require a Chromium‑based browser【670670972276501†L104-L110】.
* The “Ask AI…” context menu action is a placeholder for a future integration with a multimodal AI model.
* The Chat application requires the `ollama` CLI to be installed on the host system and accessible on the system `PATH`.  If `ollama` is not installed the Chat application will indicate that no models are available.  On systems where `ollama` is installed, use `ollama list` to see which models are available and ensure they are downloaded before attempting to chat.

## Security considerations

When the File System Access API is used, the browser requires the user to choose files or folders through a picker dialog and grants access only for the selected items【670670972276501†L139-L146】.  Permissions are tied to the current origin and are automatically revoked when all tabs for the origin are closed【670670972276501†L139-L146】.  The application does not send any data to remote servers; all processing (including text editing and theme changes) happens locally in your browser.

---

Enjoy your nostalgic browsing experience!