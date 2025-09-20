
export const meta = { id: 'clock', name: 'Clock', icon: '/icons/clock.png' };
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
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.fontSize = '32px';
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', 'Current time and date');

  const timeEl = document.createElement('div');
  timeEl.style.fontWeight = '600';
  const dateEl = document.createElement('div');
  dateEl.style.fontSize = '18px';
  const zoneEl = document.createElement('div');
  zoneEl.style.fontSize = '14px';
  zoneEl.style.opacity = '0.8';
  container.append(timeEl, dateEl, zoneEl);

  const locale = navigator.language || undefined;
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const zoneFormatter = new Intl.DateTimeFormat(locale, {
    timeZoneName: 'long',
  });

  const update = () => {
    const now = new Date();
    timeEl.textContent = timeFormatter.format(now);
    dateEl.textContent = dateFormatter.format(now);
    zoneEl.textContent = zoneFormatter.formatToParts(now)
      .filter((part) => part.type === 'timeZoneName')
      .map((part) => part.value)
      .join('');
  };

  update();
  const interval = setInterval(update, 1000);

  winEl.addEventListener(
    'window-closed',
    () => {
      clearInterval(interval);
    },
    { once: true },
  );
}
