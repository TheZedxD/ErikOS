const STORAGE_KEY = 'erikos-global-volume';
const tracked = new Set();
const listeners = new Set();

function clamp(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.min(1, Math.max(0, num));
}

function loadInitialVolume() {
  if (typeof localStorage === 'undefined') return 1;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return 1;
    return clamp(raw);
  } catch (err) {
    console.warn('Failed to read stored volume', err);
    return 1;
  }
}

let globalVolume = loadInitialVolume();

function notifyVolumeChange() {
  for (const listener of listeners) {
    try {
      listener(globalVolume);
    } catch (err) {
      console.warn('Volume listener failed', err);
    }
  }
  if (typeof window !== 'undefined') {
    window.globalVolume = globalVolume;
    try {
      window.dispatchEvent(
        new CustomEvent('global-volume-change', { detail: { volume: globalVolume } }),
      );
    } catch (err) {
      // ignore when CustomEvent not available
    }
  }
}

function applyVolume(el) {
  if (!el) return;
  try {
    if (Math.abs(el.volume - globalVolume) > 0.0001) {
      el.volume = globalVolume;
    }
  } catch (err) {
    console.warn('Failed to set media element volume', err);
  }
}

export function getGlobalVolume() {
  return globalVolume;
}

export function setGlobalVolume(value) {
  const next = clamp(value);
  if (Math.abs(next - globalVolume) < 0.0001) return globalVolume;
  globalVolume = next;
  tracked.forEach(applyVolume);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, String(globalVolume));
    } catch (err) {
      console.warn('Failed to persist volume', err);
    }
  }
  notifyVolumeChange();
  return globalVolume;
}

export function registerAudio(el) {
  if (!el || typeof el.volume !== 'number') return () => {};
  tracked.add(el);
  applyVolume(el);
  const enforceVolume = () => applyVolume(el);
  const onVolumeChange = () => {
    if (Math.abs(el.volume - globalVolume) > 0.0001) {
      enforceVolume();
    }
  };
  el.addEventListener('play', enforceVolume);
  el.addEventListener('loadedmetadata', enforceVolume);
  el.addEventListener('volumechange', onVolumeChange);
  const cleanup = () => {
    el.removeEventListener('play', enforceVolume);
    el.removeEventListener('loadedmetadata', enforceVolume);
    el.removeEventListener('volumechange', onVolumeChange);
    tracked.delete(el);
  };
  el.addEventListener('emptied', cleanup, { once: true });
  el.addEventListener('ended', enforceVolume);
  return () => {
    cleanup();
  };
}

export function onVolumeChange(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  try {
    listener(globalVolume);
  } catch (err) {
    console.warn('Volume listener failed during registration', err);
  }
  return () => {
    listeners.delete(listener);
  };
}

if (typeof window !== 'undefined') {
  window.globalVolume = globalVolume;
  window.setGlobalVolume = setGlobalVolume;
  window.addAudioElement = registerAudio;
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('storage', (event) => {
      if (event.storageArea !== localStorage) return;
      if (event.key === STORAGE_KEY && event.newValue != null) {
        const next = clamp(event.newValue);
        if (Math.abs(next - globalVolume) > 0.0001) {
          globalVolume = next;
          tracked.forEach(applyVolume);
          notifyVolumeChange();
        }
      }
    });
  }
}

export default {
  getGlobalVolume,
  setGlobalVolume,
  registerAudio,
  onVolumeChange,
};
