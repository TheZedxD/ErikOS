
import { pickOpen } from '../utils/file-dialogs.js';

export const meta = { id: 'media-player', name: 'Media Player', icon: '/icons/media-player.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  ctx.globals.addLog?.('Media Player opened');
  const container = winEl.classList.contains('window')
    ? winEl.querySelector('.content')
    : winEl;
  if (!container) return;
  container.innerHTML = '';
  container.classList.add('file-manager');

  const toolbar = document.createElement('div');
  toolbar.classList.add('file-manager-toolbar');
  const openBtn = document.createElement('button');
  openBtn.textContent = 'Open Media';
  toolbar.append(openBtn);

  const content = document.createElement('div');
  content.classList.add('file-manager-content');
  container.append(toolbar, content);

  let currentEl = null;

  async function loadFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    content.innerHTML = '';
    if (currentEl) {
      currentEl.pause();
      currentEl.src = '';
      currentEl = null;
    }
    if (file.type.startsWith('video')) {
      currentEl = document.createElement('video');
      currentEl.controls = true;
      currentEl.style.maxWidth = '100%';
      currentEl.style.maxHeight = '100%';
      currentEl.src = url;
      ctx.globals.addAudioElement?.(currentEl);
      content.append(currentEl);
      currentEl.play();
    } else if (file.type.startsWith('audio')) {
      currentEl = document.createElement('audio');
      currentEl.controls = true;
      currentEl.src = url;
      ctx.globals.addAudioElement?.(currentEl);
      content.append(currentEl);
      currentEl.play();
    } else {
      const p = document.createElement('p');
      p.textContent = 'Unsupported file type.';
      content.append(p);
    }
  }

  openBtn.addEventListener('click', async () => {
    try {
      const selection = await (ctx?.fileDialogs?.pickOpen
        ? ctx.fileDialogs.pickOpen({
            types: [
              {
                description: 'Media',
                accept: {
                  'audio/*': ['.mp3', '.wav', '.ogg'],
                  'video/*': ['.mp4', '.webm', '.ogg'],
                },
              },
            ],
          })
        : pickOpen({
            types: [
              {
                description: 'Media',
                accept: {
                  'audio/*': ['.mp3', '.wav', '.ogg'],
                  'video/*': ['.mp4', '.webm', '.ogg'],
                },
              },
            ],
          }));
      const entry = Array.isArray(selection) ? selection[0] : selection;
      if (!entry) return;
      await loadFile(entry.file);
    } catch (err) {
      console.error(err);
    }
  });
}
