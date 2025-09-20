import { addLog } from '../core/globals.js';
import { openAppWindow } from '../utils/appWindow.js';

export function openPaint() {
  addLog('Paint opened');
  openAppWindow('paint', 'Paint', (content, ctx) => {
    content.innerHTML = '';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.height = '100%';
    content.style.gap = '4px';

    const toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.flexWrap = 'wrap';
    toolbar.style.gap = '4px';

    const brushBtn = document.createElement('button');
    brushBtn.textContent = 'Brush';
    const eraserBtn = document.createElement('button');
    eraserBtn.textContent = 'Eraser';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = '#000000';
    const sizeInput = document.createElement('input');
    sizeInput.type = 'range';
    sizeInput.min = '1';
    sizeInput.max = '40';
    sizeInput.value = '4';
    const insertBtn = document.createElement('button');
    insertBtn.textContent = 'Insert Image';
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';

    toolbar.append(brushBtn, eraserBtn, colorInput, sizeInput, insertBtn, clearBtn, saveBtn);

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 400;
    canvas.style.border = '1px solid var(--window-border-dark)';
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'none';

    content.append(toolbar, canvas);

    const ctx2d = canvas.getContext('2d');
    ctx2d.lineCap = 'round';
    let drawing = false;
    let mode = 'brush';
    let lastX = 0;
    let lastY = 0;

    function updateButtons() {
      brushBtn.disabled = mode === 'brush';
      eraserBtn.disabled = mode === 'erase';
    }
    updateButtons();

    function resizeCanvas() {
      const rect = content.getBoundingClientRect();
      const desiredWidth = Math.max(200, rect.width - 4);
      const desiredHeight = Math.max(200, rect.height - toolbar.offsetHeight - 8);
      let snapshot = null;
      try {
        snapshot = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
      } catch (err) {
        snapshot = null;
      }
      canvas.width = desiredWidth;
      canvas.height = desiredHeight;
      if (snapshot) {
        try {
          ctx2d.putImageData(snapshot, 0, 0);
        } catch (err) {
          // ignore restoration issues
        }
      }
    }

    const pointerMove = (event) => {
      if (!drawing) return;
      const { offsetX, offsetY } = event;
      ctx2d.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
      ctx2d.strokeStyle = colorInput.value;
      ctx2d.lineWidth = Number(sizeInput.value) || 1;
      ctx2d.beginPath();
      ctx2d.moveTo(lastX, lastY);
      ctx2d.lineTo(offsetX, offsetY);
      ctx2d.stroke();
      lastX = offsetX;
      lastY = offsetY;
    };

    canvas.addEventListener('pointerdown', (event) => {
      drawing = true;
      lastX = event.offsetX;
      lastY = event.offsetY;
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener('pointermove', pointerMove);
    const stopDrawing = (event) => {
      if (event && event.pointerId) canvas.releasePointerCapture(event.pointerId);
      drawing = false;
      ctx2d.globalCompositeOperation = 'source-over';
    };
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointerleave', stopDrawing);

    brushBtn.addEventListener('click', () => {
      mode = 'brush';
      updateButtons();
    });
    eraserBtn.addEventListener('click', () => {
      mode = 'erase';
      updateButtons();
    });

    clearBtn.addEventListener('click', () => {
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    });

    insertBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.append(input);
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              ctx2d.drawImage(img, 0, 0, img.width, img.height);
            };
            img.src = ev.target?.result;
          };
          reader.readAsDataURL(file);
        }
        input.remove();
      });
      input.click();
    });

    saveBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'painting.png';
      link.click();
    });

    const handleResize = () => {
      try {
        resizeCanvas();
      } catch (err) {
        console.error(err);
      }
    };

    window.addEventListener('resize', handleResize);
    ctx.onClose(() => {
      window.removeEventListener('resize', handleResize);
    });

    setTimeout(handleResize, 0);
  });
}
