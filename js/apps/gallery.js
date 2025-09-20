import { addLog } from '../core/globals.js';
import { openAppWindow } from '../utils/appWindow.js';

export function openGallery() {
  addLog('Gallery opened');
  openAppWindow('gallery', 'Gallery', (content, ctx) => {
    content.innerHTML = '';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.height = '100%';
    content.style.gap = '6px';

    const toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.gap = '4px';
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Images';
    toolbar.append(addBtn);

    const grid = document.createElement('div');
    grid.style.flex = '1';
    grid.style.display = 'flex';
    grid.style.flexWrap = 'wrap';
    grid.style.gap = '8px';
    grid.style.alignContent = 'flex-start';
    grid.style.overflowY = 'auto';

    content.append(toolbar, grid);

    const objectUrls = new Set();

    function openViewer(src) {
      openAppWindow('image-viewer', 'Image Viewer', (viewerContent) => {
        viewerContent.style.display = 'flex';
        viewerContent.style.alignItems = 'center';
        viewerContent.style.justifyContent = 'center';
        viewerContent.style.height = '100%';
        const img = document.createElement('img');
        img.src = src;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        viewerContent.append(img);
      });
    }

    function addThumbnail(src, track = false) {
      if (track) objectUrls.add(src);
      const thumb = document.createElement('img');
      thumb.src = src;
      thumb.style.width = '80px';
      thumb.style.height = '80px';
      thumb.style.objectFit = 'cover';
      thumb.style.cursor = 'pointer';
      thumb.addEventListener('click', () => openViewer(src));
      grid.append(thumb);
    }

    async function handleFiles(fileList) {
      for (const file of fileList) {
        const url = URL.createObjectURL(file);
        addThumbnail(url, true);
      }
    }

    addBtn.addEventListener('click', async () => {
      if (window.showOpenFilePicker) {
        try {
          const handles = await window.showOpenFilePicker({
            multiple: true,
            types: [
              {
                description: 'Images',
                accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'] },
              },
            ],
          });
          for (const handle of handles) {
            const file = await handle.getFile();
            const url = URL.createObjectURL(file);
            addThumbnail(url, true);
          }
        } catch (err) {
          console.error('Failed to pick images', err);
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.style.display = 'none';
        document.body.append(input);
        input.addEventListener('change', () => {
          if (input.files) {
            handleFiles(input.files);
          }
          input.remove();
        });
        input.click();
      }
    });

    ctx.onClose(() => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    });
  });
}
