
import { APIClient } from '../utils/api.js';

export const meta = { id: 'processes', name: 'System Processes', icon: '/icons/processes.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  const container = winEl;
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '100%';

  const api = new APIClient(ctx);

  const tabs = document.createElement('div');
  tabs.classList.add('settings-tabs');
  const contentArea = document.createElement('div');
  contentArea.style.flex = '1';
  contentArea.style.overflowY = 'auto';

  const panels = {};
  const tabBtns = {};
  function makePanel(name) {
    const panel = document.createElement('div');
    panel.classList.add('settings-section');
    panel.style.display = 'none';
    panels[name] = panel;
    contentArea.append(panel);
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.addEventListener('click', () => showPanel(name));
    tabs.append(btn);
    tabBtns[name] = btn;
    return panel;
  }

  function showPanel(name) {
    Object.entries(panels).forEach(([n, p]) => {
      p.style.display = n === name ? 'block' : 'none';
    });
    Object.entries(tabBtns).forEach(([n, b]) => {
      b.classList.toggle('active', n === name);
    });
  }

  const procPanel = makePanel('Processes');
  const scriptsSection = document.createElement('div');
  const windowsSection = document.createElement('div');
  procPanel.append(scriptsSection, windowsSection);

  const statsPanel = makePanel('Stats');
  const cpuText = document.createElement('p');
  const ramText = document.createElement('p');
  statsPanel.append(cpuText, ramText);

  container.append(tabs, contentArea);
  showPanel('Processes');

  async function load() {
    try {
      const statsResp = await api.getJSON('/api/system-stats');
      if (statsResp.ok) {
        const stats = statsResp.data;
        cpuText.textContent = `CPU Usage: ${stats.cpu}%`;
        ramText.textContent = `RAM Usage: ${stats.ram}%`;
      } else {
        throw new Error();
      }
    } catch {
      cpuText.textContent = 'CPU Usage: n/a';
      ramText.textContent = 'RAM Usage: n/a';
    }

    scriptsSection.innerHTML = '<h3>Running Scripts</h3>';
    try {
      const resp = await api.getJSON('/api/list-scripts');
      if (!resp.ok) throw new Error();
      const data = resp.data;
      if (!Array.isArray(data.processes) || data.processes.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'No running scripts.';
        scriptsSection.append(p);
      } else {
        data.processes.forEach(proc => {
          const row = document.createElement('div');
          row.classList.add('file-item');
          const nameSpan = document.createElement('span');
          nameSpan.textContent = `${proc.script} (PID ${proc.pid})`;
          const stopBtn = document.createElement('button');
          stopBtn.textContent = 'Stop';
          stopBtn.addEventListener('click', async () => {
            try {
              await api.postJSON('/api/stop-script', { pid: proc.pid });
            } catch {}
            load();
          });
          stopBtn.style.marginLeft = 'auto';
          stopBtn.style.padding = '2px 6px';
          stopBtn.style.fontSize = '12px';
          stopBtn.style.background = 'var(--button-bg)';
          stopBtn.style.borderTop = `2px solid var(--btn-border-light)`;
          stopBtn.style.borderLeft = `2px solid var(--btn-border-light)`;
          stopBtn.style.borderRight = `2px solid var(--btn-border-dark)`;
          stopBtn.style.borderBottom = `2px solid var(--btn-border-dark)`;
          row.append(nameSpan, stopBtn);
          scriptsSection.append(row);
        });
      }
    } catch {
      const p = document.createElement('p');
      p.textContent = 'Failed to load processes.';
      scriptsSection.append(p);
    }

    windowsSection.innerHTML = '<h3>Open Windows</h3>';
    ctx.windowManager.windows.forEach(info => {
      const row = document.createElement('div');
      row.classList.add('file-item');
      const title = info.element.querySelector('.title');
      row.textContent = title ? title.textContent : 'Unnamed';
      windowsSection.append(row);
    });
    if (windowsSection.childElementCount === 1) {
      const p = document.createElement('p');
      p.textContent = 'No open windows.';
      windowsSection.append(p);
    }
  }

  load();
  const interval = setInterval(load, 4000);
  const closeBtn = winEl.querySelector('.controls button:last-child');
  if (closeBtn) closeBtn.addEventListener('click', () => clearInterval(interval));
}
