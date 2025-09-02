
export const meta = { id: 'logs', name: 'Logs', icon: '/icons/logs.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  const container = winEl.querySelector('.content');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '100%';

  const dateSelect = document.createElement('select');
  const logList = document.createElement('div');
  logList.style.flex = '1';
  logList.style.overflowY = 'auto';
  logList.style.border = '1px solid var(--window-border-dark)';
  logList.style.padding = '4px';

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear Logs';

  function render() {
    logList.innerHTML = '';
    const selected = dateSelect.value;
    const entries = ctx.globals.logsData[selected] || [];
    entries.forEach(entry => {
      const p = document.createElement('div');
      p.textContent = `[${entry.time}] ${entry.message}`;
      logList.append(p);
    });
  }

  function refreshDates() {
    dateSelect.innerHTML = '';
    const keys = Object.keys(ctx.globals.logsData).sort().reverse();
    keys.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k; opt.textContent = k; dateSelect.append(opt);
    });
    if (keys.length > 0) {
      dateSelect.value = keys[0];
      render();
    } else {
      logList.innerHTML = '';
    }
  }

  clearBtn.addEventListener('click', () => {
    if (confirm('Clear all logs?')) {
      ctx.globals.logsData = {};
      ctx.globals.saveLogs?.();
      refreshDates();
    }
  });

  dateSelect.addEventListener('change', render);

  container.append(dateSelect, logList, clearBtn);
  refreshDates();
}
