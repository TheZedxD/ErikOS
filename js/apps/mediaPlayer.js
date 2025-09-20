import { addLog } from '../core/globals.js';
import { openAppWindow } from '../utils/appWindow.js';
import { addAudioElement } from '../utils/audio.js';

export function openMediaPlayer() {
  addLog('Media Player opened');
  openAppWindow('media-player', 'Media Player', (content, ctx) => {
    content.innerHTML = '';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.height = '100%';
    content.style.gap = '6px';

    const toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.gap = '4px';
    const openBtn = document.createElement('button');
    openBtn.textContent = 'Open Media';
    toolbar.append(openBtn);

    const viewer = document.createElement('div');
    viewer.style.flex = '1';
    viewer.style.display = 'flex';
    viewer.style.alignItems = 'center';
    viewer.style.justifyContent = 'center';
    viewer.style.background = 'var(--window-bg)';

    content.append(toolbar, viewer);

    let currentEl = null;
    let cleanup = null;
    let currentUrl = null;

    function disposeCurrent() {
      if (currentEl) {
        try {
          currentEl.pause();
        } catch (err) {
          /* ignore */
        }
        if (cleanup) {
          cleanup();
          cleanup = null;
        }
        currentEl.remove();
        currentEl = null;
      }
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
        currentUrl = null;
      }
    }

    async function loadFile(file) {
      if (!file) return;
      disposeCurrent();
      currentUrl = URL.createObjectURL(file);
      viewer.innerHTML = '';
      if (file.type.startsWith('video/')) {
        currentEl = document.createElement('video');
        currentEl.controls = true;
        currentEl.src = currentUrl;
        currentEl.style.maxWidth = '100%';
        currentEl.style.maxHeight = '100%';
      } else if (file.type.startsWith('audio/')) {
        currentEl = document.createElement('audio');
        currentEl.controls = true;
        currentEl.src = currentUrl;
      } else {
        const msg = document.createElement('p');
        msg.textContent = 'Unsupported file type.';
        viewer.append(msg);
        URL.revokeObjectURL(currentUrl);
        currentUrl = null;
        return;
      }
      cleanup = addAudioElement(currentEl);
      viewer.append(currentEl);
      currentEl.play().catch(() => {});
    }

    async function pickFile() {
      try {
        if (window.showOpenFilePicker) {
          const [handle] = await window.showOpenFilePicker({
            multiple: false,
            types: [
              {
                description: 'Media',
                accept: {
                  'audio/*': ['.mp3', '.wav', '.ogg', '.flac'],
                  'video/*': ['.mp4', '.webm', '.ogg', '.mov'],
                },
              },
            ],
          });
          if (handle) {
            const file = await handle.getFile();
            await loadFile(file);
          }
        } else {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'audio/*,video/*';
          input.style.display = 'none';
          document.body.append(input);
          input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            loadFile(file);
            input.remove();
          });
          input.click();
        }
      } catch (err) {
        console.error('Failed to open media', err);
      }
    }

    openBtn.addEventListener('click', pickFile);
    ctx.onClose(disposeCurrent);
  });
}
