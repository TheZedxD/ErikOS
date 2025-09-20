
import { pickOpen } from '../utils/file-dialogs.js';

export const meta = { id: 'media-player', name: 'Media Player', icon: '/icons/media-player.png' };

export function launch(ctx, initial = null) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id)?.element;
  if (!win) return;
  mount(win, ctx, initial);
}

export function mount(winEl, ctx, initial = null) {
  ctx.globals.addLog?.('Media Player opened');
  const container = winEl.classList.contains('window')
    ? winEl.querySelector('.content')
    : winEl;
  if (!container) return;

  container.innerHTML = '';
  container.classList.add('media-player');

  const dialogs = {
    pickOpen: ctx?.fileDialogs?.pickOpen ?? pickOpen,
  };
  const BlobCtor = typeof Blob !== 'undefined' ? Blob : null;

  const toolbar = document.createElement('div');
  toolbar.classList.add('media-player-toolbar');
  const openBtn = document.createElement('button');
  openBtn.textContent = 'Open Media';
  toolbar.append(openBtn);

  const stage = document.createElement('div');
  stage.classList.add('media-player-stage');

  const controls = document.createElement('div');
  controls.classList.add('media-player-controls');
  const playPause = document.createElement('button');
  playPause.textContent = 'Play';
  playPause.disabled = true;
  const seek = document.createElement('input');
  seek.type = 'range';
  seek.min = '0';
  seek.max = '0';
  seek.step = '0.01';
  seek.value = '0';
  seek.disabled = true;
  const timeLabel = document.createElement('span');
  timeLabel.textContent = '0:00 / 0:00';
  controls.append(playPause, seek, timeLabel);

  const status = document.createElement('div');
  status.classList.add('media-player-status');
  status.textContent = 'No media loaded.';

  container.append(toolbar, stage, controls, status);

  let currentEl = null;
  let currentSource = null;
  let cleanupAudio = null;
  let scrubbing = false;

  function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return '0:00';
    const whole = Math.floor(value);
    const minutes = Math.floor(whole / 60);
    const seconds = String(whole % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  function detectType(source) {
    const mime = source?.mime || source?.blob?.type || '';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    const name = source?.name || '';
    const ext = name.split('.').pop().toLowerCase();
    if (['mp4', 'webm', 'mkv', 'mov', 'm4v'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) return 'audio';
    return mime.startsWith('video') ? 'video' : 'audio';
  }

  function disposeCurrent() {
    if (currentEl) {
      try {
        currentEl.pause();
      } catch (err) {
        /* ignore */
      }
      currentEl.remove();
      currentEl = null;
    }
    stage.innerHTML = '';
    if (cleanupAudio) {
      cleanupAudio();
      cleanupAudio = null;
    }
    if (currentSource?.ownedUrl) {
      URL.revokeObjectURL(currentSource.ownedUrl);
    }
    currentSource = null;
    playPause.disabled = true;
    seek.disabled = true;
    seek.value = '0';
    seek.max = '0';
    timeLabel.textContent = '0:00 / 0:00';
    status.textContent = 'No media loaded.';
  }

  function updateTimeUI() {
    if (!currentEl) return;
    const { currentTime, duration, paused } = currentEl;
    if (!scrubbing) seek.value = String(currentTime || 0);
    if (Number.isFinite(duration) && duration > 0) {
      seek.max = String(duration);
      timeLabel.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    } else {
      timeLabel.textContent = `${formatTime(currentTime)} / 0:00`;
    }
    playPause.textContent = paused ? 'Play' : 'Pause';
  }

  function wireMedia(el) {
    el.addEventListener('loadedmetadata', () => {
      seek.disabled = false;
      playPause.disabled = false;
      seek.max = Number.isFinite(el.duration) ? String(el.duration) : '0';
      updateTimeUI();
    });
    el.addEventListener('timeupdate', updateTimeUI);
    el.addEventListener('play', updateTimeUI);
    el.addEventListener('pause', updateTimeUI);
    el.addEventListener('ended', updateTimeUI);
  }

  async function loadSource(source) {
    if (!source) return;
    let normalized = source;
    if (typeof source === 'string') {
      normalized = { src: source };
    } else if (BlobCtor && source instanceof BlobCtor) {
      normalized = { blob: source };
    }
    disposeCurrent();
    const type = detectType(normalized) || 'audio';
    const mediaEl = document.createElement(type === 'video' ? 'video' : 'audio');
    mediaEl.controls = true;
    mediaEl.style.maxWidth = '100%';
    mediaEl.style.maxHeight = '100%';

    let url = normalized.url || normalized.src || '';
    if (!url && BlobCtor && normalized.blob instanceof BlobCtor) {
      url = URL.createObjectURL(normalized.blob);
      normalized.ownedUrl = url;
    }
    if (!url) {
      status.textContent = 'Unsupported media format.';
      return;
    }
    mediaEl.src = url;
    stage.innerHTML = '';
    stage.append(mediaEl);
    currentEl = mediaEl;
    currentSource = normalized;
    cleanupAudio = ctx.globals.addAudioElement?.(mediaEl) || null;
    status.textContent = normalized.name || normalized.path || 'Playing media';
    wireMedia(mediaEl);
    try {
      await mediaEl.play();
    } catch (err) {
      console.warn('Autoplay prevented', err);
    }
    updateTimeUI();
  }

  openBtn.addEventListener('click', async () => {
    try {
      const selection = await dialogs.pickOpen({
        types: [
          {
            description: 'Media',
            accept: {
              'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
              'video/*': ['.mp4', '.webm', '.ogg', '.mov', '.m4v'],
            },
          },
        ],
        multiple: false,
      });
      const entry = Array.isArray(selection) ? selection[0] : selection;
      if (!entry) return;
      await loadSource({ blob: entry.file, name: entry.file?.name });
    } catch (err) {
      console.error('Media picker failed', err);
    }
  });

  playPause.addEventListener('click', () => {
    if (!currentEl) return;
    if (currentEl.paused) currentEl.play().catch(() => {});
    else currentEl.pause();
  });

  seek.addEventListener('input', () => {
    if (!currentEl) return;
    scrubbing = true;
    const next = parseFloat(seek.value);
    if (Number.isFinite(next)) {
      currentEl.currentTime = next;
    }
  });
  seek.addEventListener('change', () => {
    scrubbing = false;
    updateTimeUI();
  });
  seek.addEventListener('pointerup', () => {
    scrubbing = false;
    updateTimeUI();
  });
  seek.addEventListener('keyup', () => {
    scrubbing = false;
    updateTimeUI();
  });
  seek.addEventListener('touchend', () => {
    scrubbing = false;
    updateTimeUI();
  });

  const cleanup = () => {
    disposeCurrent();
  };
  winEl.addEventListener('window-closed', cleanup, { once: true });

  if (initial) {
    loadSource(initial);
  }
}
