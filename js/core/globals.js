// Global state and application registry for ErikOS.
// Profiles, current user, settings, and app definitions.

export const profiles = [];
export let currentUser = null;
export const settings = {};

// Application registry used by the desktop and start menu.
// Each entry defines an id, display name, icon and launch function.
export const applications = [
  { id: "notepad", name: "Notepad", icon: "./icons/notepad.png", launch: () => import('../apps/notepad.js').then(m => m.openNotepad()) },
  { id: "file-manager", name: "File Manager", icon: "./icons/file-manager.png", launch: () => import('../apps/fileManager.js').then(m => m.openFileManager()) },
  { id: "terminal", name: "Terminal", icon: "./icons/terminal.png", launch: () => import('../apps/terminal.js').then(m => m.openTerminal()) },
  { id: "settings", name: "Settings", icon: "./icons/settings.png", launch: () => import('../apps/settings.js').then(m => m.openSettings()) },
  { id: "link-manager", name: "Link Manager", icon: "./icons/link-manager.png", launch: () => import('../apps/linkManager.js').then(m => m.openLinkEditor()) },
  { id: "processes", name: "System Processes", icon: "./icons/processes.png", launch: () => import('../apps/processes.js').then(m => m.openProcesses()) },
  { id: "media-player", name: "Media Player", icon: "./icons/media-player.png", launch: () => import('../apps/mediaPlayer.js').then(m => m.openMediaPlayer()) },
  { id: "clock", name: "Clock", icon: "./icons/clock.png", launch: () => import('../apps/clock.js').then(m => m.openClock()) },
  { id: "calendar", name: "Calendar", icon: "./icons/calendar.png", launch: () => import('../apps/calendar.js').then(m => m.openCalendar()) },
  { id: "world-clock", name: "World Clocks", icon: "./icons/world-clock.png", launch: () => import('../apps/worldClock.js').then(m => m.openWorldClock()) },
  { id: "calculator", name: "Calculator", icon: "./icons/calculator.png", launch: () => import('../apps/calculator.js').then(m => m.openCalculator()) },
  { id: "paint", name: "Paint", icon: "./icons/paint.png", launch: () => import('../apps/paint.js').then(m => m.openPaint()) },
  { id: "gallery", name: "Gallery", icon: "./icons/gallery.png", launch: () => import('../apps/gallery.js').then(m => m.openGallery()) },
  { id: "thermometer", name: "Temperature", icon: "./icons/thermometer.png", launch: () => import('../apps/thermometer.js').then(m => m.openTempConverter()) },
  { id: "recorder", name: "Recorder", icon: "./icons/recorder.png", launch: () => import('../apps/recorder.js').then(m => m.openRecorder()) },
  { id: "volume", name: "Volume", icon: "./icons/media-player.png", launch: () => import('../apps/volume.js').then(m => m.openSoundAdjuster()) },
  { id: "logs", name: "Logs", icon: "./icons/logs.png", launch: () => import('../apps/logs.js').then(m => m.openLogs()) },
  { id: "profiles", name: "Profile Manager", icon: "./icons/user.png", launch: () => import('../apps/profileManager.js').then(m => m.openProfileManager()) },
  { id: "chat", name: "Chat", icon: "./icons/chat.png", launch: () => import('../apps/chat.js').then(m => m.openChat()) },
  { id: "sheets", name: "Sheets", icon: "./icons/sheets.png", launch: () => import('../apps/sheets.js').then(m => m.openSheets()) },
  { id: "crypto", name: "Crypto Portfolio", icon: "./icons/processes.png", launch: () => import('../apps/crypto.js').then(m => m.openCrypto()) },
  { id: "diagnostics", name: "Diagnostics", icon: "./icons/settings-icon.png", launch: () => import('../apps/diagnostics.js').then(m => m.openDiagnostics()) },
  { id: "snip", name: "Snip", icon: "./icons/gallery.png", launch: () => import('../apps/snip.js').then(m => m.openSnipTool()) }
];

// Helper to register an application dynamically.
export function registerApp(app) {
  applications.push(app);
}

export function setCurrentUser(user) {
  currentUser = user;
}
