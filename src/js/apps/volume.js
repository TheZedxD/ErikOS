
export const meta = { id: 'volume', name: 'Volume', icon: '/icons/media-player.png' };
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
  container.style.alignItems = 'stretch';

  const label = document.createElement('label');
  label.textContent = 'Volume:';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '1';
  slider.step = '0.01';
  slider.value = String(ctx.globals.globalVolume);
  slider.addEventListener('input', () => {
    ctx.globals.setGlobalVolume?.(parseFloat(slider.value));
  });

  container.append(label, slider);
}
