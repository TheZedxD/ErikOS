
export const meta = { id: 'recorder', name: 'Recorder', icon: '/icons/recorder.png' };

export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id)?.element;
  if (!win) return;
  mount(win, ctx);
}

export function mount(winEl, ctx) {
  const container = winEl.querySelector('.content');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '6px';

  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.gap = '6px';

  const startBtn = document.createElement('button');
  startBtn.textContent = 'Start Recording';
  const stopBtn = document.createElement('button');
  stopBtn.textContent = 'Stop Recording';
  stopBtn.disabled = true;
  const playBtn = document.createElement('button');
  playBtn.textContent = 'Play';
  playBtn.disabled = true;
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.disabled = true;

  controls.append(startBtn, stopBtn, playBtn, saveBtn);

  const status = document.createElement('div');
  status.textContent = 'Ready to record.';
  status.style.fontSize = '12px';
  status.style.opacity = '0.8';

  const preview = document.createElement('div');
  preview.style.display = 'flex';
  preview.style.alignItems = 'center';
  preview.style.justifyContent = 'center';
  preview.style.minHeight = '80px';
  preview.style.border = '1px solid var(--window-border-dark)';
  preview.style.padding = '6px';

  container.append(controls, status, preview);

  let mediaRecorder = null;
  let stream = null;
  let chunks = [];
  let blobUrl = null;
  let audioEl = null;
  let cleanupAudio = null;

  function resetPreview() {
    if (cleanupAudio) {
      cleanupAudio();
      cleanupAudio = null;
    }
    if (audioEl) {
      try {
        audioEl.pause();
      } catch (err) {
        /* ignore */
      }
      audioEl.remove();
      audioEl = null;
    }
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      blobUrl = null;
    }
  }

  function updateStatus(text) {
    status.textContent = text;
  }

  function stopStream() {
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  startBtn.addEventListener('click', async () => {
    try {
      updateStatus('Requesting microphone…');
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('Microphone access denied', err);
      updateStatus('Microphone access denied. Please allow permission and try again.');
      return;
    }

    try {
      mediaRecorder = new MediaRecorder(stream);
    } catch (err) {
      console.error('MediaRecorder init failed', err);
      updateStatus('Recording is not supported in this browser.');
      stopStream();
      return;
    }

    chunks = [];
    mediaRecorder.addEventListener('dataavailable', (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    });
    mediaRecorder.addEventListener('stop', () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      resetPreview();
      blobUrl = URL.createObjectURL(blob);
      audioEl = document.createElement('audio');
      audioEl.controls = true;
      audioEl.src = blobUrl;
      cleanupAudio = ctx.globals.addAudioElement?.(audioEl) || null;
      preview.innerHTML = '';
      preview.append(audioEl);
      playBtn.disabled = false;
      saveBtn.disabled = false;
      updateStatus('Recording ready to play or save.');
      stopStream();
    });

    try {
      mediaRecorder.start();
      updateStatus('Recording…');
      startBtn.disabled = true;
      stopBtn.disabled = false;
      playBtn.disabled = true;
      saveBtn.disabled = true;
    } catch (err) {
      console.error('Recording failed to start', err);
      updateStatus('Unable to start recording.');
      stopStream();
    }
  });

  stopBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }
  });

  playBtn.addEventListener('click', () => {
    if (!audioEl) return;
    audioEl.play().catch((err) => {
      console.warn('Playback failed', err);
    });
  });

  saveBtn.addEventListener('click', () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `recording-${timestamp}.webm`;
    a.click();
  });

  const cleanup = () => {
    resetPreview();
    stopStream();
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  };
  winEl.addEventListener('window-closed', cleanup, { once: true });
}
