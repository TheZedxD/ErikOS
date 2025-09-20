import { addLog } from '../core/globals.js';
import { openAppWindow } from '../utils/appWindow.js';

const units = ['C', 'F', 'K'];

function toCelsius(value, unit) {
  switch (unit) {
    case 'C':
      return value;
    case 'F':
      return (value - 32) * (5 / 9);
    case 'K':
      return value - 273.15;
    default:
      return value;
  }
}

function fromCelsius(value, unit) {
  switch (unit) {
    case 'C':
      return value;
    case 'F':
      return value * (9 / 5) + 32;
    case 'K':
      return value + 273.15;
    default:
      return value;
  }
}

export function openTempConverter() {
  addLog('Temperature Converter opened');
  openAppWindow('thermometer', 'Temperature', (content) => {
    content.innerHTML = '';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '6px';

    const input = document.createElement('input');
    input.type = 'number';
    input.placeholder = 'Enter temperature';

    const fromSel = document.createElement('select');
    const toSel = document.createElement('select');
    units.forEach((unit) => {
      const opt1 = document.createElement('option');
      opt1.value = unit;
      opt1.textContent = unit;
      fromSel.append(opt1);
      const opt2 = document.createElement('option');
      opt2.value = unit;
      opt2.textContent = unit;
      toSel.append(opt2);
    });
    toSel.value = 'F';

    const result = document.createElement('div');
    result.style.minHeight = '24px';

    function update() {
      const value = parseFloat(input.value);
      if (Number.isNaN(value)) {
        result.textContent = '';
        return;
      }
      const celsius = toCelsius(value, fromSel.value);
      const converted = fromCelsius(celsius, toSel.value);
      result.textContent = `${value} ${fromSel.value} = ${converted.toFixed(2)} ${toSel.value}`;
    }

    input.addEventListener('input', update);
    fromSel.addEventListener('change', update);
    toSel.addEventListener('change', update);

    content.append(input, fromSel, toSel, result);
  });
}
