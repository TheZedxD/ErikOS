import { addLog } from '../core/globals.js';
import { openAppWindow } from '../utils/appWindow.js';

export function openClock() {
  addLog('Clock opened');
  openAppWindow('clock', 'Clock', (content, ctx) => {
    content.innerHTML = '';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.alignItems = 'center';
    content.style.justifyContent = 'center';
    content.style.height = '100%';
    content.style.fontSize = '32px';

    const timeEl = document.createElement('div');
    const dateEl = document.createElement('div');
    dateEl.style.fontSize = '18px';

    content.append(timeEl, dateEl);

    function update() {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString();
      dateEl.textContent = now.toLocaleDateString();
    }

    update();
    const interval = setInterval(update, 1000);
    ctx.onClose(() => clearInterval(interval));
  });
}
