import { windowManager } from '../core/windowManager.js';

export function openAppWindow(id, title, message = `${title} app coming soon`) {
  const content = document.createElement('div');
  content.textContent = message;
  windowManager.createWindow(id, title, content);
}
