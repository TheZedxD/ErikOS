
import { pickOpen } from '../utils/file-dialogs.js';

export const meta = { id: 'gallery', name: 'Gallery', icon: '/icons/gallery.png' };
export function launch(ctx, initialImages = []) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx, initialImages);
}
export function mount(winEl, ctx, initialImages = []) {
  ctx.globals.addLog?.('Gallery opened');
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

  function addImageFromSource(src) {
    if (!src) return;
    renderThumbnail(src);
  }

  initialImages.forEach((img) => {
    if (typeof img === 'string') addImageFromSource(img);
    else if (img && typeof img.src === 'string') addImageFromSource(img.src);
  });

  addBtn.addEventListener('click', async () => {
    try {
      const selection = await (ctx?.fileDialogs?.pickOpen
        ? ctx.fileDialogs.pickOpen({
            types: [
              {
                description: 'Images',
                accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'] },
              },
            ],
            multiple: true,
          })
        : pickOpen({
            types: [
              {
                description: 'Images',
                accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'] },
              },
            ],
            multiple: true,
          }));
      const entries = Array.isArray(selection)
        ? selection
        : selection
        ? [selection]
        : [];
      for (const entry of entries) {
        const url = URL.createObjectURL(entry.file);
        addImageFromSource(url);
      }
    } catch (err) {
      console.error(err);
    }
  });
}
