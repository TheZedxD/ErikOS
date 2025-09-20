import { APIClient } from '../utils/api.js';

export const meta = { id: 'diagnostics', name: 'Diagnostics', icon: '/icons/settings-icon.png' };

export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}

export function mount(winEl, ctx) {
  const container = winEl.querySelector('.content');
  container.style.padding = '8px';
  container.textContent = 'Running diagnostics...';
  const api = new APIClient(ctx);
  api.getJSON('/api/diagnostics/run')
    .then(res => {
      if (!res.ok) throw new Error(res.error);
      const data = res.data;
      container.innerHTML = '';
      if (data.issues && data.issues.length) {
        const list = document.createElement('ul');
        data.issues.forEach(iss => {
          const li = document.createElement('li');
          li.textContent = iss;
          list.append(li);
        });
        const issuesHeading = document.createElement('h3');
        issuesHeading.textContent = 'Issues detected';
        issuesHeading.style.marginTop = '0';
        container.append(issuesHeading, list);
      } else {
        const ok = document.createElement('p');
        ok.textContent = 'All checks passed';
        ok.style.marginTop = '0';
        container.append(ok);
      }

      const errors = Array.isArray(data.errors) ? data.errors : [];
      const errorSection = document.createElement('section');
      errorSection.style.marginTop = '16px';
      const errorHeading = document.createElement('h3');
      errorHeading.textContent = 'Recent app errors';
      errorHeading.style.marginBottom = '8px';
      errorSection.append(errorHeading);

      if (errors.length === 0) {
        const empty = document.createElement('p');
        empty.textContent = 'No recent client errors logged.';
        errorSection.append(empty);
      } else {
        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        list.style.padding = '0';
        errors.forEach(err => {
          const item = document.createElement('li');
          item.style.marginBottom = '12px';
          const header = document.createElement('strong');
          const appName = err.app || 'unknown';
          header.textContent = `[${err.timestamp}] ${appName}: ${err.message}`;
          item.append(header);
          if (err.stack) {
            const pre = document.createElement('pre');
            pre.textContent = err.stack;
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.margin = '4px 0 0';
            pre.style.padding = '6px';
            pre.style.background = 'var(--window-border-dark, #1b1b1b)';
            pre.style.borderRadius = '4px';
            pre.style.maxHeight = '160px';
            pre.style.overflow = 'auto';
            item.append(pre);
          }
          list.append(item);
        });
        errorSection.append(list);
      }

      container.append(errorSection);
    })
    .catch(err => {
      container.textContent = 'Diagnostics failed: ' + err;
    });
}
