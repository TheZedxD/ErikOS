
export const meta = { id: 'gallery', name: 'Gallery', icon: '/icons/gallery.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  addLog('Gallery opened');
  const container = winEl.classList.contains('window')
    ? winEl.querySelector('.content')
    : winEl;
  if (!container) return;
  container.innerHTML = '';
  container.classList.add('file-manager');

  const toolbar = document.createElement('div');
  toolbar.classList.add('file-manager-toolbar');
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add Images';
  toolbar.append(addBtn);

  const content = document.createElement('div');
  content.classList.add('file-manager-content');
  content.style.display = 'flex';
  content.style.flexWrap = 'wrap';
  content.style.gap = '8px';
  container.append(toolbar, content);

  function renderThumbnail(src) {
    const thumb = document.createElement('img');
    thumb.src = src;
    thumb.style.width = '80px';
    thumb.style.height = '80px';
    thumb.style.objectFit = 'cover';
    thumb.style.cursor = 'pointer';
    thumb.addEventListener('click', () => {
      const viewer = document.createElement('img');
      viewer.src = src;
      viewer.style.maxWidth = '100%';
      viewer.style.maxHeight = '100%';
      const viewContainer = document.createElement('div');
      viewContainer.style.display = 'flex';
      viewContainer.style.justifyContent = 'center';
      viewContainer.style.alignItems = 'center';
      viewContainer.style.height = '100%';
      viewContainer.append(viewer);
      ctx.windowManager.createWindow('image', 'Image Viewer', viewContainer);
    });
    content.append(thumb);
  }

  addBtn.addEventListener('click', async () => {
    if (window.showOpenFilePicker) {
      try {
        const handles = await window.showOpenFilePicker({
          types: [
            {
              description: 'Images',
              accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp'] },
            },
          ],
          multiple: true,
        });
        for (const handle of handles) {
          const file = await handle.getFile();
          const url = URL.createObjectURL(file);
          renderThumbnail(url);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.style.display = 'none';
      document.body.append(input);
      input.addEventListener('change', () => {
        Array.from(input.files).forEach((file) => {
          const url = URL.createObjectURL(file);
          renderThumbnail(url);
        });
        input.remove();
      });
      input.click();
    }
  });
}
