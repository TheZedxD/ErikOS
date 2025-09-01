# Audit Summary

## Entry File
- Runtime entry point: `js/bootstrap.js`
- Loaded via `<script type="module" src="./js/bootstrap.js"></script>` in `index.html`

## Required DOM IDs
- `#desktop`
- `#taskbar-windows`
- `#start-button`
- `#start-menu`
- `#start-app-list`
- `#tray-links-icon`
- `#tray-volume-icon`
- `#tray-snip-icon`
- optional `#tray-menu`

## Path Updates
- Switched module script in `index.html` to `./js/bootstrap.js` (was `/js/bootstrap.js`)
- Added deterministic boot timing and watchdog in `js/bootstrap.js`
- Instrumented start menu timing in `js/core/desktop.js`
