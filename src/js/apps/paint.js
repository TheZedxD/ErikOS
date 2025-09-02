
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

  const toolbar = document.createElement('div');
  toolbar.style.display = 'flex';
  toolbar.style.gap = '4px';

  const brushBtn = document.createElement('button');
  brushBtn.textContent = 'Brush';
  brushBtn.title = 'Brush tool';
  const eraserBtn = document.createElement('button');
  eraserBtn.textContent = 'Eraser';
  eraserBtn.title = 'Eraser tool';
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = '#000000';
  const sizeInput = document.createElement('input');
  sizeInput.type = 'range';
  sizeInput.min = '1';
  sizeInput.max = '30';
  sizeInput.value = '4';
  sizeInput.title = 'Brush size';
  const insertImgBtn = document.createElement('button');
  insertImgBtn.textContent = 'Insert Image';
  insertImgBtn.title = 'Insert an image onto the canvas';
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  toolbar.append(
    brushBtn,
    eraserBtn,
    colorInput,
    sizeInput,
    insertImgBtn,
    clearBtn,
    saveBtn
  );

  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  canvas.style.border = '1px solid var(--window-border-dark)';
  canvas.style.cursor = 'crosshair';
  container.append(toolbar, canvas);

  const ctx2d = canvas.getContext('2d');

  function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height - toolbar.offsetHeight;
  }
  resizeCanvas();
  outer?.addEventListener('resized', () => setTimeout(resizeCanvas, 0));

  ctx2d.lineCap = 'round';
  let mode = 'brush';
  function updateToolButtons() {
    brushBtn.style.fontWeight = mode === 'brush' ? 'bold' : 'normal';
    eraserBtn.style.fontWeight = mode === 'erase' ? 'bold' : 'normal';
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
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  });

  saveBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'painting.png';
    link.click();
  });
}
