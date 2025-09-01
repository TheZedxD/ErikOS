
export const meta = { id: 'paint', name: 'Paint', icon: '/icons/paint.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  const msg = document.createElement('div');
  msg.textContent = `${meta.name} app coming soon`;
  winEl.appendChild(msg);
}
