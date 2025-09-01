export const meta = { id: 'diagnostics', name: 'Diagnostics', icon: '/icons/settings-icon.png' };

export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}

export function mount(winEl, ctx) {
  const container = winEl;
  container.style.padding = '8px';
  container.textContent = 'Running diagnostics...';
  fetch('/api/diagnostics/run')
    .then(r => r.json())
    .then(data => {
      container.innerHTML = '';
      if (data.issues && data.issues.length) {
        const list = document.createElement('ul');
        data.issues.forEach(iss => {
          const li = document.createElement('li');
          li.textContent = iss;
          list.append(li);
        });
        container.append('Issues detected:', list);
      } else {
        container.textContent = 'All checks passed';
      }
    })
    .catch(err => {
      container.textContent = 'Diagnostics failed: ' + err;
    });
}
