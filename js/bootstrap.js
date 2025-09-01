// Entry point for ErikOS browser desktop.
// Initialises globals and exposes them on window for legacy modules.

import { windowManager } from './core/windowManager.js';
import { initDesktop, teardownDesktop } from './core/desktop.js';
import { registerTray, teardownTray } from './core/tray.js';
import { applications, setCurrentUser } from './core/globals.js';

function login() {
  setCurrentUser({ id: 'guest', name: 'Guest' });

  console.time('BOOT: desktop');
  initDesktop();
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

export function bootstrap() {
  console.time('BOOT: registry');
  // Access applications to ensure registry is evaluated.
  void applications;
  console.timeEnd('BOOT: registry');

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
