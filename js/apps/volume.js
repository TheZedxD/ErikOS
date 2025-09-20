import { addLog } from '../core/globals.js';
import { openAppWindow } from '../utils/appWindow.js';
import { getGlobalVolume, setGlobalVolume } from '../utils/audio.js';

export function openSoundAdjuster() {
  addLog('Volume control opened');
  openAppWindow('volume', 'Volume', (content) => {
    content.innerHTML = '';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '6px';

    const label = document.createElement('label');
    label.textContent = 'Volume:';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(Math.round(getGlobalVolume() * 100));

    slider.addEventListener('input', () => {
      const value = Number(slider.value) / 100;
      setGlobalVolume(value);
    });

    content.append(label, slider);
  });
}
