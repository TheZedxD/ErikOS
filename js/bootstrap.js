// Entry point for ErikOS browser desktop.
// Initialises globals and exposes them on window for legacy modules.

import { windowManager } from './core/windowManager.js';
import { initDesktop, teardownDesktop, renderDesktopIcons } from './core/desktop.js';
import { registerTray, teardownTray } from './core/tray.js';
import { setCurrentUser } from './core/globals.js';
import { loadApps, validateApps } from './core/appRegistry.js';
import { launchApp } from './core/launcher.js';

let apps = [];

function login() {
  setCurrentUser({ id: 'guest', name: 'Guest' });

  console.time('BOOT: desktop');
  initDesktop(apps);
  renderDesktopIcons(apps);
  console.timeEnd('BOOT: desktop');

  console.time('BOOT: tray');
  registerTray();
  console.timeEnd('BOOT: tray');
}

export function logout() {
  teardownDesktop();
  teardownTray();
  windowManager.clear();
  setCurrentUser(null);
  login();
}

export async function bootstrap() {
  console.time('BOOT: registry');
  apps = await loadApps();
  validateApps(apps);
  renderDesktopIcons(apps);
  console.timeEnd('BOOT: registry');

  login();
}

window.addEventListener('erikos-logout', logout);

// Expose minimal APIs globally for existing inline handlers.
window.ErikOS = {
  launchApp,
  windowManager,
  setCurrentUser,
  logout,
};

document.addEventListener('DOMContentLoaded', () => {
  let bootError = false;
  window.addEventListener('error', () => {
    bootError = true;
  });
  window.addEventListener('unhandledrejection', () => {
    bootError = true;
  });

  bootstrap();

  setTimeout(() => {
    const desktop = document.getElementById('desktop');
    if (!bootError && desktop && desktop.children.length === 0) {
      console.log(
        '%cBootstrap stalled — check registry and selectors.',
        'color:#fff;background:red;padding:4px'
      );
    }
  }, 5000);
});
