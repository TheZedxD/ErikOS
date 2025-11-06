# ErikOS - Windows 2000 Desktop Emulator

A nostalgic Windows 2000-style desktop environment that runs entirely in your browser! Experience the retro computing era with a clean, functional desktop interface featuring draggable windows, a taskbar, and classic apps.

## Features

- **Windows 2000 Aesthetic** - Authentic retro blue gradient desktop and UI
- **Full Window Management**
  - Drag windows anywhere on the desktop
  - Minimize, maximize, and close buttons
  - Click to focus windows (brings them to front)
  - Double-click title bar to maximize
  - Taskbar buttons for all open windows
- **Desktop Icons** - Click to select, double-click to launch apps
- **Start Menu** - Classic Windows-style start menu
- **Built-in Apps**
  - 📝 Notepad - Text editor with toolbar
  - 🎨 Paint - Simple drawing canvas
  - 📁 My Files - File browser
  - 🔢 Calculator - Basic calculator
  - ⚙️ Settings - System settings and about info
- **System Tray** - Live clock display

## Screenshots

Desktop with multiple windows open, featuring the classic Windows 2000 look and feel.

## Requirements

- **Python 3.8+** (for the web server)
- **Modern web browser** (Chrome, Firefox, Edge, Safari)

## Quick Start

### Windows

1. Double-click `install.bat` to install dependencies
2. Double-click `start_server.bat` to launch ErikOS
3. Browser will open automatically at http://127.0.0.1:8000

### Linux / macOS

```bash
./install.sh
./start_server.sh
```

Browser will open automatically at http://127.0.0.1:8000

## Usage

### Desktop
- **Single-click** icons to select them
- **Double-click** icons to launch applications
- **Click** the Start button or press the Windows key (future) to open the Start Menu

### Windows
- **Drag** windows by their title bar
- **Click** anywhere on a window to bring it to front
- **Minimize** - Hides window to taskbar
- **Maximize** - Expands window to full screen
- **Close** - Closes the window
- **Double-click** title bar to toggle maximize

### Taskbar
- Click taskbar buttons to restore/minimize/focus windows
- Live clock shows current time

## Project Structure

```
ErikOS/
├── index.html          # Main HTML page
├── style.css           # Windows 2000 styling
├── main.js             # Window manager & apps
├── DRIVE/
│   └── app.py         # Simple Flask server
├── scripts/
│   └── start.py       # Server launcher
├── install.bat         # Windows installer
├── start_server.bat    # Windows launcher
├── install.sh          # Linux/Mac installer
└── start_server.sh     # Linux/Mac launcher
```

## Customization

The project is designed to be simple and easy to modify:

- **Add new apps**: Edit the `apps` object in `main.js`
- **Change colors**: Modify the CSS variables in `style.css`
- **Add desktop icons**: Add new `.desktop-icon` elements in `index.html`

## Technical Details

- **Frontend**: Pure vanilla JavaScript, no frameworks
- **Backend**: Minimal Flask server for static file serving
- **Styling**: CSS with Windows 2000-inspired gradients and colors
- **Window Management**: Custom JavaScript class-based system

## Contributing

Feel free to fork and improve! Some ideas for enhancements:

- Add more apps (Browser, Music Player, Games)
- Window resizing by dragging edges
- Right-click context menus
- File persistence (save notepad files, etc.)
- Themes (Windows XP, Windows 7, etc.)
- Sound effects
- Keyboard shortcuts

## License

Free to use and modify for your own projects!

## Credits

Created as a nostalgic tribute to Windows 2000 and early 2000s computing.

---

Enjoy your trip down memory lane! 🪟
