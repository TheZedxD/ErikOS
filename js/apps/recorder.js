import { addLog } from '../core/globals.js';
import { openAppWindow } from '../utils/appWindow.js';
import { addAudioElement } from '../utils/audio.js';

export function openRecorder() {
  addLog('Sound Recorder opened');
  openAppWindow('recorder', 'Recorder', (content, ctx) => {
    content.innerHTML = '';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '6px';

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

    const playbackHolder = document.createElement('div');

    content.append(startBtn, stopBtn, playBtn, downloadBtn, playbackHolder);

    let mediaRecorder = null;
    let mediaStream = null;
    let chunks = [];
    let blobUrl = null;
    let audioEl = null;
    let removeFn = null;

    function resetPlayback() {
      if (audioEl) {
        audioEl.pause();
        audioEl.src = '';
        if (removeFn) removeFn();
      }
      playbackHolder.innerHTML = '';
      audioEl = null;
      removeFn = null;
    }

    async function startRecording() {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(mediaStream);
        chunks = [];
        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data && event.data.size) chunks.push(event.data);
        });
        mediaRecorder.addEventListener('stop', () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          blobUrl = URL.createObjectURL(blob);
          playBtn.disabled = false;
          downloadBtn.disabled = false;
        });
        mediaRecorder.start();
        startBtn.disabled = true;
        stopBtn.disabled = false;
      } catch (err) {
        alert('Failed to access microphone: ' + err.message);
      }
    }

    function stopRecording() {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
      }
      stopBtn.disabled = true;
      startBtn.disabled = false;
    }

    function playRecording() {
      if (!blobUrl) return;
      resetPlayback();
      audioEl = document.createElement('audio');
      audioEl.controls = true;
      audioEl.src = blobUrl;
      playbackHolder.append(audioEl);
      removeFn = addAudioElement(audioEl);
      audioEl.play();
    }

    function downloadRecording() {
      if (!blobUrl) return;
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'recording.webm';
      link.click();
    }

    startBtn.addEventListener('click', startRecording);
    stopBtn.addEventListener('click', stopRecording);
    playBtn.addEventListener('click', playRecording);
    downloadBtn.addEventListener('click', downloadRecording);

    ctx.onClose(() => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      resetPlayback();
    });
  });
}
