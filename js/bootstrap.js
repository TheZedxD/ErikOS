// Entry point for ErikOS browser desktop.
// Initialises globals and exposes them on window for legacy modules.

import { applications, setCurrentUser } from './core/globals.js';
import { windowManager } from './core/windowManager.js';

// Expose minimal APIs globally for existing inline handlers.
window.ErikOS = {
  applications,
  windowManager,
  setCurrentUser,
};

// Basic login/bootstrap placeholder – real implementation would
// display login screen and then render desktop/tray etc.
export function bootstrap() {
  // In the refactor this would handle user profiles and desktop init.
  console.log('ErikOS bootstrapped with', applications.length, 'apps');
}

// Auto bootstrap when module is loaded.
document.addEventListener('DOMContentLoaded', bootstrap);
