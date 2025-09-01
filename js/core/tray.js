import { applications } from './globals.js';

let listeners = [];

function launch(id) {
  const app = applications.find(a => a.id === id);
  if (app) app.launch();
}

export function registerTray() {
  const linksIcon = document.getElementById('tray-links-icon');
  const snipIcon = document.getElementById('tray-snip-icon');
  const volumeIcon = document.getElementById('tray-volume-icon');

  if (linksIcon) {
    const handler = () => launch('link-manager');
    linksIcon.addEventListener('click', handler);
    listeners.push({ target: linksIcon, type: 'click', handler });
  }
  if (snipIcon) {
    const handler = () => launch('snip');
    snipIcon.addEventListener('click', handler);
    listeners.push({ target: snipIcon, type: 'click', handler });
  }
  if (volumeIcon) {
    const handler = () => launch('volume');
    volumeIcon.addEventListener('click', handler);
    listeners.push({ target: volumeIcon, type: 'click', handler });
  }
}

export function teardownTray() {
  listeners.forEach(({ target, type, handler }) => target.removeEventListener(type, handler));
  listeners = [];
}
