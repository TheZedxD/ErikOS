
export const meta = { id: 'thermometer', name: 'Temperature', icon: '/icons/thermometer.png' };
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
  container.style.gap = '8px';

  const input = document.createElement('input');
  input.type = 'number';
  input.placeholder = 'Enter value';

  const fromSel = document.createElement('select');
  const toSel = document.createElement('select');
  ['C','F','K'].forEach(unit => {
    const opt1 = document.createElement('option');
    opt1.value = unit; opt1.textContent = unit; fromSel.append(opt1);
    const opt2 = document.createElement('option');
    opt2.value = unit; opt2.textContent = unit; toSel.append(opt2.cloneNode(true));
  });

  const result = document.createElement('div');
  result.style.marginTop = '4px';

  function convert() {
    const val = parseFloat(input.value);
    if (isNaN(val)) { result.textContent=''; return; }
    let c;
    switch (fromSel.value) {
      case 'C': c = val; break;
      case 'F': c = (val - 32) * 5/9; break;
      case 'K': c = val - 273.15; break;
    }
    let out;
    switch (toSel.value) {
      case 'C': out = c; break;
      case 'F': out = c * 9/5 + 32; break;
      case 'K': out = c + 273.15; break;
    }
    result.textContent = val + ' ' + fromSel.value + ' = ' + out.toFixed(2) + ' ' + toSel.value;
  }

  [input, fromSel, toSel].forEach(el => el.addEventListener('input', convert));
  container.append(input, fromSel, toSel, result);
}
