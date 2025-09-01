
export const meta = { id: 'recorder', name: 'Recorder', icon: '/icons/recorder.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  const container = winEl;
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '4px';

  const startBtn = document.createElement('button');
  startBtn.textContent = 'Start Recording';
  const stopBtn = document.createElement('button');
  stopBtn.textContent = 'Stop Recording';
  stopBtn.disabled = true;
  const playBtn = document.createElement('button');
  playBtn.textContent = 'Play Recording';
  playBtn.disabled = true;
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download Recording';
  downloadBtn.disabled = true;

  container.append(startBtn, stopBtn, playBtn, downloadBtn);

  let mediaRecorder;
  let chunks = [];
  let blobUrl = null;

  startBtn.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();
      startBtn.disabled = true;
      stopBtn.disabled = false;
      chunks = [];
      mediaRecorder.addEventListener('dataavailable', e => { chunks.push(e.data); });
      mediaRecorder.addEventListener('stop', () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        blobUrl = URL.createObjectURL(blob);
        playBtn.disabled = false;
        downloadBtn.disabled = false;
      });
    } catch (err) {
      alert('Failed to access microphone: ' + err);
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
    if (blobUrl) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = blobUrl;
      addAudioElement(audio);
      audio.play();
      ctx.windowManager.createWindow('recording', 'Recording', audio);
    }
  });

  downloadBtn.addEventListener('click', () => {
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'recording.webm';
      a.click();
    }
  });
}
