import { addLog } from '../core/globals.js';
import { openAppWindow } from '../utils/appWindow.js';

const STORAGE_KEY = 'erikos-world-clocks';

function loadClocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((c) => c && c.zone);
  } catch (err) {
    console.warn('Failed to load clocks', err);
  }
  return [];
}

function saveClocks(clocks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clocks));
  } catch (err) {
    console.warn('Failed to save clocks', err);
  }
}

export function openWorldClock() {
  addLog('World Clocks opened');
  openAppWindow('world-clock', 'World Clocks', (content, ctx) => {
    content.innerHTML = '';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.height = '100%';
    content.style.gap = '6px';

    const toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.gap = '4px';
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Clock';
    toolbar.append(addBtn);

    const list = document.createElement('div');
    list.style.flex = '1';
    list.style.overflowY = 'auto';
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '4px';

    content.append(toolbar, list);

    let clocks = loadClocks();
    const timers = new Set();

    function clearTimers() {
      timers.forEach((t) => clearInterval(t));
      timers.clear();
    }

    function render() {
      list.innerHTML = '';
      clearTimers();
      if (!clocks.length) {
        const empty = document.createElement('p');
        empty.textContent = 'No clocks configured.';
        list.append(empty);
        return;
      }

      clocks.forEach((clock, index) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';

        const label = document.createElement('span');
        label.textContent = `${clock.label || clock.zone} (${clock.zone})`;

        const timeEl = document.createElement('span');
        timeEl.style.marginLeft = 'auto';
        timeEl.style.fontFamily = 'monospace';

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
          clocks.splice(index, 1);
          saveClocks(clocks);
          render();
        });

        row.append(label, timeEl, removeBtn);
        list.append(row);

        const update = () => {
          try {
            const formatted = new Intl.DateTimeFormat([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZone: clock.zone,
            }).format(new Date());
            timeEl.textContent = formatted;
          } catch (err) {
            timeEl.textContent = 'Invalid zone';
          }
        };
        update();
        timers.add(setInterval(update, 1000));
      });
    }

    addBtn.addEventListener('click', () => {
      const zone = prompt('Enter IANA time zone (e.g. America/New_York)');
      if (!zone) return;
      const label = prompt('Label for this clock', zone) || zone;
      clocks.push({ zone, label });
      saveClocks(clocks);
      render();
    });

    ctx.onClose(clearTimers);
    render();
  });
}
