
export const meta = { id: 'media-player', name: 'Media Player', icon: '/icons/media-player.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  addLog('Media Player opened');
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
      addAudioElement(currentEl);
      content.append(currentEl);
      currentEl.play();
    } else if (file.type.startsWith('audio')) {
      currentEl = document.createElement('audio');
      currentEl.controls = true;
      currentEl.src = url;
      addAudioElement(currentEl);
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
      if (window.showOpenFilePicker) {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'Media',
              accept: {
                'audio/*': ['.mp3', '.wav', '.ogg'],
                'video/*': ['.mp4', '.webm', '.ogg'],
              },
            },
          ],
          multiple: false,
        });
        const file = await handle.getFile();
        await loadFile(file);
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*,video/*';
        input.style.display = 'none';
        document.body.append(input);
        input.addEventListener('change', () => {
          const file = input.files[0];
          loadFile(file);
          input.remove();
        });
        input.click();
      }
    } catch (err) {
      console.error(err);
    }
  });
}
