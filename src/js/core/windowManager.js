export class WindowManager {
  constructor() {
    this.windows = new Map();
    this.activeId = null;
    this.nextId = 1;
    this.nextZ = 100;
    this.root = document.getElementById("windows-root");
    this.taskbar = document.getElementById("taskbar-windows");
  }

  createWindow(appId, title, contentEl) {
    const id = `${appId}-${this.nextId++}`;
    const win = document.createElement("div");
    win.className = "window";
    win.dataset.id = id;
    const offset = (this.nextId - 2) * 30;
    win.style.left = `${100 + offset}px`;
    win.style.top = `${100 + offset}px`;
    win.style.zIndex = String(this.nextZ++);

    const header = document.createElement("div");
    header.className = "window-header";
    header.innerHTML =
      `<span class="title">${title}</span>` +
      '<div class="window-controls">' +
      '<button data-act="min" aria-label="Minimize">_</button>' +
      '<button data-act="max" aria-label="Maximize">▢</button>' +
      '<button data-act="close" aria-label="Close">×</button>' +
      '</div>';
    const body = document.createElement("div");
    body.className = "window-body";
    body.appendChild(contentEl);
    const resizer = document.createElement("div");
    resizer.className = "window-resizer";

    win.append(header, body, resizer);
    this.root?.appendChild(win);

    const info = {
      id,
      element: win,
      body,
      header,
      resizer,
      taskBtn: null,
      minimized: false,
      maximized: false,
      prevRect: null,
    };
    this.windows.set(id, info);

    this._makeDraggable(info);
    this._makeResizable(info);

    header.addEventListener("mousedown", () => this.focusWindow(id));
    win.addEventListener("mousedown", () => this.focusWindow(id));
    header
      .querySelector('[data-act="min"]')
      ?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.minimizeWindow(id);
      });
    header
      .querySelector('[data-act="max"]')
      ?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleMaximize(id);
      });
    header
      .querySelector('[data-act="close"]')
      ?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeWindow(id);
      });

    info.taskBtn = this._createTaskbarButton(id, title);

    this.focusWindow(id);
    return id;
  }

  _createTaskbarButton(id, title) {
    const btn = document.createElement("button");
    btn.className = "task-btn";
    btn.textContent = title;
    btn.dataset.win = id;
    btn.addEventListener("click", () => this.toggleWindow(id));
    this.taskbar?.appendChild(btn);
    return btn;
  }

  focusWindow(id) {
    const info = this.windows.get(id);
    if (!info) return;
    if (info.minimized) this.restoreWindow(id);

    if (this.activeId && this.activeId !== id) {
      window.dispatchEvent(
        new CustomEvent("window-blurred", { detail: { id: this.activeId } }),
      );
      const prev = this.windows.get(this.activeId);
      prev?.element.classList.remove("active");
      prev?.taskBtn?.classList.remove("active");
    }

    this.activeId = id;
    info.element.style.zIndex = String(this.nextZ++);
    info.element.style.display = "";
    info.element.classList.add("active");
    info.taskBtn?.classList.add("active");
    window.dispatchEvent(new CustomEvent("window-focused", { detail: { id } }));
  }

  minimizeWindow(id) {
    const info = this.windows.get(id);
    if (!info || info.minimized) return;
    const wasActive = this.activeId === id;
    info.minimized = true;
    info.element.style.display = "none";
    info.taskBtn?.classList.remove("active");
    if (wasActive) {
      this.activeId = null;
      window.dispatchEvent(
        new CustomEvent("window-blurred", { detail: { id } }),
      );
    }
  }

  restoreWindow(id) {
    const info = this.windows.get(id);
    if (!info || !info.minimized) return;
    info.minimized = false;
    info.element.style.display = "";
    this.focusWindow(id);
  }

  toggleWindow(id) {
    const info = this.windows.get(id);
    if (!info) return;
    if (info.minimized) this.restoreWindow(id);
    else if (this.activeId === id) this.minimizeWindow(id);
    else this.focusWindow(id);
  }

  toggleMaximize(id) {
    const info = this.windows.get(id);
    if (!info) return;
    if (!info.maximized) {
      info.prevRect = {
        left: info.element.style.left,
        top: info.element.style.top,
        width: info.element.style.width,
        height: info.element.style.height,
      };
      info.element.style.left = "0px";
      info.element.style.top = "0px";
      info.element.style.width = "100%";
      info.element.style.height = "100%";
      info.element.classList.add("maximized");
      info.maximized = true;
    } else {
      const rect = info.prevRect || {};
      info.element.style.left = rect.left || "";
      info.element.style.top = rect.top || "";
      info.element.style.width = rect.width || "";
      info.element.style.height = rect.height || "";
      info.element.classList.remove("maximized");
      info.maximized = false;
    }
    this.focusWindow(id);
  }

  closeWindow(id) {
    const info = this.windows.get(id);
    if (!info) return;
    const wasActive = this.activeId === id;
    info.element.remove();
    info.taskBtn?.remove();
    this.windows.delete(id);
    if (wasActive) {
      this.activeId = null;
      window.dispatchEvent(
        new CustomEvent("window-blurred", { detail: { id } }),
      );
    }
  }

  _makeDraggable(info) {
    const win = info.element;
    const header = info.header;
    header.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const rect = win.getBoundingClientRect();
      const offX = startX - rect.left;
      const offY = startY - rect.top;
      const move = (ev) => {
        if (info.maximized) return;
        win.style.left = `${ev.clientX - offX}px`;
        win.style.top = `${ev.clientY - offY}px`;
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });
  }

  _makeResizable(info) {
    const win = info.element;
    const res = info.resizer;
    res.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = win.offsetWidth;
      const startH = win.offsetHeight;
      const move = (ev) => {
        win.style.width = `${startW + (ev.clientX - startX)}px`;
        win.style.height = `${startH + (ev.clientY - startY)}px`;
        win.dispatchEvent(new Event("resized"));
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });
  }
}

