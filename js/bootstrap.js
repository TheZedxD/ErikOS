// Entry point for ErikOS browser desktop.
// Initialises globals and exposes them on window for legacy modules.

import { windowManager } from './core/windowManager.js';
import { initDesktop, teardownDesktop } from './core/desktop.js';
import { registerTray, teardownTray } from './core/tray.js';
import { applications, setCurrentUser } from './core/globals.js';

function login() {
  setCurrentUser({ id: 'guest', name: 'Guest' });
  initDesktop();
  registerTray();
}

export function logout() {
  teardownDesktop();
  teardownTray();
  windowManager.clear();
  setCurrentUser(null);
  login();
}

export function bootstrap() {
  login();
}

window.addEventListener('erikos-logout', logout);

// Expose minimal APIs globally for existing inline handlers.
window.ErikOS = {
  applications,
  windowManager,
  setCurrentUser,
  logout,
};

document.addEventListener('DOMContentLoaded', bootstrap);
