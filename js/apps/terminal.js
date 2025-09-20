import { openAppWindow } from '../utils/appWindow.js';

// Open a placeholder window for the Terminal app in the new modular setup.
export function openTerminal() {
  openAppWindow('terminal', 'Terminal', 'Terminal app coming soon');
}
