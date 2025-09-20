
import { APIClient } from '../utils/api.js';

export const meta = { id: 'terminal', name: 'Terminal', icon: '/icons/terminal.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  const container = winEl.classList.contains('window')
    ? winEl.querySelector('.content')
    : winEl;
  if (!container) return;

  container.innerHTML = '';
  container.classList.add('terminal-container');

  const api = new APIClient(ctx);

  const output = document.createElement('div');
  output.classList.add('terminal-output');

  const input = document.createElement('input');
  input.classList.add('terminal-input');
  input.type = 'text';
  input.placeholder = 'Type a command...';

  container.append(output, input);

  function focusInput() {
    input.focus();
  }
  focusInput();
  container.addEventListener('mousedown', focusInput);

  function appendLine(text = '', className) {
    const lines = String(text).split('\n');
    for (const line of lines) {
      const el = document.createElement('div');
      el.textContent = line;
      if (className) el.classList.add(className);
      output.appendChild(el);
    }
    output.scrollTop = output.scrollHeight;
  }

  const helpText =
    'Available commands:\n' +
    'help          Show this help message\n' +
    'clear         Clear the terminal\n' +
    'theme <name>  Change theme (default, matrix, highcontrast, red, pink, solarized, vaporwave)\n' +
    'about         Show information about this desktop\n' +
    'All other commands will be executed on the server (if allowed)';

  const commands = {
    help: () => helpText,
    clear: () => {
      output.innerHTML = '';
      return '';
    },
    theme: (name) => {
      if (!name) return 'Usage: theme <name>';
      ctx.globals.setTheme?.(name);
      return `Theme changed to ${name}`;
    },
    about: () =>
      'Win95‑Style Browser Desktop\nThis is a web‑based desktop environment inspired by Windows 95.\nImplemented using vanilla JavaScript and modern Web APIs.',
  };

  appendLine('Win95‑Terminal. Type "help" for available commands.');

  async function executeRemoteCommand(line) {
    try {
      const resp = await api.postJSON('/api/execute-command', { command: line });
      if (!resp.ok) {
        appendLine(`Error: ${resp.error || 'Failed to start command'}`, 'terminal-error');
        return;
      }
      const jobId = resp.data?.job_id;
      if (!jobId) {
        const error = resp.data?.error || 'No job id returned';
        appendLine(`Error: ${error}`, 'terminal-error');
        return;
      }
      appendLine('Running...', 'terminal-info');
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const status = await api.getJSON(`/api/command-status/${jobId}`);
        if (!status.ok) {
          appendLine(`Error: ${status.error || 'Failed to fetch command status'}`, 'terminal-error');
          return;
        }
        const data = status.data;
        if (data?.status === 'finished') {
          const text = data.output || '';
          if (text) appendLine(text);
          if (data.returncode && data.returncode !== 0) {
            appendLine(`Process exited with code ${data.returncode}`, 'terminal-error');
          }
          return;
        }
      }
    } catch (err) {
      appendLine('Failed to execute command', 'terminal-error');
    }
  }

  input.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const line = input.value.trim();
    input.value = '';
    if (!line) return;

    appendLine('> ' + line, 'terminal-command');

    const [cmd, ...args] = line.split(/\s+/);
    const handler = commands[cmd];
    if (handler) {
      const result = handler(...args);
      if (typeof result === 'string' && result) appendLine(result);
      return;
    }

    await executeRemoteCommand(line);
  });
}
