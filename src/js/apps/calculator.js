
export const meta = { id: 'calculator', name: 'Calculator', icon: '/icons/calculator.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  ctx.globals.addLog?.('Calculator opened');
  const container = winEl.classList.contains('window')
    ? winEl.querySelector('.content')
    : winEl;
  if (!container) return;
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.width = '200px';

  const display = document.createElement('input');
  display.type = 'text';
  display.readOnly = true;
  display.value = '0';
  display.style.textAlign = 'right';
  display.style.fontSize = '20px';
  display.style.marginBottom = '4px';

  const buttons = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+'],
    ['C'],
  ];

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(4,1fr)';
  grid.style.gap = '4px';

  buttons.flat().forEach((label) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.fontSize = '18px';
    btn.style.padding = '8px';
    btn.addEventListener('click', () => {
      if (label === 'C') {
        display.value = '0';
      } else if (label === '=') {
        try {
          const expr = display.value;
          if (/^[0-9.\/*+\-\s]+$/.test(expr)) {
            display.value = String(eval(expr));
          } else {
            display.value = 'Err';
          }
        } catch (err) {
          display.value = 'Err';
        }
      } else {
        if (display.value === '0' && /[0-9]/.test(label)) {
          display.value = label;
        } else {
          display.value += label;
        }
      }
    });
    grid.append(btn);
  });

  container.append(display, grid);
}
