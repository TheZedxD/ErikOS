
export const meta = { id: 'clock', name: 'Clock', icon: '/icons/clock.png' };
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
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.fontSize = '32px';

  const timeEl = document.createElement('div');
  const dateEl = document.createElement('div');
  dateEl.style.fontSize = '18px';
  container.append(timeEl, dateEl);

  function update() {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString();
    dateEl.textContent = now.toLocaleDateString();
  }

  update();
  const interval = setInterval(update, 1000);

  const closeBtn = winEl.querySelector('.controls button:last-child');
  if (closeBtn) closeBtn.addEventListener('click', () => clearInterval(interval));
}
