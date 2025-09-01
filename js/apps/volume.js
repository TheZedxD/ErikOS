import { openAppWindow } from '../utils/appWindow.js';

export function openSoundAdjuster() {
  openAppWindow('volume', 'Volume');
}
