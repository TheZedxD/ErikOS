export const meta = { id: 'snip', name: 'Snip', icon: '/icons/gallery.png' };

export function launch(ctx) {
  mount(null, ctx);
}

export function mount(winEl, ctx) {
  addLog('Snip tool activated');
  const overlay = document.getElementById('snip-overlay');
  if (!overlay || overlay.style.display === 'block') return;
  overlay.style.display = 'block';
  overlay.innerHTML = '';
  const sel = document.createElement('div');
  sel.className = 'snip-selection';
  overlay.append(sel);
  let startX = 0;
  let startY = 0;
  let stream = null;

  const escHandler = e => {
    if (e.key === 'Escape') cleanup();
  };
  document.addEventListener('keydown', escHandler);

  const pointerMove = e => {
    const x = e.clientX;
    const y = e.clientY;
    const left = Math.min(x, startX);
    const top = Math.min(y, startY);
    const width = Math.abs(x - startX);
    const height = Math.abs(y - startY);
    sel.style.left = left + 'px';
    sel.style.top = top + 'px';
    sel.style.width = width + 'px';
    sel.style.height = height + 'px';
    sel.textContent = `${width}×${height}`;
  };

  const finish = async e => {
    overlay.removeEventListener('pointermove', pointerMove);
    overlay.removeEventListener('pointerup', finish);
    const x = e.clientX;
    const y = e.clientY;
    const sx = Math.min(x, startX);
    const sy = Math.min(y, startY);
    const sw = Math.abs(x - startX);
    const sh = Math.abs(y - startY);
    overlay.style.display = 'none';
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'monitor' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const scaleX = video.videoWidth / window.innerWidth;
      const scaleY = video.videoHeight / window.innerHeight;
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx2 = canvas.getContext('2d');
      ctx2.drawImage(video, sx * scaleX, sy * scaleY, sw * scaleX, sh * scaleY, 0, 0, sw, sh);
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('Copied to clipboard');
      } catch {
        const path = `users/${currentUser?.id || 'guest'}/Screenshots`;
        const fd = new FormData();
        fd.append('path', path);
        fd.append('file', blob, `snip-${Date.now()}.png`);
        const res = await apiJSON('/api/upload', { method: 'POST', body: fd });
        if (res.ok) {
          showToast('Saved to Screenshots/');
        } else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `screenshot-${Date.now()}.png`;
          a.click();
          showToast('Saved screenshot');
        }
      }
    } catch (err) {
      console.error('Snip failed', err);
    } finally {
      cleanup();
    }
  };

  overlay.addEventListener('pointerdown', e => {
    startX = e.clientX;
    startY = e.clientY;
    sel.style.left = startX + 'px';
    sel.style.top = startY + 'px';
    sel.style.width = '0';
    sel.style.height = '0';
    overlay.addEventListener('pointermove', pointerMove);
    overlay.addEventListener('pointerup', finish);
  });

  function cleanup() {
    document.removeEventListener('keydown', escHandler);
    overlay.style.display = 'none';
    overlay.innerHTML = '';
    overlay.removeEventListener('pointermove', pointerMove);
    overlay.removeEventListener('pointerup', finish);
    if (stream) stream.getTracks().forEach(t => t.stop());
  }
}
