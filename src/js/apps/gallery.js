
import { pickOpen } from '../utils/file-dialogs.js';

export const meta = { id: 'gallery', name: 'Gallery', icon: '/icons/gallery.png' };

export function launch(ctx, initialImages = []) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id)?.element;
  if (!win) return;
  mount(win, ctx, initialImages);
}

export function mount(winEl, ctx, initialImages = []) {
  ctx.globals.addLog?.('Gallery opened');
  const container = winEl.classList.contains('window')
    ? winEl.querySelector('.content')
    : winEl;
  if (!container) return;

  container.innerHTML = '';
  container.classList.add('gallery');

  const toolbar = document.createElement('div');
  toolbar.classList.add('gallery-toolbar');
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add Images';
  toolbar.append(addBtn);

  const grid = document.createElement('div');
  grid.classList.add('gallery-grid');

  container.append(toolbar, grid);

  const dialogs = {
    pickOpen: ctx?.fileDialogs?.pickOpen ?? pickOpen,
  };

  let counter = 0;
  const items = [];
  const FileCtor = typeof File !== 'undefined' ? File : null;
  const BlobCtor = typeof Blob !== 'undefined' ? Blob : null;

  function normalizeSource(src) {
    if (!src) return null;
    counter += 1;
    const base = { id: `img-${counter}` };
    if ((FileCtor && src instanceof FileCtor) || (BlobCtor && src instanceof BlobCtor)) {
      return { ...base, blob: src, name: src.name || 'Image' };
    }
    if (typeof src === 'string') {
      return { ...base, src };
    }
    if (FileCtor && src.file instanceof FileCtor) {
      return { ...base, blob: src.file, name: src.file.name || src.name, path: src.path };
    }
    if (BlobCtor && src.blob instanceof BlobCtor) {
      return { ...base, blob: src.blob, name: src.name, path: src.path };
    }
    if (src.src) {
      return { ...base, src: src.src, name: src.name, path: src.path };
    }
    return null;
  }

  function releaseItem(item) {
    if (item.objectUrl) {
      URL.revokeObjectURL(item.objectUrl);
      item.objectUrl = null;
    }
  }

  async function ensureBlob(item) {
    if (item.blob) return item.blob;
    if (item.src && typeof fetch === 'function') {
      try {
        const res = await fetch(item.src, { mode: 'cors' });
        const blob = await res.blob();
        item.blob = blob;
        return blob;
      } catch (err) {
        console.warn('Unable to fetch image for thumbnail', err);
        return null;
      }
    }
    return null;
  }

  async function ensureFullUrl(item) {
    if (item.objectUrl) return item.objectUrl;
    if (item.blob) {
      item.objectUrl = URL.createObjectURL(item.blob);
      return item.objectUrl;
    }
    return item.src || '';
  }

  async function createThumbnail(item) {
    if (item.thumbUrl) return item.thumbUrl;
    const blob = await ensureBlob(item);
    if (blob && typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(blob, {
          resizeWidth: 256,
          resizeHeight: 256,
          resizeQuality: 'high',
        });
        const maxDim = 128;
        const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale || 1));
        const height = Math.max(1, Math.round(bitmap.height * scale || 1));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx2d = canvas.getContext('2d');
        ctx2d.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        item.thumbUrl = canvas.toDataURL('image/png');
        return item.thumbUrl;
      } catch (err) {
        console.warn('Thumbnail generation failed', err);
      }
    }
    const url = await ensureFullUrl(item);
    item.thumbUrl = url;
    return url;
  }

  function openFullView(item) {
    ensureFullUrl(item).then((url) => {
      if (!url) return;
      const wrapper = document.createElement('div');
      wrapper.classList.add('gallery-viewer');
      const img = document.createElement('img');
      img.src = url;
      img.alt = item.name || 'Image';
      wrapper.append(img);
      ctx.windowManager.createWindow(
        `gallery-view-${Date.now()}`,
        item.name || item.path || 'Image',
        wrapper,
      );
    });
  }

  function createCard(item) {
    const card = document.createElement('button');
    card.type = 'button';
    card.classList.add('gallery-card');
    card.dataset.id = item.id;

    const thumb = document.createElement('div');
    thumb.classList.add('gallery-thumb');
    thumb.textContent = 'Loading…';

    const label = document.createElement('span');
    label.classList.add('gallery-label');
    label.textContent = item.name || item.path || 'Image';

    card.append(thumb, label);

    createThumbnail(item)
      .then((url) => {
        if (!card.isConnected || !url) return;
        thumb.style.backgroundImage = `url(${url})`;
        thumb.textContent = '';
      })
      .catch((err) => {
        console.warn('Failed to render thumbnail', err);
        if (card.isConnected) thumb.textContent = 'Preview unavailable';
      });

    card.addEventListener('click', () => openFullView(item));

    return card;
  }

  function render() {
    grid.innerHTML = '';
    if (items.length === 0) {
      const empty = document.createElement('p');
      empty.classList.add('gallery-empty');
      empty.textContent = 'No images yet. Use “Add Images” to import.';
      grid.append(empty);
      return;
    }
    items.forEach((item) => {
      grid.append(createCard(item));
    });
  }

  function addImages(sources) {
    const normalized = sources
      .map((src) => normalizeSource(src))
      .filter(Boolean);
    if (!normalized.length) return;
    items.push(...normalized);
    render();
  }

  const initialList = Array.isArray(initialImages) ? initialImages : [initialImages];
  addImages(initialList);

  addBtn.addEventListener('click', async () => {
    try {
      const selection = await dialogs.pickOpen({
        types: [
          {
            description: 'Images',
            accept: {
              'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.avif'],
            },
          },
        ],
        multiple: true,
      });
      const entries = Array.isArray(selection)
        ? selection
        : selection
        ? [selection]
        : [];
      addImages(entries.map((entry) => ({ file: entry.file, path: entry.handle?.name })));
    } catch (err) {
      console.error('Image picker failed', err);
    }
  });

  render();

  const cleanup = () => {
    items.forEach(releaseItem);
  };
  winEl.addEventListener('window-closed', cleanup, { once: true });
}
