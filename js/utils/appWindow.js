import { windowManager } from '../core/windowManager.js';

function resolveMessage(title, options) {
  if (typeof options === 'string') return options;
  if (options && typeof options.message === 'string') return options.message;
  return `${title} app coming soon`;
}

export function openAppWindow(id, title, options) {
  const content = document.createElement('div');
  content.classList.add('window-content');
  const windowId = windowManager.createWindow(id, title, content);
  const winEl = windowManager.windows.get(windowId);
  const contentWrapper = winEl?.querySelector('.content');
  if (contentWrapper && !contentWrapper.contains(content)) {
    contentWrapper.appendChild(content);
  }

  const closeCallbacks = new Set();
  if (winEl) {
    const handler = () => {
      closeCallbacks.forEach((fn) => {
        try {
          fn();
        } catch (err) {
          console.error(err);
        }
      });
      closeCallbacks.clear();
      winEl.removeEventListener('erikos:close', handler);
    };
    winEl.addEventListener('erikos:close', handler);
  }

  const context = {
    id: windowId,
    window: winEl,
    content,
    onClose(fn) {
      if (typeof fn === 'function') closeCallbacks.add(fn);
      return () => closeCallbacks.delete(fn);
    },
  };

  if (typeof options === 'function') {
    options(content, context);
  } else if (options && typeof options.render === 'function') {
    options.render(content, context);
  } else {
    const message = resolveMessage(title, options);
    content.textContent = message;
  }

  return context;
}
