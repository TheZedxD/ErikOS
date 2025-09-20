
export const meta = { id: 'paint', name: 'Paint', icon: '/icons/paint.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  ctx.globals.addLog?.('Paint opened');
  const container = winEl.classList.contains('window')
    ? winEl.querySelector('.content')
    : winEl;
  const outer = winEl.classList.contains('window') ? winEl : winEl.closest('.window');
  if (!container) return;
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '100%';
  container.style.gap = '6px';

  const toolbar = document.createElement('div');
  toolbar.style.display = 'flex';
  toolbar.style.gap = '4px';
  toolbar.style.alignItems = 'center';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Paint tools');

  const brushBtn = document.createElement('button');
  brushBtn.textContent = 'Brush';
  brushBtn.title = 'Brush tool';
  brushBtn.setAttribute('aria-label', 'Brush tool');
  brushBtn.type = 'button';
  const eraserBtn = document.createElement('button');
  eraserBtn.textContent = 'Eraser';
  eraserBtn.title = 'Eraser tool';
  eraserBtn.setAttribute('aria-label', 'Eraser tool');
  eraserBtn.type = 'button';
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = '#000000';
  colorInput.setAttribute('aria-label', 'Stroke colour');
  const sizeInput = document.createElement('input');
  sizeInput.type = 'range';
  sizeInput.min = '1';
  sizeInput.max = '30';
  sizeInput.value = '4';
  sizeInput.title = 'Brush size';
  sizeInput.setAttribute('aria-label', 'Brush size');
  const insertImgBtn = document.createElement('button');
  insertImgBtn.textContent = 'Insert Image';
  insertImgBtn.title = 'Insert an image onto the canvas';
  insertImgBtn.setAttribute('aria-label', 'Insert image');
  insertImgBtn.type = 'button';
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.setAttribute('aria-label', 'Clear canvas');
  clearBtn.type = 'button';
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.setAttribute('aria-label', 'Save image');
  saveBtn.type = 'button';
  const sizeLabel = document.createElement('label');
  sizeLabel.textContent = 'Size';
  sizeLabel.style.display = 'flex';
  sizeLabel.style.alignItems = 'center';
  sizeLabel.style.gap = '4px';
  sizeLabel.append(sizeInput);
  toolbar.append(
    brushBtn,
    eraserBtn,
    colorInput,
    sizeLabel,
    insertImgBtn,
    clearBtn,
    saveBtn
  );

  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  canvas.style.border = '1px solid var(--window-border-dark)';
  canvas.style.cursor = 'crosshair';
  canvas.setAttribute('aria-label', 'Drawing canvas');
  container.append(toolbar, canvas);

  const ctx2d = canvas.getContext('2d');
  ctx2d.fillStyle = '#ffffff';
  ctx2d.fillRect(0, 0, canvas.width, canvas.height);

  function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    const newWidth = Math.max(320, Math.floor(rect.width));
    const newHeight = Math.max(200, Math.floor(rect.height - toolbar.offsetHeight));
    if (newWidth === canvas.width && newHeight === canvas.height) return;
    const snapshot = document.createElement('canvas');
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    const snapCtx = snapshot.getContext('2d');
    snapCtx.drawImage(canvas, 0, 0);
    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx2d.drawImage(snapshot, 0, 0, snapshot.width, snapshot.height, 0, 0, canvas.width, canvas.height);
  }
  resizeCanvas();
  outer?.addEventListener('resized', () => setTimeout(resizeCanvas, 0));

  ctx2d.lineCap = 'round';
  let mode = 'brush';
  function updateToolButtons() {
    const isBrush = mode === 'brush';
    brushBtn.setAttribute('aria-pressed', String(isBrush));
    eraserBtn.setAttribute('aria-pressed', String(!isBrush));
    brushBtn.classList.toggle('active', isBrush);
    eraserBtn.classList.toggle('active', !isBrush);
  }
  updateToolButtons();

  brushBtn.addEventListener('click', () => {
    mode = 'brush';
    updateToolButtons();
  });
  eraserBtn.addEventListener('click', () => {
    mode = 'erase';
    updateToolButtons();
  });

  insertImgBtn.addEventListener('click', () => {
    const inputFile = document.createElement('input');
    inputFile.type = 'file';
    inputFile.accept = 'image/*';
    inputFile.style.display = 'none';
    document.body.append(inputFile);
    inputFile.addEventListener('change', () => {
      const file = inputFile.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          ctx2d.drawImage(img, 0, 0, img.width, img.height);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      inputFile.remove();
    });
    inputFile.click();
  });

  let drawing = false;
  let lastX = 0;
  let lastY = 0;
  function draw(x, y) {
    if (!drawing) return;
    ctx2d.globalCompositeOperation =
      mode === 'erase' ? 'destination-out' : 'source-over';
    ctx2d.strokeStyle = colorInput.value;
    ctx2d.lineWidth = parseInt(sizeInput.value, 10);
    ctx2d.beginPath();
    ctx2d.moveTo(lastX, lastY);
    ctx2d.lineTo(x, y);
    ctx2d.stroke();
    lastX = x;
    lastY = y;
  }

  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    lastX = e.offsetX;
    lastY = e.offsetY;
  });
  canvas.addEventListener('pointermove', (e) => {
    draw(e.offsetX, e.offsetY);
  });
  const stopDrawing = () => {
    drawing = false;
    ctx2d.globalCompositeOperation = 'source-over';
  };
  canvas.addEventListener('pointerup', stopDrawing);
  canvas.addEventListener('pointerleave', stopDrawing);

  clearBtn.addEventListener('click', () => {
    ctx2d.save();
    ctx2d.setTransform(1, 0, 0, 1, 0, 0);
    ctx2d.fillStyle = '#ffffff';
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    ctx2d.restore();
  });

  saveBtn.addEventListener('click', () => {
    const filename = `painting-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    if (canvas.toBlob) {
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = filename;
          document.body.append(link);
          link.click();
          requestAnimationFrame(() => {
            URL.revokeObjectURL(link.href);
            link.remove();
          });
        },
        'image/png',
      );
    } else {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = filename;
      link.click();
    }
  });
}
