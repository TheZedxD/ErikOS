import { addLog } from '../core/globals.js';
import { openAppWindow } from '../utils/appWindow.js';

export function openCalculator() {
  addLog('Calculator opened');
  openAppWindow('calculator', 'Calculator', (content) => {
    content.innerHTML = '';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.width = '220px';
    content.style.gap = '6px';

    const display = document.createElement('input');
    display.type = 'text';
    display.readOnly = true;
    display.value = '0';
    display.style.fontSize = '22px';
    display.style.textAlign = 'right';
    display.style.padding = '6px';

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
    grid.style.gap = '4px';

    const buttons = [
      '7', '8', '9', '/',
      '4', '5', '6', '*',
      '1', '2', '3', '-',
      '0', '.', '=', '+',
      'C'
    ];

    function appendValue(val) {
      if (display.value === '0' && /[0-9.]/.test(val)) {
        display.value = val;
      } else {
        display.value += val;
      }
    }

    buttons.forEach((label) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.padding = '8px';
      btn.style.fontSize = '18px';
      btn.addEventListener('click', () => {
        if (label === 'C') {
          display.value = '0';
        } else if (label === '=') {
          try {
            const expr = display.value;
            if (/^[0-9.\s+\-*/]+$/.test(expr)) {
              const result = eval(expr);
              display.value = Number.isFinite(result) ? String(result) : 'Err';
            } else {
              display.value = 'Err';
            }
          } catch (err) {
            display.value = 'Err';
          }
        } else {
          appendValue(label);
        }
      });
      if (label === 'C') {
        btn.style.gridColumn = 'span 4';
      }
      grid.append(btn);
    });

    content.append(display, grid);
  });
}
