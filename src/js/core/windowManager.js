export class WindowManager {
  constructor() {
    this.windows = new Map();
    this.activeId = null;
    this.nextId = 1;
    this.nextZ = 100;
    this.root = document.getElementById("windows-root");
    this.taskbar = document.getElementById("taskbar-windows");
    // Alt+Tab window switching
    window.addEventListener("keydown", (e) => this._handleKey(e));
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
    const contentWrapper = document.createElement("div");
    contentWrapper.className = "content";
    body.appendChild(contentWrapper);
    contentWrapper.appendChild(contentEl);

    win.append(header, body);

    // create resize handles for all sides/corners
    const resizers = {};
    ["n", "e", "s", "w", "ne", "nw", "se", "sw"].forEach((dir) => {
      const r = document.createElement("div");
      r.className = `window-resizer ${dir}`;
      r.dataset.dir = dir;
      resizers[dir] = r;
      win.appendChild(r);
    });
    this.root?.appendChild(win);

    const info = {
      id,
      appId,
      element: win,
      body: contentWrapper,
      header,
      resizers,
      taskBtn: null,
      minimized: false,
      maximized: false,
      prevRect: null,
    };
    this.windows.set(id, info);

    // restore previous bounds if stored
    const saved = this._loadBounds(appId);
    if (saved) {
      Object.assign(win.style, {
        left: `${saved.left}px`,
        top: `${saved.top}px`,
        width: `${saved.width}px`,
        height: `${saved.height}px`,
      });
      this._ensureInViewport(info);
    }

    this._makeDraggable(info);
    this._makeResizable(info);

    header.addEventListener("mousedown", () => this.focusWindow(id));
    win.addEventListener("mousedown", () => this.focusWindow(id));
    header.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      this.toggleMaximize(id);
    });
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
    // Add size constraints
    btn.style.maxWidth = '180px';
    btn.style.height = '24px';
    btn.style.flexShrink = '0';
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
      this._ensureInViewport(info);
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

  _saveBounds(info) {
    const rect = info.element.getBoundingClientRect();
    const data = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
    try {
      localStorage.setItem(`win-pos-${info.appId}`, JSON.stringify(data));
    } catch (_) {
      /* ignore */
    }
  }

  _loadBounds(appId) {
    try {
      const raw = localStorage.getItem(`win-pos-${appId}`);
      if (raw) return JSON.parse(raw);
    } catch (_) {
      /* ignore */
    }
    return null;
  }

  _handleKey(e) {
    if (e.altKey && e.key === "Tab") {
      e.preventDefault();
      const wins = Array.from(this.windows.values()).filter((w) => !w.minimized);
      if (wins.length === 0) return;
      wins.sort((a, b) => Number(a.element.style.zIndex) - Number(b.element.style.zIndex));
      let idx = wins.findIndex((w) => w.id === this.activeId);
      idx = (idx + 1) % wins.length;
      this.focusWindow(wins[idx].id);
    }
    if (e.altKey && e.key === "F4") {
      e.preventDefault();
      if (this.activeId) this.closeWindow(this.activeId);
    }
  }

  _ensureInViewport(info) {
    const win = info.element;
    const rect = win.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left + rect.width > vw) left = vw - rect.width;
    if (top + rect.height > vh) top = vh - rect.height;
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    win.style.left = `${left}px`;
    win.style.top = `${top}px`;
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
        let newLeft = ev.clientX - offX;
        let newTop = ev.clientY - offY;
        const width = win.offsetWidth;
        const height = win.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // clamp to viewport
        newLeft = Math.min(Math.max(0, newLeft), vw - width);
        newTop = Math.min(Math.max(0, newTop), vh - height);
        const snap = 20;
        if (Math.abs(newLeft) < snap) newLeft = 0;
        if (Math.abs(newTop) < snap) newTop = 0;
        if (Math.abs(vw - (newLeft + width)) < snap) newLeft = vw - width;
        if (Math.abs(vh - (newTop + height)) < snap) newTop = vh - height;
        win.style.left = `${newLeft}px`;
        win.style.top = `${newTop}px`;
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        this._saveBounds(info);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });
  }

  _makeResizable(info) {
    const win = info.element;
    Object.values(info.resizers).forEach((res) => {
      res.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const dir = res.dataset.dir;
        const startX = e.clientX;
        const startY = e.clientY;
        const startRect = win.getBoundingClientRect();
        const minW = 200;
        const minH = 150;
        const move = (ev) => {
          let left = startRect.left;
          let top = startRect.top;
          let width = startRect.width;
          let height = startRect.height;
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (dir.includes("e")) width = startRect.width + dx;
          if (dir.includes("s")) height = startRect.height + dy;
          if (dir.includes("w")) {
            width = startRect.width - dx;
            left = startRect.left + dx;
          }
          if (dir.includes("n")) {
            height = startRect.height - dy;
            top = startRect.top + dy;
          }
          width = Math.max(width, minW);
          height = Math.max(height, minH);
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          if (left < 0) {
            width += left;
            left = 0;
          }
          if (top < 0) {
            height += top;
            top = 0;
          }
          if (left + width > vw) width = vw - left;
          if (top + height > vh) height = vh - top;
          win.style.left = `${left}px`;
          win.style.top = `${top}px`;
          win.style.width = `${width}px`;
          win.style.height = `${height}px`;
          win.dispatchEvent(new Event("resized"));
        };
        const up = () => {
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
          this._saveBounds(info);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      });
    });
  }
}

