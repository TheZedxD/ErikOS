// Window management utilities for ErikOS.
// Handles creation, focusing, minimising and closing of windows.

class WindowManager {
  constructor() {
    this.windows = new Map();
    this.nextId = 1;
    this.nextZ = 300; // z-index starts above desktop and taskbar
    this.desktop = document.getElementById('desktop');
    this.taskbar = document.getElementById('taskbar-windows');
  }

  open(app) {
    if (app && typeof app.launch === 'function') {
      try {
        return app.launch();
      } catch (e) {
        console.error(e);
      }
    }
  }

  createWindow(appId, title, contentEl) {
    const id = `${appId}-${this.nextId++}`;
    const win = document.createElement('div');
    win.classList.add('window');
    win.dataset.id = id;
    const offset = (this.nextId - 2) * 30;
    win.style.left = `${100 + offset}px`;
    win.style.top = `${100 + offset}px`;
    win.style.zIndex = this.nextZ++;

    const titleBar = document.createElement('div');
    titleBar.classList.add('title-bar');
    titleBar.innerHTML = `<div class="title-bar-text">${title}</div>` +
      '<div class="title-bar-controls">' +
      '<button aria-label="Minimize"></button>' +
      '<button aria-label="Maximize"></button>' +
      '<button aria-label="Close"></button>' +
      '</div>';
    win.appendChild(titleBar);
    win.appendChild(contentEl);

    const [minBtn,, closeBtn] = titleBar.querySelectorAll('button');
    minBtn.addEventListener('click', () => this.minimizeWindow(id));
    closeBtn.addEventListener('click', () => this.closeWindow(id));
    win.addEventListener('mousedown', () => this.focusWindow(id));

    this.desktop.appendChild(win);
    this.windows.set(id, win);
    this._createTaskbarButton(id, title);
    this.focusWindow(id);
    return id;
  }

  _createTaskbarButton(id, title) {
    const btn = document.createElement('button');
    btn.textContent = title;
    btn.dataset.id = id;
    btn.addEventListener('click', () => this.toggleWindow(id));
    this.taskbar.appendChild(btn);
  }

  focusWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;
    win.style.zIndex = this.nextZ++;
    this.windows.forEach((w, wid) => {
      const btn = this.taskbar.querySelector(`button[data-id="${wid}"]`);
      if (btn) btn.classList.toggle('active', wid === id);
    });
  }

  minimizeWindow(id) {
    const win = this.windows.get(id);
    if (win) win.style.display = 'none';
    const btn = this.taskbar.querySelector(`button[data-id="${id}"]`);
    if (btn) btn.classList.remove('active');
  }

  restoreWindow(id) {
    const win = this.windows.get(id);
    if (win) win.style.display = '';
    this.focusWindow(id);
  }

  closeWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;
    win.remove();
    this.windows.delete(id);
    const btn = this.taskbar.querySelector(`button[data-id="${id}"]`);
    if (btn) btn.remove();
  }

  toggleWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;
    if (win.style.display === 'none') {
      this.restoreWindow(id);
    } else {
      this.minimizeWindow(id);
    }
  }

  clear() {
    this.windows.forEach((win, id) => {
      win.remove();
      const btn = this.taskbar.querySelector(`button[data-id="${id}"]`);
      if (btn) btn.remove();
    });
    this.windows.clear();
  }
}

export const windowManager = new WindowManager();
