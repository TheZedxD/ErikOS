
import {
  getGlobalVolume,
  setGlobalVolume,
  onVolumeChange,
} from '../utils/audioBus.js';

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
  container.style.gap = '8px';
  container.setAttribute('role', 'group');

  const label = document.createElement('label');
  label.textContent = 'Volume:';
  label.htmlFor = 'volume-slider';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '1';
  slider.step = '0.01';
  slider.id = 'volume-slider';
  const initial =
    (ctx.globals && typeof ctx.globals.globalVolume === 'number'
      ? ctx.globals.globalVolume
      : getGlobalVolume());
  slider.value = String(initial);
  const applyVolume = (value) => {
    const next = Number.parseFloat(String(value));
    if (!Number.isFinite(next)) return;
    setGlobalVolume(next);
  };
  slider.addEventListener('input', () => {
    const value = parseFloat(slider.value);
    if (ctx.globals?.setGlobalVolume) {
      ctx.globals.setGlobalVolume(value);
    } else {
      applyVolume(value);
    }
  });

  const unsubscribe = onVolumeChange((volume) => {
    const current = Number.parseFloat(slider.value);
    if (!Number.isFinite(current) || Math.abs(current - volume) > 0.001) {
      slider.value = String(volume);
    }
  });

  container.append(label, slider);

  winEl.addEventListener(
    'window-closed',
    () => {
      unsubscribe?.();
    },
    { once: true },
  );
}
