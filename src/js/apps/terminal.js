
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

  const commands = {
    help: () =>
      'Available commands:\n' +
      'help          Show this help message\n' +
      'clear         Clear the terminal\n' +
      'theme <name>  Change theme (default, matrix, highcontrast, red, pink, solarized, vaporwave)\n' +
      'about         Show information about this desktop\n' +
      'All other commands will be executed on the server (if allowed)',
    clear: () => {
      output.textContent = '';
      return '';
    },
    theme: (name) => {
      setTheme(name);
      return `Theme changed to ${name}`;
    },
    about: () =>
      'Win95‑Style Browser Desktop\nThis is a web‑based desktop environment inspired by Windows 95.\nImplemented using vanilla JavaScript and modern Web APIs.',
  };

  function print(text) {
    output.textContent += text + '\n';
    output.scrollTop = output.scrollHeight;
  }

  print('Win95‑Terminal. Type "help" for available commands.');

  input.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const line = input.value.trim();
    input.value = '';
    if (!line) return;
    print('> ' + line);
    const [cmd, ...args] = line.split(' ');
    const command = commands[cmd];
    if (command) {
      const result = command(...args);
      if (typeof result === 'string') print(result);
    } else {
      try {
        const resp = await api.postJSON('/api/execute-command', { command: line });
        if (!resp.ok || resp.data.error) {
          print('Error: ' + (resp.data && resp.data.error ? resp.data.error : resp.error));
        } else {
          print(resp.data.output || '');
        }
      } catch (err) {
        print('Failed to execute command');
      }
    }
  });
}
