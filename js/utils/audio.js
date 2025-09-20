const STORAGE_KEY = 'erikos-global-volume';

function clamp(value) {
  return Math.min(1, Math.max(0, value));
}

function loadVolume() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw == null) return 1;
  const num = Number(raw);
  return Number.isFinite(num) ? clamp(num) : 1;
}

let globalVolume = loadVolume();
const tracked = new Set();

function applyVolume(el) {
  if (!el) return;
  try {
    el.volume = globalVolume;
  } catch (err) {
    console.warn('Failed to set element volume', err);
  }
}

export function getGlobalVolume() {
  return globalVolume;
}

export function setGlobalVolume(value) {
  globalVolume = clamp(value);
  tracked.forEach(applyVolume);
  try {
    localStorage.setItem(STORAGE_KEY, String(globalVolume));
  } catch (err) {
    console.warn('Failed to persist volume', err);
  }
}

export function addAudioElement(el) {
  if (!el) return () => {};
  tracked.add(el);
  applyVolume(el);
  const cleanup = () => {
    tracked.delete(el);
  };
  el.addEventListener('volumechange', () => {
    if (Math.abs(el.volume - globalVolume) > 0.001) {
      applyVolume(el);
    }
  });
  el.addEventListener('emptied', cleanup, { once: true });
  el.addEventListener('ended', () => applyVolume(el));
  return cleanup;
}

export function removeAudioElement(el) {
  tracked.delete(el);
}
