
export const meta = { id: 'world-clock', name: 'World Clocks', icon: '/icons/world-clock.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  const container = winEl.querySelector('.content');
  container.classList.add('file-manager');

  const toolbar = document.createElement('div');
  toolbar.classList.add('file-manager-toolbar');
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'World clock tools');
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add Clock';
  addBtn.setAttribute('aria-label', 'Add a world clock');
  toolbar.append(addBtn);

  const content = document.createElement('div');
  content.classList.add('file-manager-content');

  container.append(toolbar, content);

  const intervals = [];
  const clockKey = 'win95-world-clocks';
  let clocks = [];
  try {
    const raw = localStorage.getItem(clockKey);
    clocks = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(clocks)) clocks = [];
  } catch {
    clocks = [];
  }

  function saveClocks() {
    localStorage.setItem(clockKey, JSON.stringify(clocks));
  }

  function render() {
    content.innerHTML = '';
    intervals.forEach(clearInterval);
    intervals.length = 0;
    if (clocks.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'No clocks configured.';
      content.append(p);
    } else {
      clocks.forEach((tz, idx) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        const label = document.createElement('span');
        label.textContent = tz.label + ' (' + tz.zone + ')';
        const timeEl = document.createElement('span');
        timeEl.style.marginLeft = 'auto';
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.setAttribute('aria-label', `Remove clock ${tz.label}`);
        removeBtn.addEventListener('click', () => {
          clearInterval(interval);
          clocks.splice(idx, 1);
          saveClocks();
          render();
        });
        row.append(label, timeEl, removeBtn);
        content.append(row);
        const formatter = (() => {
          try {
            return new Intl.DateTimeFormat(navigator.language || undefined, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZone: tz.zone,
            });
          } catch {
            return null;
          }
        })();
        const update = () => {
          if (!formatter) {
            timeEl.textContent = 'Invalid time zone';
            return;
          }
          try {
            timeEl.textContent = formatter.format(new Date());
          } catch {
            timeEl.textContent = 'Invalid time zone';
          }
        };
        update();
        const interval = setInterval(update, 1000);
        intervals.push(interval);
      });
    }
  }

  addBtn.addEventListener('click', () => {
    const zone = prompt('Enter IANA time zone (e.g. America/New_York)');
    if (!zone) return;
    const label = prompt('Enter label for this clock');
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: zone });
    } catch {
      alert('Invalid time zone');
      return;
    }
    clocks.push({ zone, label: label || zone });
    saveClocks();
    render();
  });

  render();
  winEl.addEventListener(
    'window-closed',
    () => {
      intervals.forEach(clearInterval);
    },
    { once: true },
  );
}
