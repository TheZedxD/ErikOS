/*
 * main.js – Core logic for the Win95‑style browser desktop
 *
 * This script sets up the desktop icons, manages windows and taskbar
 * interactions, implements simple applications (Notepad, File Manager,
 * Terminal, Settings), and provides a right‑click context menu and
 * start menu.  Where supported, the File System Access API is used to
 * open and save files.  In unsupported browsers a fallback download
 * mechanism is used.  Themes and wallpaper selections persist via
 * localStorage.
 */

// Data describing the desktop applications.  Each entry contains an id,
// display name, icon path, and a launch function which will be defined
// later.  Additional applications can be added here and will
// automatically appear on the desktop and in the start menu.  A Link
// Manager has been added to allow users to create custom shortcuts.
const applications = [
  {
    id: "notepad",
    name: "Notepad",
    icon: "./icons/notepad.png",
    launch: openNotepad,
  },
  {
    id: "file-manager",
    name: "File Manager",
    icon: "./icons/file-manager.png",
    launch: openFileManager,
  },
  {
    id: "terminal",
    name: "Terminal",
    icon: "./icons/terminal.png",
    launch: openTerminal,
  },
  {
    id: "settings",
    name: "Settings",
    icon: "./icons/settings.png",
    launch: openSettings,
  },
  {
    id: "link-manager",
    name: "Link Manager",
    icon: "./icons/link-manager.png",
    launch: openLinkEditor,
  },
  {
    id: "processes",
    name: "System Processes",
    icon: "./icons/processes.png",
    launch: openProcesses,
  },
  {
    id: "media-player",
    name: "Media Player",
    icon: "./icons/media-player.png",
    launch: openMediaPlayer,
  },
  {
    id: "clock",
    name: "Clock",
    icon: "./icons/clock.png",
    launch: openClock,
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: "./icons/calendar.png",
    launch: openCalendar,
  },
  {
    id: "world-clock",
    name: "World Clocks",
    icon: "./icons/world-clock.png",
    launch: openWorldClock,
  },
  {
    id: "calculator",
    name: "Calculator",
    icon: "./icons/calculator.png",
    launch: openCalculator,
  },
  {
    id: "paint",
    name: "Paint",
    icon: "./icons/paint.png",
    launch: openPaint,
  },
  {
    id: "gallery",
    name: "Gallery",
    icon: "./icons/gallery.png",
    launch: openGallery,
  },
  {
    id: "thermometer",
    name: "Temperature",
    icon: "./icons/thermometer.png",
    launch: openTempConverter,
  },
  {
    id: "recorder",
    name: "Recorder",
    icon: "./icons/recorder.png",
    launch: openRecorder,
  },
  {
    id: "volume",
    name: "Volume",
    icon: "./icons/media-player.png",
    launch: openSoundAdjuster,
  },
  {
    id: "logs",
    name: "Logs",
    icon: "./icons/logs.png",
    launch: openLogs,
  },
  {
    id: "profiles",
    name: "Profile Manager",
    icon: "./icons/user.png",
    launch: openProfileManager,
  },
  {
    id: "chat",
    name: "Chat",
    icon: "./icons/chat.png",
    launch: openChat,
  },
  {
    id: "sheets",
    name: "Sheets",
    icon: "./icons/sheets.png",
    launch: openSheets,
  },
  {
    id: "crypto",
    name: "Crypto Portfolio",
    icon: "./icons/processes.png",
    launch: openCrypto,
  },
  {
    id: "diagnostics",
    name: "Diagnostics",
    // Use an existing default icon to avoid adding binary assets
    icon: "./icons/settings-icon.png",
    launch: openDiagnostics,
  },
];

/**
 * WindowManager handles creation of windows, z‑index management, taskbar
 * integration, and basic window operations (minimise, restore, close).
 */
class WindowManager {
  constructor() {
    this.windows = new Map();
    this.nextId = 1;
    this.nextZ = 300; // start above desktop and taskbar
    this.desktop = document.getElementById("desktop");
    this.taskbar = document.getElementById("taskbar-windows");
  }

  /**
   * Create a new window with the given title and content element.
   * Returns the unique window ID.
   */
  createWindow(appId, title, contentEl) {
    const id = `${appId}-${this.nextId++}`;
    const win = document.createElement("div");
    win.classList.add("window");
    win.dataset.id = id;
    // Temporarily position the window in the top‑left offscreen to measure its
    // dimensions.  Once rendered, we reposition it to the centre of the
    // desktop.  An incremental offset is applied so that successive
    // windows don't perfectly overlap.  Without this deferred centring, all
    // windows would open anchored to the top left which feels unnatural.
    const offset = (this.windows.size % 5) * 20;
    win.style.left = "-9999px";
    win.style.top = "-9999px";
    win.style.zIndex = this.nextZ++;

    // Title bar
    const titleBar = document.createElement("div");
    titleBar.classList.add("title-bar");
    const titleSpan = document.createElement("span");
    titleSpan.classList.add("title");
    titleSpan.textContent = title;
    const controls = document.createElement("div");
    controls.classList.add("controls");
    const minimiseBtn = document.createElement("button");
    minimiseBtn.textContent = "_";
    minimiseBtn.title = "Minimise";
    const maximiseBtn = document.createElement("button");
    maximiseBtn.textContent = "□";
    maximiseBtn.title = "Maximise";
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    closeBtn.title = "Close";
    controls.append(minimiseBtn, maximiseBtn, closeBtn);
    titleBar.append(titleSpan, controls);
    win.append(titleBar);

    // Content container
    const contentContainer = document.createElement("div");
    contentContainer.classList.add("content");
    contentContainer.append(contentEl);
    win.append(contentContainer);
    this.desktop.append(win);

    // Observe content size and keep inner elements like canvases or editors
    // fitting the window's content area.
    const resizeObserver = new ResizeObserver(() => {
      const rect = contentContainer.getBoundingClientRect();
      contentContainer.querySelectorAll("canvas").forEach((cv) => {
        cv.width = rect.width;
        cv.height = rect.height;
      });
      contentContainer.querySelectorAll(".CodeMirror").forEach((cmEl) => {
        if (cmEl.CodeMirror) cmEl.CodeMirror.refresh();
      });
    });
    resizeObserver.observe(contentContainer);

    // After adding to the DOM, centre the window within the viewport while
    // accounting for the taskbar height. Apply a small cascading offset for
    // multiple windows.
    requestAnimationFrame(() => {
      const winRect = win.getBoundingClientRect();
      const taskbarEl = document.getElementById("taskbar");
      const taskbarHeight = taskbarEl ? taskbarEl.offsetHeight : 0;
      const left = Math.max(
        0,
        (window.innerWidth - winRect.width) / 2 + offset
      );
      const top = Math.max(
        0,
        (window.innerHeight - taskbarHeight - winRect.height) / 2 + offset
      );
      win.style.left = `${left}px`;
      win.style.top = `${top}px`;
    });

    // Create taskbar button
    const taskItem = document.createElement("div");
    taskItem.classList.add("taskbar-item");
    taskItem.textContent = title;
    taskItem.dataset.windowId = id;
    this.taskbar.append(taskItem);

    // Save window state
    this.windows.set(id, {
      element: win,
      taskItem,
      minimised: false,
      maximised: false,
      prevRect: null,
      maxBtn: maximiseBtn,
    });

    // Bring to front when clicked
    win.addEventListener("mousedown", () => this.bringToFront(id));
    taskItem.addEventListener("click", () => this.toggleMinimised(id));

    // Controls
    minimiseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.minimise(id);
    });
    maximiseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMaximise(id);
    });
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeWindow(id);
    });

    // Double-click title bar to toggle maximise/restore
    titleBar.addEventListener("dblclick", () => this.toggleMaximise(id));

    // Dragging
    this._makeDraggable(win, titleBar);
    // Resizing: optional simple bottom‑right handle
    this._makeResizable(win);

    this.bringToFront(id);
    return id;
  }

  /**
   * Bring the given window to the top of the z‑stack and mark its
   * taskbar item as active.
   */
  bringToFront(id) {
    const winInfo = this.windows.get(id);
    if (!winInfo) return;
    winInfo.element.style.zIndex = this.nextZ++;
    // Mark taskbar item as active
    this.taskbar
      .querySelectorAll(".taskbar-item")
      .forEach((item) => item.classList.remove("active"));
    winInfo.taskItem.classList.add("active");
    // Toggle active/inactive classes
    this.windows.forEach((info, wid) => {
      if (wid === id) {
        info.element.classList.remove("inactive");
        info.element.classList.add("active");
      } else {
        info.element.classList.remove("active");
        info.element.classList.add("inactive");
      }
    });
  }

  /**
   * Minimise the specified window (hide it but keep in taskbar)
   */
  minimise(id) {
    const winInfo = this.windows.get(id);
    if (!winInfo) return;
    winInfo.element.style.display = "none";
    winInfo.minimised = true;
    winInfo.taskItem.classList.add("active");
  }

  /**
   * Restore a minimised window
   */
  restore(id) {
    const winInfo = this.windows.get(id);
    if (!winInfo) return;
    winInfo.element.style.display = "flex";
    winInfo.minimised = false;
    this.bringToFront(id);
  }

  /**
   * Toggle minimised/restored state from the taskbar
   */
  toggleMinimised(id) {
    const winInfo = this.windows.get(id);
    if (!winInfo) return;
    if (winInfo.minimised) {
      this.restore(id);
    } else {
      this.minimise(id);
    }
  }

  toggleMaximise(id) {
    const winInfo = this.windows.get(id);
    if (!winInfo) return;
    this.bringToFront(id);
    if (winInfo.maximised) {
      this.restoreWindow(id);
    } else {
      this.maximise(id);
    }
  }

  maximise(id) {
    const winInfo = this.windows.get(id);
    if (!winInfo || winInfo.maximised) return;
    const winEl = winInfo.element;
    winInfo.prevRect = {
      left: winEl.offsetLeft,
      top: winEl.offsetTop,
      width: winEl.offsetWidth,
      height: winEl.offsetHeight,
    };
    const deskRect = this.desktop.getBoundingClientRect();
    winEl.style.left = "0px";
    winEl.style.top = "0px";
    winEl.style.width = `${deskRect.width}px`;
    winEl.style.height = `${deskRect.height}px`;
    winInfo.maximised = true;
    winEl.classList.add("maximised");
    winInfo.maxBtn.textContent = "❐";
    winInfo.maxBtn.title = "Restore";
  }

  restoreWindow(id) {
    const winInfo = this.windows.get(id);
    if (!winInfo || !winInfo.maximised) return;
    const rect = winInfo.prevRect;
    const winEl = winInfo.element;
    if (rect) {
      winEl.style.left = `${rect.left}px`;
      winEl.style.top = `${rect.top}px`;
      winEl.style.width = `${rect.width}px`;
      winEl.style.height = `${rect.height}px`;
    }
    winInfo.maximised = false;
    winEl.classList.remove("maximised");
    winInfo.maxBtn.textContent = "□";
    winInfo.maxBtn.title = "Maximise";
  }

  /**
   * Close and remove the specified window
   */
  closeWindow(id) {
    const winInfo = this.windows.get(id);
    if (!winInfo) return;
    this.taskbar.removeChild(winInfo.taskItem);
    this.desktop.removeChild(winInfo.element);
    this.windows.delete(id);
  }

  /**
   * Make a window draggable by its title bar using pointer events
   */
  _makeDraggable(winEl, handle) {
    let offsetX = 0;
    let offsetY = 0;
    const onPointerMove = (e) => {
      let newLeft = e.clientX - offsetX;
      let newTop = e.clientY - offsetY;
      // Constrain window within the desktop area so it doesn't disappear
      const deskRect = this.desktop.getBoundingClientRect();
      const maxLeft = Math.max(0, deskRect.width - winEl.offsetWidth);
      const maxTop = Math.max(0, deskRect.height - winEl.offsetHeight);
      newLeft = Math.min(Math.max(0, newLeft), maxLeft);
      newTop = Math.min(Math.max(0, newTop), maxTop);
      winEl.style.left = `${newLeft}px`;
      winEl.style.top = `${newTop}px`;
    };
    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
    handle.addEventListener("pointerdown", (e) => {
      // Only left button
      if (e.button !== 0) return;
      const info = this.windows.get(winEl.dataset.id);
      if (info && info.maximised) return;
      this.bringToFront(winEl.dataset.id);
      offsetX = e.clientX - winEl.offsetLeft;
      offsetY = e.clientY - winEl.offsetTop;
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    });
  }

  /**
   * Provide a simple bottom‑right resize handle.  Users can drag this
   * corner to resize the window.  Handles other corners could be added
   * similarly.
   */
  _makeResizable(winEl) {
    const directions = [
      { dir: "n", cursor: "n-resize", top: "-4px", left: "0", width: "100%", height: "8px" },
      { dir: "s", cursor: "s-resize", bottom: "-4px", left: "0", width: "100%", height: "8px" },
      { dir: "e", cursor: "e-resize", top: "0", right: "-4px", width: "8px", height: "100%" },
      { dir: "w", cursor: "w-resize", top: "0", left: "-4px", width: "8px", height: "100%" },
      { dir: "ne", cursor: "ne-resize", top: "-4px", right: "-4px", width: "8px", height: "8px" },
      { dir: "nw", cursor: "nw-resize", top: "-4px", left: "-4px", width: "8px", height: "8px" },
      { dir: "se", cursor: "se-resize", bottom: "-4px", right: "-4px", width: "8px", height: "8px" },
      { dir: "sw", cursor: "sw-resize", bottom: "-4px", left: "-4px", width: "8px", height: "8px" },
    ];
    const handles = [];
    directions.forEach((cfg) => {
      const h = document.createElement("div");
      h.dataset.dir = cfg.dir;
      Object.assign(h.style, {
        position: "absolute",
        cursor: cfg.cursor,
        background: "transparent",
        ...("top" in cfg ? { top: cfg.top } : {}),
        ...("bottom" in cfg ? { bottom: cfg.bottom } : {}),
        ...("left" in cfg ? { left: cfg.left } : {}),
        ...("right" in cfg ? { right: cfg.right } : {}),
        width: cfg.width,
        height: cfg.height,
      });
      winEl.append(h);
      handles.push(h);
    });

    let startX, startY, startW, startH, startL, startT, dir;
    const onPointerMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newLeft = startL;
      let newTop = startT;
      let newW = startW;
      let newH = startH;
      if (dir.includes("e")) newW = startW + dx;
      if (dir.includes("s")) newH = startH + dy;
      if (dir.includes("w")) {
        newW = startW - dx;
        newLeft = startL + dx;
      }
      if (dir.includes("n")) {
        newH = startH - dy;
        newTop = startT + dy;
      }
      // Constrain to minimum size
      if (newW < 200) {
        if (dir.includes("w")) newLeft -= 200 - newW;
        newW = 200;
      }
      if (newH < 100) {
        if (dir.includes("n")) newTop -= 100 - newH;
        newH = 100;
      }
      const deskRect = this.desktop.getBoundingClientRect();
      // Edge snapping
      const snap = 10;
      if (newLeft < snap) {
        newW += newLeft;
        newLeft = 0;
      }
      if (newTop < snap) {
        newH += newTop;
        newTop = 0;
      }
      if (deskRect.width - (newLeft + newW) < snap) {
        newW = deskRect.width - newLeft;
      }
      if (deskRect.height - (newTop + newH) < snap) {
        newH = deskRect.height - newTop;
      }
      // Limit to desktop bounds
      if (newLeft < 0) {
        newW += newLeft;
        newLeft = 0;
      }
      if (newTop < 0) {
        newH += newTop;
        newTop = 0;
      }
      if (newLeft + newW > deskRect.width) newW = deskRect.width - newLeft;
      if (newTop + newH > deskRect.height) newH = deskRect.height - newTop;

      winEl.style.left = `${newLeft}px`;
      winEl.style.top = `${newTop}px`;
      winEl.style.width = `${newW}px`;
      winEl.style.height = `${newH}px`;
      const resizeEvent = new CustomEvent("resized", {
        bubbles: false,
        detail: { width: newW, height: newH },
      });
      winEl.dispatchEvent(resizeEvent);
    };
    const onPointerUp = () => {
      winEl.classList.remove("resizing");
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
    handles.forEach((h) => {
      h.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        const info = this.windows.get(winEl.dataset.id);
        if (info && info.maximised) return;
        dir = h.dataset.dir;
        startX = e.clientX;
        startY = e.clientY;
        startW = winEl.offsetWidth;
        startH = winEl.offsetHeight;
        startL = winEl.offsetLeft;
        startT = winEl.offsetTop;
        winEl.classList.add("resizing");
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
      });
    });
  }
}

// Instantiate global window manager
const windowManager = new WindowManager();

async function apiJSON(path, options = {}) {
  try {
    const res = await fetch(path, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, data: await res.json() };
  } catch (err) {
    console.error("API error", path, err);
    return { ok: false, error: String(err) };
  }
}

// ------------------
// User profile management
// ------------------

/**
 * Profiles are stored as an array of objects in localStorage under the
 * key `win95-profiles`.  Each profile has the following structure:
 *
 * {
 *   id: string,           // unique identifier
 *   name: string,         // display name
 *   password: string|null,// password (plain text for simplicity)
 *   requirePassword: boolean, // whether a password is required to log in
 *   theme: string|null,   // selected theme (e.g. "default", "matrix", etc.)
 *   wallpaper: string|null,// data URL for the wallpaper
 *   links: array          // array of { name, url } objects for custom shortcuts
 * }
 */
let profiles = [];
let currentUser = null;

function loadProfiles() {
  try {
    const raw = localStorage.getItem("win95-profiles");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Ensure default properties exist on each profile
      parsed.forEach((p) => {
        if (!p.iconLayout) p.iconLayout = "grid";
        if (!p.iconPositions) p.iconPositions = {};
        // Show/hide flags for tray items and clock
        if (p.showClock === undefined) p.showClock = true;
        if (p.showVolume === undefined) p.showVolume = true;
        if (p.showLinks === undefined) p.showLinks = true;
        // List of visible applications on the desktop.  If undefined
        // default to showing all apps.
        if (!Array.isArray(p.visibleApps))
          p.visibleApps = applications.map((a) => a.id);
      });
      return parsed;
    }
    return [];
  } catch (err) {
    console.error("Failed to load profiles:", err);
    return [];
  }
}

function saveProfiles(prof) {
  profiles = prof;
  localStorage.setItem("win95-profiles", JSON.stringify(profiles));
}

/**
 * Apply a profile's theme and wallpaper to the document.  This removes any
 * existing theme classes and sets the wallpaper CSS variable.  Called
 * immediately after login.
 */
function applyUserSettings(profile) {
  // Theme
  document.body.className = document.body.className
    .replace(/theme-\w+/g, "")
    .trim();
  if (profile.theme && profile.theme !== "default") {
    document.body.classList.add(`theme-${profile.theme}`);
  }
  // Wallpaper
  if (profile.wallpaper) {
    document.body.style.backgroundImage = `url(${profile.wallpaper})`;
  } else {
    document.body.style.backgroundImage = `url('./images/wallpaper.png')`;
  }
}

/**
 * Show the login overlay.  When no profiles exist, this will prompt to
 * create a master user.  When profiles exist, it displays bubbles
 * representing each user.  Clicking a bubble either logs the user in
 * immediately (if no password is required) or prompts for a password.
 */
function showLoginScreen() {
  const overlay = document.getElementById("login-screen");
  overlay.innerHTML = "";
  overlay.style.display = "flex";
  // Hide desktop and taskbar while login screen is active
  document.getElementById("desktop").style.display = "none";
  document.getElementById("taskbar").style.display = "none";
  document.getElementById("start-menu").style.display = "none";
  document.getElementById("context-menu").style.display = "none";
  // Apply login background if set
  const loginBg = localStorage.getItem("win95-login-bg");
  if (loginBg) {
    overlay.style.backgroundImage = `url(${loginBg})`;
    overlay.style.backgroundSize = "cover";
    overlay.style.backgroundPosition = "center";
  } else {
    overlay.style.backgroundImage = "";
  }
  const container = document.createElement("div");
  container.classList.add("login-container");
  overlay.append(container);
  if (!profiles || profiles.length === 0) {
    // Show master user creation form
    const heading = document.createElement("h3");
    heading.textContent = "Create Master Profile";
    const form = document.createElement("form");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Name";
    nameInput.required = true;
    const passInput = document.createElement("input");
    passInput.type = "password";
    passInput.placeholder = "Password (optional)";
    const requireToggle = document.createElement("label");
    const reqChk = document.createElement("input");
    reqChk.type = "checkbox";
    reqChk.checked = false;
    requireToggle.append(reqChk, document.createTextNode(" Require password"));
    const submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.textContent = "Create";
    form.append(nameInput, passInput, requireToggle, submitBtn);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      if (!name) return;
      const pwd = passInput.value.trim() || null;
      const profile = {
        id: `${Date.now()}`,
        name,
        password: pwd,
        requirePassword: reqChk.checked && !!pwd,
        theme: null,
        wallpaper: null,
        links: [],
      };
      profiles.push(profile);
      saveProfiles(profiles);
      loginUser(profile);
    });
    container.append(heading, form);
  } else {
    // Profiles list
    const heading = document.createElement("h3");
    heading.textContent = "Select a Profile";
    container.append(heading);
    const list = document.createElement("div");
    list.classList.add("profiles");
    profiles.forEach((profile, index) => {
      const bubble = document.createElement("div");
      bubble.classList.add("profile");
      bubble.dataset.index = index;
      const img = document.createElement("img");
      img.src = "./icons/user.png";
      img.alt = "";
      const span = document.createElement("span");
      span.textContent = profile.name;
      bubble.append(img, span);
      bubble.addEventListener("click", () => {
        // If password required, show prompt; otherwise log in directly
        if (profile.requirePassword) {
          showPasswordPrompt(index);
        } else {
          loginUser(profile);
        }
      });
      list.append(bubble);
    });
    container.append(list);
    // Button to add new profile
    const addBtn = document.createElement("button");
    addBtn.textContent = "Add Profile";
    addBtn.addEventListener("click", () => {
      showCreateProfileForm();
    });
    container.append(addBtn);
    // Hidden password prompt container
    const pwdContainer = document.createElement("div");
    pwdContainer.id = "login-password-container";
    container.append(pwdContainer);
  }
}

function showPasswordPrompt(index) {
  const container = document.getElementById("login-password-container");
  container.innerHTML = "";
  const form = document.createElement("form");
  const label = document.createElement("label");
  label.textContent = `Enter password for ${profiles[index].name}`;
  const pwdInput = document.createElement("input");
  pwdInput.type = "password";
  pwdInput.required = true;
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Login";
  form.append(label, pwdInput, submit);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const pwd = pwdInput.value;
    if (pwd === profiles[index].password) {
      loginUser(profiles[index]);
    } else {
      alert("Incorrect password");
    }
  });
  container.append(form);
}

function showCreateProfileForm() {
  const overlay = document.getElementById("login-screen");
  const container = overlay.querySelector(".login-container");
  container.innerHTML = "";
  const heading = document.createElement("h3");
  heading.textContent = "Add Profile";
  const form = document.createElement("form");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Name";
  nameInput.required = true;
  const passInput = document.createElement("input");
  passInput.type = "password";
  passInput.placeholder = "Password (optional)";
  const requireToggle = document.createElement("label");
  const reqChk = document.createElement("input");
  reqChk.type = "checkbox";
  reqChk.checked = false;
  requireToggle.append(reqChk, document.createTextNode(" Require password"));
  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "Create";
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => showLoginScreen());
  form.append(nameInput, passInput, requireToggle, submitBtn, cancelBtn);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    const pwd = passInput.value.trim() || null;
    const profile = {
      id: `${Date.now()}`,
      name,
      password: pwd,
      requirePassword: reqChk.checked && !!pwd,
      theme: null,
      wallpaper: null,
      links: [],
    };
    profiles.push(profile);
    saveProfiles(profiles);
    showLoginScreen();
  });
  container.append(heading, form);
}

/**
 * Log a user in.  The current user is set, settings applied, and the
 * desktop initialised.  The login overlay is hidden.  If a password
 * prompt was shown it is cleared.
 */
function loginUser(profile) {
  currentUser = profile;
  // Persist the current user id for automatic login next time (if no password required)
  localStorage.setItem("win95-current-user", profile.id);

  // Record login event in the logs
  addLog("User logged in: " + profile.name);
  applyUserSettings(profile);
  // Hide login screen and show desktop
  const overlay = document.getElementById("login-screen");
  overlay.style.display = "none";
  document.getElementById("desktop").style.display = "block";
  document.getElementById("taskbar").style.display = "flex";
  // Apply taskbar element visibility based on profile preferences
  try {
    const clockEl = document.getElementById("system-clock");
    if (clockEl)
      clockEl.style.display = profile.showClock === false ? "none" : "flex";
    const volEl = document.getElementById("tray-volume-icon");
    if (volEl)
      volEl.style.display = profile.showVolume === false ? "none" : "inline";
    const linkEl = document.getElementById("tray-links-icon");
    if (linkEl)
      linkEl.style.display = profile.showLinks === false ? "none" : "inline";
  } catch (err) {
    console.error("Error applying tray preferences", err);
  }
  // Initialise desktop and menus
  initDesktop();
  initContextMenu();
  initSpotlight();
  initTray();
}

/**
 * Log out the current user.  Hides desktop and shows the login screen.
 */
function logoutUser() {
  currentUser = null;
  localStorage.removeItem("win95-current-user");
  showLoginScreen();
}

// ------------------
// Spotlight overlay and link management
// ------------------

function initSpotlight() {
  // Prevent multiple initialisations which would bind duplicate event listeners.
  if (initSpotlight.initialized) return;
  initSpotlight.initialized = true;
  const overlay = document.getElementById("spotlight-overlay");
  overlay.innerHTML = "";
  // Build the search box and result list
  const searchBox = document.createElement("div");
  searchBox.classList.add("search-box");
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Search…";
  const list = document.createElement("ul");
  searchBox.append(input, list);
  overlay.append(searchBox);
  function updateResults() {
    const query = input.value.toLowerCase();
    list.innerHTML = "";
    // Collect available items: applications and user links
    const items = [];
    applications.forEach((app) => {
      items.push({ type: "app", id: app.id, name: app.name, icon: app.icon });
    });
    if (currentUser && Array.isArray(currentUser.links)) {
      currentUser.links.forEach((link) => {
        items.push({
          type: "link",
          name: link.name,
          icon: "./icons/link.png",
          url: link.url,
        });
      });
    }
    items
      .filter((item) => item.name.toLowerCase().includes(query))
      .forEach((item) => {
        const li = document.createElement("li");
        li.dataset.type = item.type;
        li.dataset.id = item.id || "";
        li.dataset.url = item.url || "";
        const img = document.createElement("img");
        img.src = item.icon;
        img.alt = "";
        li.append(img, document.createTextNode(item.name));
        li.addEventListener("click", () => {
          if (item.type === "app") {
            const app = applications.find((a) => a.id === item.id);
            if (app) app.launch();
          } else if (item.type === "link") {
            window.open(item.url, "_blank");
          }
          overlay.style.display = "none";
        });
        list.append(li);
      });
  }
  input.addEventListener("input", updateResults);
  // keyboard navigation: enter to open first result
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const first = list.querySelector("li");
      if (first) first.click();
    } else if (e.key === "Escape") {
      overlay.style.display = "none";
    }
  });
  // Register global key to toggle overlay (Ctrl+Space)
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.code === "Space") {
      e.preventDefault();
      const visible =
        overlay.style.display === "flex" || overlay.style.display === "block";
      if (visible) {
        overlay.style.display = "none";
      } else {
        updateResults();
        overlay.style.display = "flex";
        input.focus();
      }
    }
  });
}

/**
 * Link Manager application.  Provides a simple UI for creating and
 * managing custom links associated with the current user.  The list of
 * links is stored on the profile object and persisted via
 * saveProfiles().
 */
/**
 * Link Editor application.  This version replaces the previous flat
 * Link Manager with a hierarchical tree view.  Links and folders are
 * stored in currentUser.links as nested objects.  Users can add
 * folders, add links and delete items.  Drag and drop is also
 * supported to reorder links and folders.
 */
function openLinkEditor() {
  if (!currentUser) {
    alert("Please log in to manage links");
    return;
  }
  // Ensure the links data structure is initialised to a nested form.
  if (!Array.isArray(currentUser.links)) currentUser.links = [];
  // Migrate any flat link objects (with name/url) into the nested
  // representation by wrapping them as { type: 'link', name, url }.
  currentUser.links = currentUser.links.map((item) => {
    if (item.type) return item;
    return { type: "link", name: item.name, url: item.url };
  });

  const container = document.createElement("div");
  container.classList.add("file-manager");
  const toolbar = document.createElement("div");
  toolbar.classList.add("file-manager-toolbar");
  const addFolderBtn = document.createElement("button");
  addFolderBtn.textContent = "Add Folder";
  const addLinkBtn = document.createElement("button");
  addLinkBtn.textContent = "Add Link";
  toolbar.append(addFolderBtn, addLinkBtn);
  const content = document.createElement("div");
  content.classList.add("file-manager-content");
  content.classList.add("link-tree");
  container.append(toolbar, content);
  windowManager.createWindow("link-manager", "Link Editor", container);

  // Utility to traverse nested links based on a path array of indices.
  function getNodeByPath(path) {
    let node = { children: currentUser.links };
    path.forEach((idx) => {
      node = node.children[idx];
    });
    return node;
  }

  // Render the tree recursively.
  function render() {
    content.innerHTML = "";
    const ul = buildList(currentUser.links, []);
    content.append(ul);
    saveProfiles(profiles);
  }

  /**
   * Build a nested UL/LI structure from the links data.  Each LI
   * carries a data‑path attribute indicating its location in the tree.
   */
  function buildList(items, path) {
    const ul = document.createElement("ul");
    items.forEach((item, index) => {
      const li = document.createElement("li");
      li.draggable = true;
      const itemPath = path.concat(index);
      li.dataset.path = JSON.stringify(itemPath);
      const label = document.createElement("span");
      if (item.type === "folder") {
        label.textContent = "📂 " + item.name;
        label.style.fontWeight = "bold";
        // Click to toggle collapse/expand
        label.addEventListener("click", () => {
          const subList = li.querySelector("ul");
          if (subList) {
            subList.style.display =
              subList.style.display === "none" ? "block" : "none";
          }
        });
        // Controls for folders
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (confirm("Delete this folder and its contents?")) {
            const parent = getNodeByPath(path);
            parent.children.splice(index, 1);
            render();
          }
        });
        const addFolderInsideBtn = document.createElement("button");
        addFolderInsideBtn.textContent = "+";
        addFolderInsideBtn.title = "Add folder inside";
        addFolderInsideBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const name = prompt("Folder name");
          if (!name) return;
          if (!item.children) item.children = [];
          item.children.push({ type: "folder", name, children: [] });
          render();
        });
        const addLinkInsideBtn = document.createElement("button");
        addLinkInsideBtn.textContent = "L";
        addLinkInsideBtn.title = "Add link inside";
        addLinkInsideBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const name = prompt("Link name");
          if (!name) return;
          const url = prompt("URL");
          if (!url) return;
          if (!item.children) item.children = [];
          item.children.push({ type: "link", name, url });
          render();
        });
        li.append(label, delBtn, addFolderInsideBtn, addLinkInsideBtn);
        // Recursively build children
        const subList = buildList(item.children || [], itemPath);
        li.append(subList);
      } else {
        // Link node
        label.textContent = "🔗 " + item.name;
        label.style.color = "blue";
        label.style.textDecoration = "underline";
        label.addEventListener("click", () => {
          window.open(item.url, "_blank");
        });
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (confirm("Delete this link?")) {
            const parent = getNodeByPath(path);
            parent.children.splice(index, 1);
            render();
          }
        });
        li.append(label, delBtn);
      }
      // Drag and drop handlers
      li.addEventListener("dragstart", (e) => {
        e.stopPropagation();
        e.dataTransfer.setData("application/path", JSON.stringify(itemPath));
      });
      li.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      li.addEventListener("drop", (e) => {
        e.preventDefault();
        const srcPath = JSON.parse(e.dataTransfer.getData("application/path"));
        const destPath = JSON.parse(li.dataset.path);
        // Do not allow dropping onto itself
        if (JSON.stringify(srcPath) === JSON.stringify(destPath)) return;
        // Remove source node
        const srcParent = srcPath.slice(0, -1);
        const srcIdx = srcPath[srcPath.length - 1];
        const srcContainer =
          srcParent.length === 0
            ? { children: currentUser.links }
            : getNodeByPath(srcParent);
        const [moved] = srcContainer.children.splice(srcIdx, 1);
        // Determine destination parent
        const destParent = destPath.slice(0, -1);
        const destIdx = destPath[destPath.length - 1];
        const destContainer =
          destParent.length === 0
            ? { children: currentUser.links }
            : getNodeByPath(destParent);
        // If dropping onto a folder, append into its children
        const destNode = getNodeByPath(destPath);
        if (destNode.type === "folder") {
          if (!destNode.children) destNode.children = [];
          destNode.children.push(moved);
        } else {
          destContainer.children.splice(destIdx, 0, moved);
        }
        render();
      });
      ul.append(li);
    });
    return ul;
  }

  // Top‑level buttons
  addFolderBtn.addEventListener("click", () => {
    const name = prompt("Folder name");
    if (!name) return;
    currentUser.links.push({ type: "folder", name, children: [] });
    render();
  });
  addLinkBtn.addEventListener("click", () => {
    const name = prompt("Link name");
    if (!name) return;
    const url = prompt("URL");
    if (!url) return;
    currentUser.links.push({ type: "link", name, url });
    render();
  });

  render();
}
// Load persisted theme and wallpaper from localStorage
function applyPersistedSettings() {
  const theme = localStorage.getItem("win95-theme");
  if (theme) {
    document.body.classList.add(`theme-${theme}`);
  }
  const wallpaper = localStorage.getItem("win95-wallpaper");
  if (wallpaper) {
    document.body.style.backgroundImage = `url(${wallpaper})`;
  }
}

/**
 * Initialise desktop icons and start menu
 */
function initDesktop() {
  const desktop = document.getElementById("desktop");
  // Clear existing icons
  desktop.innerHTML = "";

  // Determine layout mode from current user (grid or free)
  const layout =
    currentUser && currentUser.iconLayout ? currentUser.iconLayout : "grid";
  // Set data attribute on desktop for CSS rules
  desktop.dataset.layout = layout;
  // Counter for computing default positions in free layout
  let freeIndex = 0;
  const appsForDesktop = (() => {
    // Determine which apps should appear on the desktop.  If a profile
    // defines visibleApps, filter accordingly; otherwise show all.
    if (currentUser && Array.isArray(currentUser.visibleApps)) {
      return applications.filter((a) => currentUser.visibleApps.includes(a.id));
    }
    return applications;
  })();
  appsForDesktop.forEach((app) => {
    const icon = document.createElement("div");
    icon.classList.add("icon");
    icon.setAttribute("role", "button");
    icon.tabIndex = 0;
    icon.dataset.appId = app.id;
    const iconSrc =
      currentUser && currentUser.customIcons && currentUser.customIcons[app.id]
        ? currentUser.customIcons[app.id]
        : app.icon;
    icon.innerHTML = `<img src="${iconSrc}" alt="${app.name} icon"><span>${app.name}</span>`;
    desktop.append(icon);
    // Position icons based on layout
    if (layout === "free") {
      // Retrieve saved position if available
      let pos;
      if (currentUser && currentUser.iconPositions) {
        pos = currentUser.iconPositions[app.id];
      }
      if (pos) {
        icon.style.left = pos.x + "px";
        icon.style.top = pos.y + "px";
      } else {
        // Compute default position in a simple grid pattern
        const col = freeIndex % 6;
        const row = Math.floor(freeIndex / 6);
        const x = 20 + col * 90;
        const y = 20 + row * 100;
        icon.style.left = x + "px";
        icon.style.top = y + "px";
        if (currentUser && currentUser.iconPositions) {
          currentUser.iconPositions[app.id] = { x, y };
        }
        freeIndex++;
      }
      clampIconPosition(icon);
      // Attach drag functionality with launch-on-click behaviour
      attachIconDrag(icon, app);
    } else {
      // Grid layout: let CSS handle positioning
      icon.style.left = "";
      icon.style.top = "";
      icon.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        app.launch();
      });
    }
    // Single click focuses icon
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      // Remove selection from other icons
      document
        .querySelectorAll(".icon.selected")
        .forEach((el) => el.classList.remove("selected"));
      icon.classList.add("selected");
    });
  });

  // Start menu search and items
  const startMenu = document.getElementById("start-menu");
  const startButton = document.getElementById("start-button");
  const searchInput = document.getElementById("start-search");
  const appList = document.getElementById("start-app-list");

  function populateStartMenu(filter = "") {
    appList.innerHTML = "";
    applications
      .filter((app) => app.name.toLowerCase().includes(filter.toLowerCase()))
      .forEach((app) => {
        const li = document.createElement("li");
        li.dataset.appId = app.id;
        const iconSrc =
          currentUser &&
          currentUser.customIcons &&
          currentUser.customIcons[app.id]
            ? currentUser.customIcons[app.id]
            : app.icon;
        li.innerHTML = `<img src="${iconSrc}" alt=""> ${app.name}`;
        li.addEventListener("click", () => {
          app.launch();
          startMenu.style.display = "none";
          searchInput.value = "";
        });
        appList.append(li);
      });
  }
  populateStartMenu();

  searchInput.addEventListener("input", () => {
    populateStartMenu(searchInput.value);
  });

  startButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const visible =
      startMenu.style.display === "flex" || startMenu.style.display === "block";
    if (visible) {
      startMenu.style.display = "none";
    } else {
      startMenu.style.display = "flex";
      searchInput.focus();
    }
  });

  // Hide start menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!startMenu.contains(e.target) && e.target !== startButton) {
      startMenu.style.display = "none";
    }
  });
}

/**
 * Set the icon layout mode for the current user.  Accepts 'free' or 'grid'.
 * Persists the choice to the profile and reinitialises the desktop.
 * @param {string} layout
 */
function setIconLayout(layout) {
  if (!currentUser) return;
  if (layout !== "free" && layout !== "grid") return;
  currentUser.iconLayout = layout;
  // When switching to grid, clear saved positions so icons snap nicely
  if (layout === "grid") {
    currentUser.iconPositions = {};
  }
  saveProfiles(profiles);
  initDesktop();
}

function clampIconPosition(icon) {
  const desktopRect = document
    .getElementById("desktop")
    .getBoundingClientRect();
  const iconRect = icon.getBoundingClientRect();
  let x = parseInt(icon.style.left, 10) || 0;
  let y = parseInt(icon.style.top, 10) || 0;
  const maxLeft = desktopRect.width - iconRect.width;
  const maxTop = desktopRect.height - iconRect.height;
  x = Math.min(Math.max(0, x), maxLeft);
  y = Math.min(Math.max(0, y), maxTop);
  icon.style.left = `${x}px`;
  icon.style.top = `${y}px`;
}

/**
 * Attach dragging capability to an icon.  Only active when the current
 * layout mode is 'free'.  Saves the icon position on drop.
 * @param {HTMLElement} icon
 * @param {object} app
 */
function attachIconDrag(icon, app) {
  let startX, startY, startLeft, startTop, moved;
  const onMove = (e) => {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && Math.hypot(dx, dy) > 5) moved = true;
    if (!moved) return;
    let newLeft = startLeft + dx;
    let newTop = startTop + dy;
    const desktopRect = document
      .getElementById("desktop")
      .getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    const maxLeft = desktopRect.width - iconRect.width;
    const maxTop = desktopRect.height - iconRect.height;
    newLeft = Math.min(Math.max(0, newLeft), maxLeft);
    newTop = Math.min(Math.max(0, newTop), maxTop);
    icon.style.left = `${newLeft}px`;
    icon.style.top = `${newTop}px`;
  };
  const onUp = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    icon.classList.remove("dragging");
    if (!moved) {
      app.launch();
    } else if (currentUser && currentUser.iconPositions) {
      const x = parseInt(icon.style.left, 10) || 0;
      const y = parseInt(icon.style.top, 10) || 0;
      currentUser.iconPositions[app.id] = { x, y };
      saveProfiles(profiles);
    }
  };
  icon.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (!currentUser || currentUser.iconLayout !== "free") return;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(icon.style.left, 10) || 0;
    startTop = parseInt(icon.style.top, 10) || 0;
    moved = false;
    icon.classList.add("dragging");
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  });
}

/**
 * Context menu logic.  Displays a custom context menu on right click
 * depending on the target (icon, window or taskbar).  The menu
 * definitions could be extended here to support additional actions.
 */
function initContextMenu() {
  const menu = document.getElementById("context-menu");

  function hideMenu() {
    menu.style.display = "none";
    menu.innerHTML = "";
  }

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) hideMenu();
  });

  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    hideMenu();
    const target = e.target;
    const items = [];
    // Icon context
    if (target.closest(".icon")) {
      const iconEl = target.closest(".icon");
      const appId = iconEl.dataset.appId;
      const app = applications.find((a) => a.id === appId);
      if (app) {
        items.push({ label: "Open", action: () => app.launch() });
        items.push({ label: "Rename", action: () => renameIcon(iconEl) });
        items.push({ label: "Delete", action: () => deleteIcon(iconEl) });
        items.push({
          label: "Ask AI…",
          action: () => alert("AI assistant is coming soon!"),
        });
      }
    }
    // Window context
    else if (target.closest(".window")) {
      const winEl = target.closest(".window");
      const id = winEl.dataset.id;
      items.push({
        label: "Minimise",
        action: () => windowManager.minimise(id),
      });
      items.push({
        label: "Close",
        action: () => windowManager.closeWindow(id),
      });
    }
    // Taskbar context
    else if (target.closest(".taskbar-item")) {
      const item = target.closest(".taskbar-item");
      const id = item.dataset.windowId;
      items.push({ label: "Restore", action: () => windowManager.restore(id) });
      items.push({
        label: "Close",
        action: () => windowManager.closeWindow(id),
      });
    }
    // File manager context
    else if (target.closest(".file-manager")) {
      const ctx = window.fileManagerContext;
      if (ctx) {
        items.push({ label: "New Folder", action: ctx.newFolder });
        items.push({ label: "Upload", action: ctx.uploadFile });
        if (ctx.hasSelection()) {
          items.push({ label: "Rename", action: ctx.renameItem });
          items.push({ label: "Delete", action: ctx.deleteItem });
        }
      }
    }
    // Desktop context
    else {
      items.push({
        label: "New > Text document (coming soon)",
        action: () => alert("Feature coming soon"),
      });
      // Icon layout toggle.  Only show when a user is logged in.
      if (currentUser) {
        if (currentUser.iconLayout === "grid") {
          items.push({
            label: "Enable Free Form Layout",
            action: () => setIconLayout("free"),
          });
        } else {
          items.push({
            label: "Enable Grid Layout",
            action: () => setIconLayout("grid"),
          });
        }
      }
      items.push({ label: "Settings", action: () => openSettings() });
    }
    // Build and display the menu
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item.label;
      li.addEventListener("click", () => {
        hideMenu();
        item.action();
      });
      menu.append(li);
    });
    menu.style.left = `${e.pageX}px`;
    menu.style.top = `${e.pageY}px`;
    menu.style.display = "block";
  });
}

/**
 * Initialise the system tray icons and quick links menu.  The tray
 * currently includes a single icon for quick access to user links.
 * Clicking the icon toggles a small popup menu populated from
 * currentUser.links.  Selecting a link opens it in a new browser
 * tab.  A final item opens the full Link Editor.
 */
function initTray() {
  const trayIcon = document.getElementById("tray-links-icon");
  const trayMenu = document.getElementById("tray-menu");
  const trayVolIcon = document.getElementById("tray-volume-icon");
  if (!trayIcon || !trayMenu) return;
  // Toggle menu on icon click
  trayIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    if (trayMenu.style.display === "block") {
      trayMenu.style.display = "none";
    } else {
      populateTrayMenu();
      trayMenu.style.display = "block";
    }
  });
  // Hide menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!trayMenu.contains(e.target) && e.target !== trayIcon) {
      trayMenu.style.display = "none";
    }
  });

  // Volume icon opens the volume control application
  if (trayVolIcon) {
    trayVolIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      openSoundAdjuster();
    });
  }
}

/**
 * Populate the quick links tray menu from the current user’s links.
 * Nested folders are not expanded in this view; only top‑level
 * links are displayed.  If no links exist a placeholder is shown.
 */
function populateTrayMenu() {
  const trayMenu = document.getElementById("tray-menu");
  trayMenu.innerHTML = "";
  if (
    !currentUser ||
    !Array.isArray(currentUser.links) ||
    currentUser.links.length === 0
  ) {
    const empty = document.createElement("li");
    empty.textContent = "No links";
    trayMenu.append(empty);
  } else {
    // Flatten top-level links only
    currentUser.links.forEach((item) => {
      if (item.type === "link") {
        const li = document.createElement("li");
        const iconSpan = document.createElement("span");
        iconSpan.textContent = "🔗";
        const nameSpan = document.createElement("span");
        nameSpan.textContent = item.name;
        li.append(iconSpan, nameSpan);
        li.addEventListener("click", () => {
          window.open(item.url, "_blank");
          trayMenu.style.display = "none";
        });
        trayMenu.append(li);
      }
    });
  }
  // Add an item to open the full Link Editor
  const manage = document.createElement("li");
  manage.textContent = "Manage Links…";
  manage.addEventListener("click", () => {
    openLinkEditor();
    trayMenu.style.display = "none";
  });
  trayMenu.append(manage);
}

/**
 * Rename a desktop icon.  Turns the label into an editable text field.
 */
function renameIcon(iconEl) {
  const span = iconEl.querySelector("span");
  const oldName = span.textContent;
  const input = document.createElement("input");
  input.type = "text";
  input.value = oldName;
  input.style.width = "70px";
  iconEl.replaceChild(input, span);
  input.focus();
  input.select();
  input.addEventListener("blur", () => {
    const newSpan = document.createElement("span");
    newSpan.textContent = input.value || oldName;
    iconEl.replaceChild(newSpan, input);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      input.blur();
    }
  });
}

/**
 * Delete a desktop icon.  Only removes from the current view; to restore
 * refresh the page.  Confirmation is requested to avoid accidental
 * deletions.
 */
function deleteIcon(iconEl) {
  if (confirm("Are you sure you want to remove this icon?")) {
    iconEl.remove();
  }
}

/**
 * Application: Notepad
 * A simple text editor powered by CodeMirror.  Supports opening and
 * saving files using the File System Access API when available.
 */
function openNotepad(initialText = "") {
  addLog("Notepad opened");
  // Main container fills the window
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";

  // Menu bar with common notepad actions
  const menu = document.createElement("div");
  menu.classList.add("notepad-menu");
  // Helper to create buttons
  function makeBtn(label, title) {
    const btn = document.createElement("button");
    btn.textContent = label;
    if (title) btn.title = title;
    return btn;
  }
  const newBtn = makeBtn("New", "New file");
  const openBtn = makeBtn("Open", "Open file");
  const saveBtn = makeBtn("Save", "Save file");
  const saveAsBtn = makeBtn("Save As", "Save as");
  const wrapBtn = makeBtn("Wrap", "Toggle word wrap");
  const undoBtn = makeBtn("Undo", "Undo");
  const redoBtn = makeBtn("Redo", "Redo");
  menu.append(newBtn, openBtn, saveBtn, saveAsBtn, wrapBtn, undoBtn, redoBtn);
  container.append(menu);

  // Editor area using a textarea placeholder (CodeMirror will enhance it)
  const textarea = document.createElement("textarea");
  textarea.classList.add("notepad-editor");
  textarea.value = initialText;
  container.append(textarea);

  // Create window
  const winId = windowManager.createWindow("notepad", "Notepad", container);
  // Setup CodeMirror
  const editor = CodeMirror.fromTextArea(textarea, {
    lineNumbers: true,
    mode: "text/plain",
    lineWrapping: true,
    tabSize: 4,
    indentUnit: 4,
    indentWithTabs: true,
    smartIndent: true,
  });
  const winEl = windowManager.windows.get(winId).element;
  // Refresh CodeMirror on resize
  winEl.addEventListener("resized", () => editor.refresh());
  setTimeout(() => editor.refresh(), 0);

  let currentFileHandle = null;
  let wrapEnabled = true;

  // Helper to trigger download for unsupported browsers
  function downloadFile(filename, text) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // New document
  newBtn.addEventListener("click", () => {
    if (!confirm("Discard current document?")) return;
    editor.setValue("");
    currentFileHandle = null;
  });
  // Open file
  openBtn.addEventListener("click", async () => {
    try {
      if (window.showOpenFilePicker) {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [
            {
              description: "Text files",
              accept: {
                "text/plain": [".txt", ".md", ".csv", ".js", ".html", ".css"],
              },
            },
          ],
          multiple: false,
        });
        const file = await fileHandle.getFile();
        const content = await file.text();
        editor.setValue(content);
        currentFileHandle = fileHandle;
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".txt,.md,.csv,.js,.html,.css";
        input.style.display = "none";
        document.body.append(input);
        input.addEventListener("change", () => {
          const file = input.files[0];
          if (!file) return;
          file.text().then((text) => editor.setValue(text));
          currentFileHandle = null;
          input.remove();
        });
        input.click();
      }
    } catch (err) {
      console.error(err);
    }
  });
  // Save (overwrites current file if exists)
  async function saveToHandle(handle) {
    const text = editor.getValue();
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    alert("File saved successfully.");
  }
  saveBtn.addEventListener("click", async () => {
    const text = editor.getValue();
    try {
      if (currentFileHandle) {
        await saveToHandle(currentFileHandle);
      } else if (window.showSaveFilePicker) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: "untitled.txt",
          types: [
            { description: "Text files", accept: { "text/plain": [".txt"] } },
          ],
        });
        await saveToHandle(fileHandle);
        currentFileHandle = fileHandle;
      } else {
        downloadFile("untitled.txt", text);
      }
    } catch (err) {
      console.error(err);
    }
  });
  // Save As (always ask for file location)
  saveAsBtn.addEventListener("click", async () => {
    const text = editor.getValue();
    try {
      if (window.showSaveFilePicker) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: "untitled.txt",
          types: [
            { description: "Text files", accept: { "text/plain": [".txt"] } },
          ],
        });
        await saveToHandle(fileHandle);
        currentFileHandle = fileHandle;
      } else {
        downloadFile("untitled.txt", text);
      }
    } catch (err) {
      console.error(err);
    }
  });
  // Toggle word wrap
  wrapBtn.addEventListener("click", () => {
    wrapEnabled = !wrapEnabled;
    editor.setOption("lineWrapping", wrapEnabled);
    wrapBtn.classList.toggle("active", wrapEnabled);
  });
  // Undo/Redo
  undoBtn.addEventListener("click", () => editor.undo && editor.undo());
  redoBtn.addEventListener("click", () => editor.redo && editor.redo());
}

/**
 * Application: File Manager
 * A minimal file browser that allows the user to select a directory and
 * lists its immediate children.  Double‑clicking on a text file opens it
 * in Notepad.  Requires File System Access API; otherwise a message is
 * shown.
 */
function openFileManager() {
  addLog("File Manager opened");
  const container = document.createElement("div");
  container.classList.add("file-manager");
  const toolbar = document.createElement("div");
  toolbar.classList.add("file-manager-toolbar");
  const newFolderBtn = document.createElement("button");
  newFolderBtn.textContent = "New Folder";
  const uploadBtn = document.createElement("button");
  uploadBtn.textContent = "Upload";
  const renameBtn = document.createElement("button");
  renameBtn.textContent = "Rename";
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  const refreshBtn = document.createElement("button");
  refreshBtn.textContent = "Refresh";
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search";
  toolbar.append(
    newFolderBtn,
    uploadBtn,
    renameBtn,
    deleteBtn,
    refreshBtn,
    searchInput
  );
  const body = document.createElement("div");
  body.classList.add("file-manager-body");
  const tree = document.createElement("div");
  tree.classList.add("file-tree");
  const details = document.createElement("div");
  details.classList.add("file-details");
  body.append(tree, details);
  container.append(toolbar, body);
  windowManager.createWindow("file-manager", "File Manager", container);

  let currentPath = "";
  let currentItems = [];
  let selected = null;

  async function newFolder() {
    const name = prompt("Folder name");
    if (!name) return;
    const result = await apiJSON("/api/create-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: currentPath, name }),
    });
    if (!result.ok) alert(result.error);
    loadDirectory(currentPath);
  }

  async function renameItem() {
    if (!selected) return alert("Select an item first");
    const newName = prompt("New name", selected.name);
    if (!newName) return;
    const result = await apiJSON("/api/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selected.path, new_name: newName }),
    });
    if (!result.ok) alert(result.error);
    loadDirectory(currentPath);
  }

  async function deleteItem() {
    if (!selected) return alert("Select an item first");
    if (!confirm("Delete " + selected.name + "?")) return;
    const result = await apiJSON("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selected.path }),
    });
    if (!result.ok) alert(result.error);
    loadDirectory(currentPath);
  }

  function uploadFileAction() {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.style.display = "none";
    inp.addEventListener("change", async () => {
      const file = inp.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("path", currentPath);
      fd.append("file", file);
      const result = await apiJSON("/api/upload", { method: "POST", body: fd });
      if (!result.ok) alert(result.error);
      loadDirectory(currentPath);
    });
    inp.click();
  }

  window.fileManagerContext = {
    newFolder,
    renameItem,
    deleteItem,
    uploadFile: uploadFileAction,
    hasSelection: () => !!selected,
  };

  async function loadDirectory(path) {
    const resp = await apiJSON(
      `/api/list-directory?path=${encodeURIComponent(path)}`
    );
    if (!resp.ok) {
      details.textContent = resp.error || "Failed to load directory";
      return;
    }
    const data = resp.data;
    currentPath = data.path;
    currentItems = data.items;
    renderTreeRoot();
    renderDetails();
  }

  function renderTreeRoot() {
    tree.innerHTML = "";
    const root = document.createElement("div");
    root.textContent = "/";
    root.classList.add("tree-item");
    root.addEventListener("click", () => loadDirectory(""));
    tree.append(root);
    buildTree("", root, tree);
  }

  async function buildTree(path, elem, containerEl) {
    if (elem.dataset.loaded) return;
    elem.dataset.loaded = "1";
    try {
      const resp = await apiJSON(
        `/api/list-directory?path=${encodeURIComponent(path)}`
      );
      if (!resp.ok) return;
      const data = resp.data;
      const children = document.createElement("div");
      children.classList.add("tree-children");
      data.items
        .filter((i) => i.isDir)
        .forEach((dir) => {
          const child = document.createElement("div");
          child.textContent = dir.name;
          child.classList.add("tree-item");
          child.addEventListener("click", () => loadDirectory(dir.path));
          children.append(child);
          child.addEventListener("dblclick", () =>
            buildTree(dir.path, child, children)
          );
        });
      containerEl.append(children);
    } catch {}
  }

  function renderDetails() {
    details.innerHTML = "";
    selected = null;
    const items = currentItems.filter((i) =>
      i.name.toLowerCase().includes(searchInput.value.toLowerCase())
    );
    items.forEach((item) => {
      const row = document.createElement("div");
      row.classList.add("file-item");
      row.textContent = item.name;
      row.addEventListener("click", () => {
        details
          .querySelectorAll(".file-item.selected")
          .forEach((el) => el.classList.remove("selected"));
        row.classList.add("selected");
        selected = item;
      });
      row.addEventListener("contextmenu", () => {
        details
          .querySelectorAll(".file-item.selected")
          .forEach((el) => el.classList.remove("selected"));
        row.classList.add("selected");
        selected = item;
      });
      row.addEventListener("dblclick", () => openItem(item));
      details.append(row);
    });
  }

  async function openItem(item) {
    if (item.isDir) {
      await loadDirectory(item.path);
      return;
    }
    const ext = item.name.split(".").pop().toLowerCase();
    try {
      if (["txt", "js", "json", "md"].includes(ext)) {
        const res = await fetch("/" + item.path);
        if (!res.ok) throw new Error("Failed to load file");
        const text = await res.text();
        openNotepad(text);
      } else if (["png", "jpg", "jpeg", "gif", "bmp"].includes(ext)) {
        openGallery(["/" + item.path]);
      } else if (ext === "csv") {
        const res = await fetch("/" + item.path);
        if (!res.ok) throw new Error("Failed to load file");
        const text = await res.text();
        openSheets({
          type: "csv",
          name: item.name.replace(/\.csv$/, ""),
          content: text,
        });
      } else if (ext === "xlsx") {
        const res = await fetch("/" + item.path);
        if (!res.ok) throw new Error("Failed to load file");
        const buf = await res.arrayBuffer();
        openSheets({ type: "xlsx", content: buf });
      } else {
        window.open("/" + item.path, "_blank");
      }
    } catch (err) {
      alert("Unable to open file: " + err);
    }
  }

  searchInput.addEventListener("input", renderDetails);
  refreshBtn.addEventListener("click", () => loadDirectory(currentPath));

  newFolderBtn.addEventListener("click", newFolder);
  renameBtn.addEventListener("click", renameItem);
  deleteBtn.addEventListener("click", deleteItem);
  uploadBtn.addEventListener("click", uploadFileAction);

  loadDirectory("");
}

/**
 * Application: Terminal
 * A lightweight pseudo terminal that implements a few built‑in commands.
 * Real operating system access is not possible from the browser, but this
 * provides a familiar interface for interacting with the desktop.
 */
function openTerminal() {
  const container = document.createElement("div");
  container.classList.add("terminal-container");
  const output = document.createElement("div");
  output.classList.add("terminal-output");
  const input = document.createElement("input");
  input.classList.add("terminal-input");
  input.type = "text";
  input.placeholder = "Type a command...";
  container.append(output, input);
  windowManager.createWindow("terminal", "Terminal", container);
  // Command definitions
  // Local commands supported by the terminal.  All other input will
  // be sent to the server via /api/execute-command.  See
  // app.py for the list of whitelisted commands on the backend.
  const commands = {
    help: () => {
      return (
        "Available commands:\n" +
        "help          Show this help message\n" +
        "clear         Clear the terminal\n" +
        "theme <name>  Change theme (default, matrix, highcontrast, red, pink, solarized, vaporwave)\n" +
        "about         Show information about this desktop\n" +
        "All other commands will be executed on the server (if allowed)"
      );
    },
    clear: () => {
      output.textContent = "";
      return "";
    },
    theme: (name) => {
      setTheme(name);
      return `Theme changed to ${name}`;
    },
    about: () => {
      return (
        "Win95‑Style Browser Desktop\n" +
        "This is a web‑based desktop environment inspired by Windows 95.\n" +
        "Implemented using vanilla JavaScript and modern Web APIs."
      );
    },
  };
  function print(text) {
    output.textContent += text + "\n";
    output.scrollTop = output.scrollHeight;
  }
  print('Win95‑Terminal. Type "help" for available commands.');
  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      const line = input.value.trim();
      input.value = "";
      if (!line) return;
      print("> " + line);
      const [cmd, ...args] = line.split(" ");
      const command = commands[cmd];
      if (command) {
        const result = command(...args);
        if (typeof result === "string") print(result);
      } else {
        // Send unknown commands to the server for execution
        try {
          const resp = await fetch("/api/execute-command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: line }),
          });
          const data = await resp.json();
          if (data.error) {
            print("Error: " + data.error);
          } else {
            print(data.output || "");
          }
        } catch (err) {
          print("Failed to execute command");
        }
      }
    }
  });
}

/**
 * Application: System Processes
 * Shows running scripts and open windows, plus CPU and RAM usage.
 * Data refreshes automatically while the window is open.
 */
function openProcesses() {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";

  const tabs = document.createElement("div");
  tabs.classList.add("settings-tabs");
  const contentArea = document.createElement("div");
  contentArea.style.flex = "1";
  contentArea.style.overflowY = "auto";

  const panels = {};
  const tabBtns = {};
  function makePanel(name) {
    const panel = document.createElement("div");
    panel.classList.add("settings-section");
    panel.style.display = "none";
    panels[name] = panel;
    contentArea.append(panel);
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.addEventListener("click", () => showPanel(name));
    tabs.append(btn);
    tabBtns[name] = btn;
    return panel;
  }

  function showPanel(name) {
    Object.entries(panels).forEach(([n, p]) => {
      p.style.display = n === name ? "block" : "none";
    });
    Object.entries(tabBtns).forEach(([n, b]) => {
      b.classList.toggle("active", n === name);
    });
  }

  const procPanel = makePanel("Processes");
  const scriptsSection = document.createElement("div");
  const windowsSection = document.createElement("div");
  procPanel.append(scriptsSection, windowsSection);

  const statsPanel = makePanel("Stats");
  const cpuText = document.createElement("p");
  const ramText = document.createElement("p");
  statsPanel.append(cpuText, ramText);

  container.append(tabs, contentArea);
  showPanel("Processes");

  const winId = windowManager.createWindow(
    "processes",
    "System Processes",
    container
  );

  async function load() {
    try {
      const statsResp = await fetch("/api/system-stats");
      const stats = await statsResp.json();
      cpuText.textContent = `CPU Usage: ${stats.cpu}%`;
      ramText.textContent = `RAM Usage: ${stats.ram}%`;
    } catch {
      cpuText.textContent = "CPU Usage: n/a";
      ramText.textContent = "RAM Usage: n/a";
    }

    scriptsSection.innerHTML = "<h3>Running Scripts</h3>";
    try {
      const resp = await fetch("/api/list-scripts");
      const data = await resp.json();
      if (!Array.isArray(data.processes) || data.processes.length === 0) {
        const p = document.createElement("p");
        p.textContent = "No running scripts.";
        scriptsSection.append(p);
      } else {
        data.processes.forEach((proc) => {
          const row = document.createElement("div");
          row.classList.add("file-item");
          const nameSpan = document.createElement("span");
          nameSpan.textContent = `${proc.script} (PID ${proc.pid})`;
          const stopBtn = document.createElement("button");
          stopBtn.textContent = "Stop";
          stopBtn.addEventListener("click", async () => {
            try {
              await fetch("/api/stop-script", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pid: proc.pid }),
              });
            } catch {}
            load();
          });
          stopBtn.style.marginLeft = "auto";
          stopBtn.style.padding = "2px 6px";
          stopBtn.style.fontSize = "12px";
          stopBtn.style.background = "var(--button-bg)";
          stopBtn.style.borderTop = `2px solid var(--btn-border-light)`;
          stopBtn.style.borderLeft = `2px solid var(--btn-border-light)`;
          stopBtn.style.borderRight = `2px solid var(--btn-border-dark)`;
          stopBtn.style.borderBottom = `2px solid var(--btn-border-dark)`;
          row.append(nameSpan, stopBtn);
          scriptsSection.append(row);
        });
      }
    } catch {
      const p = document.createElement("p");
      p.textContent = "Failed to load processes.";
      scriptsSection.append(p);
    }

    windowsSection.innerHTML = "<h3>Open Windows</h3>";
    windowManager.windows.forEach((info) => {
      const row = document.createElement("div");
      row.classList.add("file-item");
      const title = info.element.querySelector(".title");
      row.textContent = title ? title.textContent : "Unnamed";
      windowsSection.append(row);
    });
    if (windowsSection.childElementCount === 1) {
      const p = document.createElement("p");
      p.textContent = "No open windows.";
      windowsSection.append(p);
    }
  }

  load();
  const interval = setInterval(load, 4000);
  const closeBtn = windowManager.windows
    .get(winId)
    .element.querySelector(".controls button:last-child");
  closeBtn.addEventListener("click", () => clearInterval(interval));
}

/**
 * Application: Settings
 * Allows the user to change theme and wallpaper.  Selections are stored
 * in localStorage and applied immediately.
 */
async function openSettings() {
  addLog("Settings opened");
  const container = document.createElement("div");
  container.classList.add("settings-panel");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";
  // Tabs
  const tabs = document.createElement("div");
  tabs.classList.add("settings-tabs");
  const contentArea = document.createElement("div");
  contentArea.style.flex = "1";
  contentArea.style.overflowY = "auto";
  // Panels store
  const panels = {};
  function makePanel(name) {
    const panel = document.createElement("div");
    panel.classList.add("settings-section");
    panel.style.display = "none";
    panels[name] = panel;
    return panel;
  }
  // Appearance panel
  const appearance = makePanel("Appearance");
  // Theme select
  const themeHeading = document.createElement("h3");
  themeHeading.textContent = "Theme";
  const themeSelect = document.createElement("select");
  [
    "default",
    "matrix",
    "highcontrast",
    "red",
    "pink",
    "solarized",
    "vaporwave",
  ].forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    const activeTheme = currentUser
      ? currentUser.theme || "default"
      : document.body.className.match(/theme-(\w+)/)?.[1] || "default";
    if (name === activeTheme) opt.selected = true;
    themeSelect.append(opt);
  });
  appearance.append(themeHeading, themeSelect);
  // Live preview
  const activeThemeClass = currentUser
    ? currentUser.theme || "default"
    : document.body.className.match(/theme-(\w+)/)?.[1] || "default";
  Array.from(themeSelect.options).forEach((opt) => {
    opt.addEventListener("mouseenter", () => {
      document.body.className = document.body.className
        .replace(/theme-\w+/g, "")
        .trim();
      const val = opt.value;
      if (val && val !== "default") document.body.classList.add("theme-" + val);
    });
    opt.addEventListener("mouseleave", () => {
      document.body.className = document.body.className
        .replace(/theme-\w+/g, "")
        .trim();
      if (activeThemeClass && activeThemeClass !== "default")
        document.body.classList.add("theme-" + activeThemeClass);
    });
  });
  // Wallpaper
  const wallpaperHeading = document.createElement("h3");
  wallpaperHeading.textContent = "Wallpaper";
  const wallpaperInput = document.createElement("input");
  wallpaperInput.type = "file";
  wallpaperInput.accept = "image/*";
  const resetWallpaperBtn = document.createElement("button");
  resetWallpaperBtn.textContent = "Reset Wallpaper";
  appearance.append(wallpaperHeading, wallpaperInput, resetWallpaperBtn);
  // Desktop panel
  const desktopPanel = makePanel("Desktop");
  desktopPanel.style.display = "flex";
  desktopPanel.style.flexDirection = "column";
  desktopPanel.style.gap = "8px";
  const iconListResp = await fetch("/api/list-icons").catch(() => null);
  const iconData = iconListResp ? await iconListResp.json() : {};
  let availableIcons = iconData.icons || [];
  const layoutHeading = document.createElement("h3");
  layoutHeading.textContent = "Icon Layout";
  const freeRadio = document.createElement("input");
  freeRadio.type = "radio";
  freeRadio.name = "icon-layout";
  freeRadio.value = "free";
  const freeLabel = document.createElement("label");
  freeLabel.append(freeRadio, document.createTextNode(" Free form"));
  const gridRadio = document.createElement("input");
  gridRadio.type = "radio";
  gridRadio.name = "icon-layout";
  gridRadio.value = "grid";
  const gridLabel = document.createElement("label");
  gridLabel.append(gridRadio, document.createTextNode(" Snap to grid"));
  if (currentUser && currentUser.iconLayout === "free")
    freeRadio.checked = true;
  else gridRadio.checked = true;
  desktopPanel.append(layoutHeading, freeLabel, gridLabel);
  // Show/hide system elements
  const trayHeading = document.createElement("h3");
  trayHeading.textContent = "Taskbar Elements";
  const clockChk = document.createElement("input");
  clockChk.type = "checkbox";
  clockChk.checked = currentUser ? currentUser.showClock : true;
  const clockLabel = document.createElement("label");
  clockLabel.append(clockChk, document.createTextNode(" Show clock"));
  const volChk = document.createElement("input");
  volChk.type = "checkbox";
  volChk.checked = currentUser ? currentUser.showVolume : true;
  const volLabel = document.createElement("label");
  volLabel.append(volChk, document.createTextNode(" Show volume control"));
  const linksChk = document.createElement("input");
  linksChk.type = "checkbox";
  linksChk.checked = currentUser ? currentUser.showLinks : true;
  const linksLabel = document.createElement("label");
  linksLabel.append(linksChk, document.createTextNode(" Show quick links"));
  desktopPanel.append(trayHeading, clockLabel, volLabel, linksLabel);

  // Select which application icons appear on the desktop.  Each app gets a
  // checkbox; toggling it updates the current user's visibleApps list and
  // reinitialises the desktop.  The start menu and spotlight always list
  // all applications regardless of visibility.
  const appsHeading = document.createElement("h3");
  appsHeading.textContent = "Desktop Icons";
  desktopPanel.append(appsHeading);
  applications.forEach((app) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "4px";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.id = `vis-${app.id}`;
    // Determine whether this app should be shown
    const isVisible =
      currentUser && Array.isArray(currentUser.visibleApps)
        ? currentUser.visibleApps.includes(app.id)
        : true;
    chk.checked = isVisible;
    const lbl = document.createElement("label");
    lbl.htmlFor = chk.id;
    lbl.append(chk, document.createTextNode(" " + app.name));
    row.append(lbl);

    const select = document.createElement("select");
    select.classList.add("icon-select");
    const defOpt = document.createElement("option");
    defOpt.value = app.icon;
    defOpt.textContent = "(default)";
    select.append(defOpt);
    availableIcons.forEach((file) => {
      const opt = document.createElement("option");
      opt.value = "./icons/" + file;
      opt.textContent = file;
      select.append(opt);
    });
    if (
      currentUser &&
      currentUser.customIcons &&
      currentUser.customIcons[app.id]
    ) {
      select.value = currentUser.customIcons[app.id];
    }
    select.addEventListener("change", () => {
      if (!currentUser) return;
      currentUser.customIcons = currentUser.customIcons || {};
      currentUser.customIcons[app.id] = select.value;
      saveProfiles(profiles);
      initDesktop();
    });
    const iconBtn = document.createElement("button");
    iconBtn.textContent = "Upload Icon";
    const resetIconBtn = document.createElement("button");
    resetIconBtn.textContent = "Reset";
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png";
    fileInput.style.display = "none";
    iconBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file || !currentUser) return;
      const form = new FormData();
      form.append("file", file);
      try {
        const resp = await fetch("/api/upload-icon", {
          method: "POST",
          body: form,
        });
        const data = await resp.json();
        if (!data.ok) {
          alert(data.error || "Upload failed");
          return;
        }
        const filename = data.file;
        if (!availableIcons.includes(filename)) {
          availableIcons.push(filename);
          document.querySelectorAll("select.icon-select").forEach((sel) => {
            const opt = document.createElement("option");
            opt.value = "./icons/" + filename;
            opt.textContent = filename;
            sel.append(opt);
          });
        }
        currentUser.customIcons = currentUser.customIcons || {};
        currentUser.customIcons[app.id] = "./icons/" + filename;
        saveProfiles(profiles);
        initDesktop();
        select.value = "./icons/" + filename;
      } catch (err) {
        console.error("Upload failed", err);
        alert("Upload failed");
      }
    });
    resetIconBtn.addEventListener("click", () => {
      if (!currentUser || !currentUser.customIcons) return;
      delete currentUser.customIcons[app.id];
      saveProfiles(profiles);
      initDesktop();
      select.value = app.icon;
    });
    row.append(select, iconBtn, resetIconBtn, fileInput);

    const defaultName = app.icon.split("/").pop();
    if (!availableIcons.includes(defaultName)) {
      console.warn("Missing icon for app", app.id);
    }

    // Save visibility on change
    chk.addEventListener("change", () => {
      if (!currentUser) return;
      const list = currentUser.visibleApps || [];
      if (chk.checked) {
        if (!list.includes(app.id)) list.push(app.id);
      } else {
        const idx = list.indexOf(app.id);
        if (idx >= 0) list.splice(idx, 1);
      }
      currentUser.visibleApps = list;
      saveProfiles(profiles);
      initDesktop();
    });
    desktopPanel.append(row);
  });
  // Security panel
  const securityPanel = makePanel("Security");
  if (currentUser) {
    const accHeading = document.createElement("h3");
    accHeading.textContent = "Account Security";
    const requireChk = document.createElement("input");
    requireChk.type = "checkbox";
    requireChk.checked = currentUser.requirePassword;
    const requireLabel = document.createElement("label");
    requireLabel.append(
      requireChk,
      document.createTextNode(" Require password at login")
    );
    const changePwdBtn = document.createElement("button");
    changePwdBtn.textContent = "Change Password";
    securityPanel.append(accHeading, requireLabel, changePwdBtn);
    changePwdBtn.addEventListener("click", () => {
      const pwd = prompt("Enter new password (leave blank to remove password)");
      currentUser.password = pwd || null;
      currentUser.requirePassword = pwd ? requireChk.checked : false;
      saveProfiles(profiles);
      alert("Password updated");
    });
    requireChk.addEventListener("change", () => {
      currentUser.requirePassword =
        requireChk.checked && !!currentUser.password;
      saveProfiles(profiles);
    });

    // Login background controls
    const loginBgHeading = document.createElement("h3");
    loginBgHeading.textContent = "Login Screen Background";
    const loginBgInput = document.createElement("input");
    loginBgInput.type = "file";
    loginBgInput.accept = "image/*";
    const resetLoginBgBtn = document.createElement("button");
    resetLoginBgBtn.textContent = "Reset Login Background";
    securityPanel.append(loginBgHeading, loginBgInput, resetLoginBgBtn);

    loginBgInput.addEventListener("change", () => {
      const file = loginBgInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        localStorage.setItem("win95-login-bg", dataUrl);
        alert(
          "Login background updated. It will be applied next time you log out."
        );
      };
      reader.readAsDataURL(file);
    });
    resetLoginBgBtn.addEventListener("click", () => {
      localStorage.removeItem("win95-login-bg");
      alert(
        "Login background reset. It will revert to the default colour on next login."
      );
    });
  }
  // Audio panel
  const audioPanel = makePanel("Audio");
  const audioHeading = document.createElement("h3");
  audioHeading.textContent = "Volume";
  const volSlider = document.createElement("input");
  volSlider.type = "range";
  volSlider.min = "0";
  volSlider.max = "1";
  volSlider.step = "0.01";
  volSlider.value = String(globalVolume);
  audioPanel.append(audioHeading, volSlider);
  volSlider.addEventListener("input", () => {
    setGlobalVolume(parseFloat(volSlider.value));
  });
  // Advanced panel placeholder
  const advancedPanel = makePanel("Advanced");
  advancedPanel.append(
    document.createTextNode("Advanced settings coming soon.")
  );

  // Create tabs for each panel
  const categories = [
    { name: "Appearance", panel: appearance },
    { name: "Desktop", panel: desktopPanel },
    { name: "Security", panel: securityPanel },
    { name: "Audio", panel: audioPanel },
    { name: "Advanced", panel: advancedPanel },
  ];
  categories.forEach(({ name, panel }, index) => {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.classList.add("tab-button");
    if (index === 0) btn.classList.add("active");
    btn.addEventListener("click", () => {
      // Activate this tab
      tabs
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      // Show associated panel and hide others
      Object.values(panels).forEach((p) => (p.style.display = "none"));
      panel.style.display = "block";
    });
    tabs.append(btn);
    contentArea.append(panel);
  });
  // Initially show first panel
  if (categories.length > 0) categories[0].panel.style.display = "block";
  // Event listeners for controls
  themeSelect.addEventListener("change", () => {
    const val = themeSelect.value;
    if (currentUser) {
      currentUser.theme = val === "default" ? null : val;
      saveProfiles(profiles);
    }
    setTheme(val);
  });
  wallpaperInput.addEventListener("change", () => {
    const file = wallpaperInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      if (currentUser) {
        currentUser.wallpaper = dataUrl;
        saveProfiles(profiles);
      } else {
        localStorage.setItem("win95-wallpaper", dataUrl);
      }
      document.body.style.backgroundImage = `url(${dataUrl})`;
    };
    reader.readAsDataURL(file);
  });
  resetWallpaperBtn.addEventListener("click", () => {
    if (currentUser) {
      currentUser.wallpaper = null;
      saveProfiles(profiles);
    } else {
      localStorage.removeItem("win95-wallpaper");
    }
    document.body.style.backgroundImage = `url('./images/wallpaper.png')`;
  });
  // Layout radio handlers
  freeRadio.addEventListener("change", () => {
    if (freeRadio.checked) setIconLayout("free");
  });
  gridRadio.addEventListener("change", () => {
    if (gridRadio.checked) setIconLayout("grid");
  });
  // Show/hide toggles for clock, volume and links
  clockChk.addEventListener("change", () => {
    if (!currentUser) return;
    currentUser.showClock = clockChk.checked;
    saveProfiles(profiles);
    document.getElementById("system-clock").style.display = clockChk.checked
      ? "flex"
      : "none";
  });
  volChk.addEventListener("change", () => {
    if (!currentUser) return;
    currentUser.showVolume = volChk.checked;
    saveProfiles(profiles);
    document.getElementById("tray-volume-icon").style.display = volChk.checked
      ? "inline"
      : "none";
  });
  linksChk.addEventListener("change", () => {
    if (!currentUser) return;
    currentUser.showLinks = linksChk.checked;
    saveProfiles(profiles);
    document.getElementById("tray-links-icon").style.display = linksChk.checked
      ? "inline"
      : "none";
  });
  container.append(tabs, contentArea);
  windowManager.createWindow("settings", "Settings", container);
}

/**
 * Apply a named theme.  Removes any existing theme class and adds
 * theme-{name}, then persists the selection.
 */
function setTheme(name) {
  // Remove any existing theme class
  document.body.className = document.body.className
    .replace(/theme-\w+/g, "")
    .trim();
  if (name && name !== "default") {
    document.body.classList.add(`theme-${name}`);
  }
  // Persist the selection.  When a user is logged in, save on the profile;
  // otherwise store it globally for anonymous sessions.
  if (currentUser) {
    currentUser.theme = name === "default" ? null : name;
    saveProfiles(profiles);
  } else {
    if (name === "default") {
      localStorage.removeItem("win95-theme");
    } else {
      localStorage.setItem("win95-theme", name);
    }
  }
}

// Initialise desktop when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Apply any globally persisted settings.  These are used only when no user
  // profile is active.  For logged-in users, their theme and wallpaper
  // settings are applied after login.
  applyPersistedSettings();
  // Load profiles from storage and decide whether to show the login screen
  profiles = loadProfiles();
  const savedId = localStorage.getItem("win95-current-user");
  if (!profiles || profiles.length === 0) {
    showLoginScreen();
  } else {
    // Attempt automatic login if a user ID is saved and the profile does not
    // require a password
    const user = profiles.find((p) => p.id === savedId);
    if (user && !user.requirePassword) {
      loginUser(user);
    } else {
      showLoginScreen();
    }
  }
  // Context menu is initialised after login because it relies on the
  // desktop and applications being present.  The login workflow calls
  // initContextMenu() itself.
});

// ---------------------------------------------------------------------------
// Additional global utilities: audio management and logging
//
// To provide a consistent audio experience across applications, we keep a
// registry of all audio/video elements created by the various apps.  The
// setGlobalVolume function iterates through this list and applies a new
// volume level.  Applications should call addAudioElement(el) when they
// create a playable media element.

const globalAudioElements = [];
let globalVolume = parseFloat(localStorage.getItem("win95-volume") || "1");

/**
 * Register a media element for global volume control.  Newly created
 * audio or video elements should be passed to this function so that
 * adjusting the volume slider affects all media uniformly.
 * @param {HTMLMediaElement} el
 */
function addAudioElement(el) {
  try {
    el.volume = globalVolume;
    globalAudioElements.push(el);
  } catch (err) {
    console.error("Failed to add audio element:", err);
  }
}

/**
 * Set the global volume and persist the setting.  The provided value
 * should be between 0.0 and 1.0.  All registered media elements are
 * updated immediately.
 * @param {number} value
 */
function setGlobalVolume(value) {
  globalVolume = Math.max(0, Math.min(1, value));
  localStorage.setItem("win95-volume", String(globalVolume));
  globalAudioElements.forEach((el) => {
    el.volume = globalVolume;
  });
}

// ---------------------------------------------------------------------------
// Logging system
//
// Logs are stored in localStorage under the key `win95-logs`.  The data
// structure is an object mapping date strings (YYYY‑MM‑DD) to arrays of
// entries.  Each entry is an object with a time and message.  The
// openLogs application presents these entries to the user.  Logging
// minimal events like application launches helps with debugging but
// remains lightweight.

let logsData = loadLogs();

/**
 * Load logs from localStorage.  Returns an object mapping dates to
 * arrays of log entries.
 * @returns {Record<string, Array<{time:string,message:string}>>}
 */
function loadLogs() {
  try {
    const raw = localStorage.getItem("win95-logs");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    console.error("Failed to load logs:", err);
    return {};
  }
}

/**
 * Persist the current logsData back to localStorage.
 */
function saveLogs() {
  try {
    localStorage.setItem("win95-logs", JSON.stringify(logsData));
  } catch (err) {
    console.error("Failed to save logs:", err);
  }
}

/**
 * Append a log entry for the current date.  A timestamp is added
 * automatically.  If the date bucket does not exist it is created.
 * @param {string} message
 */
function addLog(message) {
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);
  if (!logsData[dateKey]) logsData[dateKey] = [];
  logsData[dateKey].push({ time: now.toLocaleTimeString(), message });
  // Keep log list trimmed to avoid unbounded growth: store only last 100
  if (logsData[dateKey].length > 100) {
    logsData[dateKey] = logsData[dateKey].slice(-100);
  }
  saveLogs();
}

// ---------------------------------------------------------------------------
// Application implementations
//
// The following functions create simple implementations of the remaining
// applications referenced in the applications array.  Each function
// builds a UI from scratch and attaches behaviour appropriate to the
// application.  Where possible, native Web APIs are leveraged.

/**
 * Media Player app.  Allows the user to select and play audio or video
 * files from their computer.  Supports both the File System Access API
 * (for browsers that implement it) and a fallback <input type="file">
 * mechanism.  Media elements are registered for global volume control.
 */
function openMediaPlayer() {
  addLog("Media Player opened");
  const container = document.createElement("div");
  container.classList.add("file-manager");
  const toolbar = document.createElement("div");
  toolbar.classList.add("file-manager-toolbar");
  const openBtn = document.createElement("button");
  openBtn.textContent = "Open Media";
  toolbar.append(openBtn);
  const content = document.createElement("div");
  content.classList.add("file-manager-content");
  container.append(toolbar, content);
  windowManager.createWindow("media-player", "Media Player", container);
  let currentEl = null;
  async function loadFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // Remove previous element
    content.innerHTML = "";
    if (currentEl) {
      currentEl.pause();
      currentEl.src = "";
      currentEl = null;
    }
    // Determine type
    if (file.type.startsWith("video")) {
      currentEl = document.createElement("video");
      currentEl.controls = true;
      currentEl.style.maxWidth = "100%";
      currentEl.style.maxHeight = "100%";
      currentEl.src = url;
      addAudioElement(currentEl);
      content.append(currentEl);
      currentEl.play();
    } else if (file.type.startsWith("audio")) {
      currentEl = document.createElement("audio");
      currentEl.controls = true;
      currentEl.src = url;
      addAudioElement(currentEl);
      content.append(currentEl);
      currentEl.play();
    } else {
      const p = document.createElement("p");
      p.textContent = "Unsupported file type.";
      content.append(p);
    }
  }
  openBtn.addEventListener("click", async () => {
    try {
      if (window.showOpenFilePicker) {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: "Media",
              accept: {
                "audio/*": [".mp3", ".wav", ".ogg"],
                "video/*": [".mp4", ".webm", ".ogg"],
              },
            },
          ],
          multiple: false,
        });
        const file = await handle.getFile();
        await loadFile(file);
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "audio/*,video/*";
        input.style.display = "none";
        document.body.append(input);
        input.addEventListener("change", () => {
          const file = input.files[0];
          loadFile(file);
          input.remove();
        });
        input.click();
      }
    } catch (err) {
      console.error(err);
    }
  });
}

/**
 * Digital Clock app.  Displays the current time and updates every second.
 */
function openClock() {
  addLog("Clock opened");
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.fontSize = "32px";
  const timeEl = document.createElement("div");
  const dateEl = document.createElement("div");
  dateEl.style.fontSize = "18px";
  container.append(timeEl, dateEl);
  const winId = windowManager.createWindow("clock", "Clock", container);
  function update() {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString();
    dateEl.textContent = now.toLocaleDateString();
  }
  update();
  const interval = setInterval(update, 1000);
  const closeBtn = windowManager.windows
    .get(winId)
    .element.querySelector(".controls button:last-child");
  closeBtn.addEventListener("click", () => clearInterval(interval));
}

/**
 * Calendar app.  Shows a monthly calendar with navigation buttons.
 */
function openCalendar() {
  addLog("Calendar opened");
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "<";
  const nextBtn = document.createElement("button");
  nextBtn.textContent = ">";
  const title = document.createElement("span");
  header.append(prevBtn, title, nextBtn);
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  container.append(header, table);
  windowManager.createWindow("calendar", "Calendar", container);
  let currentDate = new Date();
  function render() {
    // Set header
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    title.textContent =
      monthNames[currentDate.getMonth()] + " " + currentDate.getFullYear();
    // Clear table
    table.innerHTML = "";
    // Header row with day names
    const headerRow = document.createElement("tr");
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d) => {
      const th = document.createElement("th");
      th.textContent = d;
      th.style.border = "1px solid var(--window-border-dark)";
      th.style.padding = "2px";
      headerRow.append(th);
    });
    table.append(headerRow);
    // Get first day of month (0=Sun) and number of days
    const first = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const firstDay = first.getDay();
    const daysInMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    ).getDate();
    let row = document.createElement("tr");
    // Blank cells before first day
    for (let i = 0; i < firstDay; i++) {
      const td = document.createElement("td");
      td.textContent = "";
      td.style.border = "1px solid var(--window-border-dark)";
      td.style.height = "24px";
      row.append(td);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      if ((firstDay + day - 1) % 7 === 0 && row.children.length) {
        table.append(row);
        row = document.createElement("tr");
      }
      const td = document.createElement("td");
      td.textContent = String(day);
      td.style.border = "1px solid var(--window-border-dark)";
      td.style.padding = "2px";
      td.style.textAlign = "center";
      // Highlight today
      const today = new Date();
      if (
        day === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear()
      ) {
        td.style.background = "var(--selection-bg)";
        td.style.color = "#fff";
      }
      row.append(td);
    }
    // Fill remaining cells of last row
    while (row.children.length < 7) {
      const td = document.createElement("td");
      td.textContent = "";
      td.style.border = "1px solid var(--window-border-dark)";
      td.style.height = "24px";
      row.append(td);
    }
    table.append(row);
  }
  prevBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    render();
  });
  nextBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    render();
  });
  render();
}

/**
 * World Clocks app.  Allows the user to monitor multiple time zones.
 */
function openWorldClock() {
  addLog("World Clocks opened");
  const container = document.createElement("div");
  container.classList.add("file-manager");
  const toolbar = document.createElement("div");
  toolbar.classList.add("file-manager-toolbar");
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add Clock";
  toolbar.append(addBtn);
  const content = document.createElement("div");
  content.classList.add("file-manager-content");
  container.append(toolbar, content);
  const winId = windowManager.createWindow(
    "world-clock",
    "World Clocks",
    container
  );
  const intervals = [];
  // Use localStorage to persist user clocks
  const clockKey = "win95-world-clocks";
  let clocks = [];
  try {
    const raw = localStorage.getItem(clockKey);
    clocks = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(clocks)) clocks = [];
  } catch (err) {
    clocks = [];
  }
  function saveClocks() {
    localStorage.setItem(clockKey, JSON.stringify(clocks));
  }
  function render() {
    content.innerHTML = "";
    intervals.forEach(clearInterval);
    intervals.length = 0;
    if (clocks.length === 0) {
      const p = document.createElement("p");
      p.textContent = "No clocks configured.";
      content.append(p);
    } else {
      clocks.forEach((tz, idx) => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "8px";
        const label = document.createElement("span");
        label.textContent = tz.label + " (" + tz.zone + ")";
        const timeEl = document.createElement("span");
        timeEl.style.marginLeft = "auto";
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => {
          clearInterval(interval);
          clocks.splice(idx, 1);
          saveClocks();
          render();
        });
        row.append(label, timeEl, removeBtn);
        content.append(row);
        // Update time display
        function update() {
          try {
            const opt = {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              timeZone: tz.zone,
            };
            timeEl.textContent = new Intl.DateTimeFormat([], opt).format(
              new Date()
            );
          } catch (err) {
            timeEl.textContent = "Invalid";
          }
        }
        update();
        const interval = setInterval(update, 1000);
        intervals.push(interval);
      });
    }
  }
  addBtn.addEventListener("click", () => {
    const zone = prompt("Enter IANA time zone (e.g. America/New_York)");
    if (!zone) return;
    const label = prompt("Enter label for this clock");
    clocks.push({ zone, label: label || zone });
    saveClocks();
    render();
  });
  render();
  const closeBtn = windowManager.windows
    .get(winId)
    .element.querySelector(".controls button:last-child");
  closeBtn.addEventListener("click", () => intervals.forEach(clearInterval));
}

/**
 * Calculator app.  Provides a simple calculator with common operations.
 */
function openCalculator() {
  addLog("Calculator opened");
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.width = "200px";
  const display = document.createElement("input");
  display.type = "text";
  display.readOnly = true;
  display.value = "0";
  display.style.textAlign = "right";
  display.style.fontSize = "20px";
  display.style.marginBottom = "4px";
  const buttons = [
    ["7", "8", "9", "/"],
    ["4", "5", "6", "*"],
    ["1", "2", "3", "-"],
    ["0", ".", "=", "+"],
    ["C"],
  ];
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(4,1fr)";
  grid.style.gap = "4px";
  buttons.flat().forEach((label) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.style.fontSize = "18px";
    btn.style.padding = "8px";
    btn.addEventListener("click", () => {
      if (label === "C") {
        display.value = "0";
      } else if (label === "=") {
        try {
          // Evaluate the expression safely.  Restrict to numbers and operators.
          const expr = display.value;
          if (/^[0-9.\/*+\-\s]+$/.test(expr)) {
            display.value = String(eval(expr));
          } else {
            display.value = "Err";
          }
        } catch (err) {
          display.value = "Err";
        }
      } else {
        if (display.value === "0" && /[0-9]/.test(label)) {
          display.value = label;
        } else {
          display.value += label;
        }
      }
    });
    grid.append(btn);
  });
  container.append(display, grid);
  windowManager.createWindow("calculator", "Calculator", container);
}

/**
 * Paint app.  Allows simple freehand drawing on a canvas.  Users can
 * choose a colour, adjust brush size and clear or save their artwork.
 */
function openPaint() {
  addLog("Paint opened");
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";
  // Toolbar with multiple tools
  const toolbar = document.createElement("div");
  toolbar.style.display = "flex";
  toolbar.style.gap = "4px";
  const brushBtn = document.createElement("button");
  brushBtn.textContent = "Brush";
  brushBtn.title = "Brush tool";
  const eraserBtn = document.createElement("button");
  eraserBtn.textContent = "Eraser";
  eraserBtn.title = "Eraser tool";
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = "#000000";
  const sizeInput = document.createElement("input");
  sizeInput.type = "range";
  sizeInput.min = "1";
  sizeInput.max = "30";
  sizeInput.value = "4";
  sizeInput.title = "Brush size";
  const insertImgBtn = document.createElement("button");
  insertImgBtn.textContent = "Insert Image";
  insertImgBtn.title = "Insert an image onto the canvas";
  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  toolbar.append(
    brushBtn,
    eraserBtn,
    colorInput,
    sizeInput,
    insertImgBtn,
    clearBtn,
    saveBtn
  );
  const canvas = document.createElement("canvas");
  // Default size; will adjust to window size on creation
  canvas.width = 640;
  canvas.height = 400;
  canvas.style.border = "1px solid var(--window-border-dark)";
  canvas.style.cursor = "crosshair";
  container.append(toolbar, canvas);
  const winId = windowManager.createWindow("paint", "Paint", container);
  const winEl = windowManager.windows.get(winId).element;
  const ctx = canvas.getContext("2d");
  function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height - toolbar.offsetHeight;
  }
  resizeCanvas();
  winEl.addEventListener("resized", () => setTimeout(resizeCanvas, 0));
  ctx.lineCap = "round";
  // Track current drawing mode
  let mode = "brush";
  // Highlight selected tool
  function updateToolButtons() {
    brushBtn.style.fontWeight = mode === "brush" ? "bold" : "normal";
    eraserBtn.style.fontWeight = mode === "erase" ? "bold" : "normal";
  }
  updateToolButtons();
  brushBtn.addEventListener("click", () => {
    mode = "brush";
    updateToolButtons();
  });
  eraserBtn.addEventListener("click", () => {
    mode = "erase";
    updateToolButtons();
  });
  // Insert image: prompt user to select a file and draw it at 0,0
  insertImgBtn.addEventListener("click", () => {
    const inputFile = document.createElement("input");
    inputFile.type = "file";
    inputFile.accept = "image/*";
    inputFile.style.display = "none";
    document.body.append(inputFile);
    inputFile.addEventListener("change", () => {
      const file = inputFile.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, img.width, img.height);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      inputFile.remove();
    });
    inputFile.click();
  });
  let drawing = false;
  let lastX = 0;
  let lastY = 0;
  function draw(x, y) {
    if (!drawing) return;
    // Set composite mode based on tool
    ctx.globalCompositeOperation =
      mode === "erase" ? "destination-out" : "source-over";
    ctx.strokeStyle = colorInput.value;
    ctx.lineWidth = parseInt(sizeInput.value, 10);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
  }
  canvas.addEventListener("pointerdown", (e) => {
    drawing = true;
    lastX = e.offsetX;
    lastY = e.offsetY;
  });
  canvas.addEventListener("pointermove", (e) => {
    draw(e.offsetX, e.offsetY);
  });
  const stopDrawing = () => {
    drawing = false;
    ctx.globalCompositeOperation = "source-over";
  };
  canvas.addEventListener("pointerup", stopDrawing);
  canvas.addEventListener("pointerleave", stopDrawing);
  clearBtn.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
  saveBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "painting.png";
    link.click();
  });
}

/**
 * Gallery app.  Displays images selected by the user.  Users can add
 * multiple images which will be shown as thumbnails; clicking a
 * thumbnail opens the full image.  The File System Access API is
 * used when available; otherwise a file input fallback is provided.
 */
function openGallery() {
  addLog("Gallery opened");
  const container = document.createElement("div");
  container.classList.add("file-manager");
  const toolbar = document.createElement("div");
  toolbar.classList.add("file-manager-toolbar");
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add Images";
  toolbar.append(addBtn);
  const content = document.createElement("div");
  content.classList.add("file-manager-content");
  content.style.display = "flex";
  content.style.flexWrap = "wrap";
  content.style.gap = "8px";
  container.append(toolbar, content);
  windowManager.createWindow("gallery", "Gallery", container);
  function renderThumbnail(src) {
    const thumb = document.createElement("img");
    thumb.src = src;
    thumb.style.width = "80px";
    thumb.style.height = "80px";
    thumb.style.objectFit = "cover";
    thumb.style.cursor = "pointer";
    thumb.addEventListener("click", () => {
      const viewer = document.createElement("img");
      viewer.src = src;
      viewer.style.maxWidth = "100%";
      viewer.style.maxHeight = "100%";
      const viewContainer = document.createElement("div");
      viewContainer.style.display = "flex";
      viewContainer.style.justifyContent = "center";
      viewContainer.style.alignItems = "center";
      viewContainer.style.height = "100%";
      viewContainer.append(viewer);
      windowManager.createWindow("image", "Image Viewer", viewContainer);
    });
    content.append(thumb);
  }
  addBtn.addEventListener("click", async () => {
    if (window.showOpenFilePicker) {
      try {
        const handles = await window.showOpenFilePicker({
          types: [
            {
              description: "Images",
              accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".bmp"] },
            },
          ],
          multiple: true,
        });
        for (const handle of handles) {
          const file = await handle.getFile();
          const url = URL.createObjectURL(file);
          renderThumbnail(url);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = true;
      input.style.display = "none";
      document.body.append(input);
      input.addEventListener("change", () => {
        Array.from(input.files).forEach((file) => {
          const url = URL.createObjectURL(file);
          renderThumbnail(url);
        });
        input.remove();
      });
      input.click();
    }
  });
}

/**
 * Temperature conversion app.  Convert between Celsius, Fahrenheit and
 * Kelvin.  Provides an input field and dropdowns for selecting the
 * source and target units.
 */
function openTempConverter() {
  addLog("Temperature Converter opened");
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "8px";
  const input = document.createElement("input");
  input.type = "number";
  input.placeholder = "Enter value";
  const fromSel = document.createElement("select");
  const toSel = document.createElement("select");
  ["C", "F", "K"].forEach((unit) => {
    const opt1 = document.createElement("option");
    opt1.value = unit;
    opt1.textContent = unit;
    fromSel.append(opt1);
    const opt2 = document.createElement("option");
    opt2.value = unit;
    opt2.textContent = unit;
    toSel.append(opt2.cloneNode(true));
  });
  const result = document.createElement("div");
  result.style.marginTop = "4px";
  function convert() {
    const val = parseFloat(input.value);
    if (isNaN(val)) {
      result.textContent = "";
      return;
    }
    let c;
    switch (fromSel.value) {
      case "C":
        c = val;
        break;
      case "F":
        c = ((val - 32) * 5) / 9;
        break;
      case "K":
        c = val - 273.15;
        break;
    }
    let out;
    switch (toSel.value) {
      case "C":
        out = c;
        break;
      case "F":
        out = (c * 9) / 5 + 32;
        break;
      case "K":
        out = c + 273.15;
        break;
    }
    result.textContent =
      val + " " + fromSel.value + " = " + out.toFixed(2) + " " + toSel.value;
  }
  [input, fromSel, toSel].forEach((el) =>
    el.addEventListener("input", convert)
  );
  container.append(input, fromSel, toSel, result);
  windowManager.createWindow("thermometer", "Temp Converter", container);
}

/**
 * Sound Recorder app.  Records audio from the microphone using the
 * MediaRecorder API.  The user can start and stop recording, play
 * back the recording and download it as a file.
 */
function openRecorder() {
  addLog("Sound Recorder opened");
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "4px";
  const startBtn = document.createElement("button");
  startBtn.textContent = "Start Recording";
  const stopBtn = document.createElement("button");
  stopBtn.textContent = "Stop Recording";
  stopBtn.disabled = true;
  const playBtn = document.createElement("button");
  playBtn.textContent = "Play Recording";
  playBtn.disabled = true;
  const downloadBtn = document.createElement("button");
  downloadBtn.textContent = "Download Recording";
  downloadBtn.disabled = true;
  container.append(startBtn, stopBtn, playBtn, downloadBtn);
  let mediaRecorder;
  let chunks = [];
  let blobUrl = null;
  startBtn.addEventListener("click", async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();
      startBtn.disabled = true;
      stopBtn.disabled = false;
      chunks = [];
      mediaRecorder.addEventListener("dataavailable", (e) => {
        chunks.push(e.data);
      });
      mediaRecorder.addEventListener("stop", () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
        blobUrl = URL.createObjectURL(blob);
        playBtn.disabled = false;
        downloadBtn.disabled = false;
      });
    } catch (err) {
      alert("Failed to access microphone: " + err);
    }
  });
  stopBtn.addEventListener("click", () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }
  });
  playBtn.addEventListener("click", () => {
    if (blobUrl) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = blobUrl;
      addAudioElement(audio);
      audio.play();
      windowManager.createWindow("recording", "Recording", audio);
    }
  });
  downloadBtn.addEventListener("click", () => {
    if (blobUrl) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "recording.webm";
      a.click();
    }
  });
  windowManager.createWindow("recorder", "Sound Recorder", container);
}

/**
 * Sound adjustment app.  Provides a global volume slider that controls
 * all registered audio/video elements.  The volume is persisted in
 * localStorage.
 */
function openSoundAdjuster() {
  addLog("Volume control opened");
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "stretch";
  const label = document.createElement("label");
  label.textContent = "Volume:";
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "1";
  slider.step = "0.01";
  slider.value = String(globalVolume);
  slider.addEventListener("input", () => {
    setGlobalVolume(parseFloat(slider.value));
  });
  container.append(label, slider);
  windowManager.createWindow("volume", "Volume", container);
}

/**
 * Logs viewer.  Displays logs stored in localStorage.  Users can
 * select a date from a dropdown to view entries for that day.  Logs
 * are read-only; clearing is allowed via a button.
 */
function openLogs() {
  addLog("Logs opened");
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";
  const dateSelect = document.createElement("select");
  const keys = Object.keys(logsData).sort().reverse();
  keys.forEach((k) => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    dateSelect.append(opt);
  });
  const logList = document.createElement("div");
  logList.style.flex = "1";
  logList.style.overflowY = "auto";
  logList.style.border = "1px solid var(--window-border-dark)";
  logList.style.padding = "4px";
  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear Logs";
  clearBtn.addEventListener("click", () => {
    if (confirm("Clear all logs?")) {
      logsData = {};
      saveLogs();
      openLogs();
    }
  });
  function render() {
    logList.innerHTML = "";
    const selected = dateSelect.value;
    const entries = logsData[selected] || [];
    entries.forEach((entry) => {
      const p = document.createElement("div");
      p.textContent = `[${entry.time}] ${entry.message}`;
      logList.append(p);
    });
  }
  dateSelect.addEventListener("change", render);
  container.append(dateSelect, logList, clearBtn);
  windowManager.createWindow("logs", "System Logs", container);
  if (keys.length > 0) {
    dateSelect.value = keys[0];
    render();
  }
}

/**
 * Profile manager.  Allows users to manage existing profiles (rename,
 * delete, log out) and to switch between profiles.  Each profile is
 * represented by a row with actions.  Creating a new profile and
 * updating login settings are handled by the login and settings screens.
 */
function openProfileManager() {
  addLog("Profile Manager opened");
  if (!currentUser) {
    alert("No user logged in");
    return;
  }
  const container = document.createElement("div");
  container.classList.add("file-manager");
  const content = document.createElement("div");
  content.classList.add("file-manager-content");
  container.append(content);
  windowManager.createWindow("profiles", "Profiles", container);
  function render() {
    content.innerHTML = "";
    profiles.forEach((profile, idx) => {
      const row = document.createElement("div");
      row.classList.add("file-item");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "8px";
      const nameSpan = document.createElement("span");
      nameSpan.textContent = profile.name;
      const renameBtn = document.createElement("button");
      renameBtn.textContent = "Rename";
      renameBtn.addEventListener("click", () => {
        const newName = prompt("Enter new name", profile.name);
        if (newName) {
          profile.name = newName;
          saveProfiles(profiles);
          render();
        }
      });
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        if (profiles.length === 1) {
          alert("At least one profile must exist");
          return;
        }
        if (confirm("Delete this profile?")) {
          // Remove profile and if it is current user, log out
          const removingCurrent = profile.id === currentUser.id;
          profiles.splice(idx, 1);
          saveProfiles(profiles);
          if (removingCurrent) {
            currentUser = null;
            localStorage.removeItem("win95-current-user");
            showLoginScreen();
          } else {
            render();
          }
        }
      });
      const switchBtn = document.createElement("button");
      switchBtn.textContent = "Switch";
      switchBtn.disabled = profile.id === currentUser.id;
      switchBtn.addEventListener("click", () => {
        if (profile.requirePassword) {
          alert(
            "Cannot switch to a password‑protected profile. Log out and sign in instead."
          );
        } else {
          currentUser = profile;
          localStorage.setItem("win95-current-user", profile.id);
          applyUserSettings(profile);
          initDesktop();
          initContextMenu();
          windowManager.windows.forEach((w) => {
            windowManager.closeWindow(w.element.dataset.id);
          });
          addLog("Switched to profile " + profile.name);
        }
      });
      const logoutBtn = document.createElement("button");
      logoutBtn.textContent = "Log Out";
      logoutBtn.addEventListener("click", () => {
        // Remove current user marker and show login screen
        localStorage.removeItem("win95-current-user");
        currentUser = null;
        addLog("User logged out");
        showLoginScreen();
      });
      row.append(nameSpan, renameBtn, deleteBtn, switchBtn);
      if (profile.id === currentUser.id) {
        row.append(logoutBtn);
      }
      content.append(row);
    });
  }
  render();
}

// ---------------------------------------------------------------------------
// System clock on the taskbar
//
// The clock displayed in the bottom right of the taskbar is updated
// every minute.  It shows the current time in HH:MM format.  A
// separate application provides a full clock view.
const taskbarClock = document.getElementById("system-clock");
function updateTaskbarClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  taskbarClock.textContent = `${hours}:${mins}`;
}
if (taskbarClock) {
  updateTaskbarClock();
  setInterval(updateTaskbarClock, 60000);
  // Open Calendar when clicking on the system clock, similar to Windows
  taskbarClock.addEventListener("click", () => {
    openCalendar();
  });
}

/**
 * Application: Chat
 *
 * Provides a simple chat interface powered by local models via the Flask backend.
 * Users can select a model, type a message and receive a response from the model.
 * Conversations are maintained client‑side; only the latest prompt is sent to the server.
 */
function openChat() {
  addLog("Chat opened");
  const container = document.createElement("div");
  container.classList.add("chat-container");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";
  // Toolbar with model selection
  const toolbar = document.createElement("div");
  toolbar.classList.add("chat-toolbar");
  const modelLabel = document.createElement("span");
  modelLabel.textContent = "Model: ";
  const modelSelect = document.createElement("select");
  modelSelect.disabled = true;
  toolbar.append(modelLabel, modelSelect);
  // Messages area
  const msgList = document.createElement("div");
  msgList.classList.add("chat-messages");
  msgList.style.flex = "1";
  msgList.style.overflowY = "auto";
  msgList.style.padding = "4px";
  // Input form
  const form = document.createElement("form");
  form.style.display = "flex";
  form.style.gap = "4px";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type your message…";
  input.style.flex = "1";
  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/*";
  const sendBtn = document.createElement("button");
  sendBtn.type = "submit";
  sendBtn.textContent = "Send";
  form.append(input, imageInput, sendBtn);
  container.append(toolbar, msgList, form);
  windowManager.createWindow("chat", "Chat", container);
  let conversation = [];
  // Fetch list of models from the server
  async function fetchModels() {
    try {
      const res = await fetch("/api/ollama/models");
      const data = await res.json();
      modelSelect.innerHTML = "";
      const models = Array.isArray(data.models) ? data.models : [];
      if (models.length) {
        models.forEach((name) => {
          const opt = document.createElement("option");
          opt.value = name;
          opt.textContent = name;
          modelSelect.append(opt);
        });
        modelSelect.disabled = false;
      } else {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No models";
        modelSelect.append(opt);
        modelSelect.disabled = true;
        appendMessage(
          "system",
          data.error ||
            "No models detected—please install models or check Ollama's configuration"
        );
      }
    } catch (err) {
      modelSelect.innerHTML = "";
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Unavailable";
      modelSelect.append(opt);
      modelSelect.disabled = true;
      appendMessage("system", "Failed to fetch models");
    }
  }
  fetchModels();
  // Append a message to the chat log
  function appendMessage(role, text) {
    const div = document.createElement("div");
    div.classList.add("chat-message");
    div.classList.add(role);
    div.textContent = text;
    msgList.append(div);
    msgList.scrollTop = msgList.scrollHeight;
  }
  async function loadConversation() {
    if (currentUser) {
      conversation = Array.isArray(currentUser.chatHistory)
        ? [...currentUser.chatHistory]
        : [];
      try {
        const res = await fetch(
          `/api/ollama/history/${encodeURIComponent(currentUser.name)}`
        );
        const data = await res.json();
        if (Array.isArray(data.history) && data.history.length) {
          conversation = data.history;
          currentUser.chatHistory = conversation;
          saveProfiles(profiles);
        }
      } catch (err) {}
    }
    conversation.forEach((msg) => appendMessage(msg.role, msg.content));
  }
  loadConversation();
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  // Handle message submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    let imageData = null;
    if (imageInput.files[0]) {
      try {
        imageData = await fileToBase64(imageInput.files[0]);
        imageData = imageData.split(",")[1];
      } catch (err) {
        console.error(err);
      }
    }
    if (!msg && !imageData) return;
    if (msg) {
      appendMessage("user", msg);
      conversation.push({ role: "user", content: msg });
      if (currentUser) {
        currentUser.chatHistory = conversation;
        saveProfiles(profiles);
      }
      input.value = "";
    }
    // Show placeholder while waiting for response
    appendMessage("assistant", "…");
    const placeholder = msgList.lastChild;
    const selectedModel = modelSelect.value || "llama2";
    try {
      const res = await fetch("/api/ollama/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          prompt: msg,
          history: conversation,
          image: imageData,
          profile: currentUser ? currentUser.name : null,
        }),
      });
      const data = await res.json();
      placeholder.remove();
      if (data.error) {
        appendMessage("assistant", "Error: " + data.error);
      } else {
        const respText = data.response || "";
        appendMessage("assistant", respText);
        conversation.push({ role: "assistant", content: respText });
        if (currentUser) {
          currentUser.chatHistory = conversation;
          saveProfiles(profiles);
        }
      }
    } catch (err) {
      placeholder.remove();
      appendMessage("assistant", "Error contacting model");
    } finally {
      fetchModels();
    }
    imageInput.value = "";
  });
}

// ------------------------------------------------------------
// Application: Crypto Portfolio
// ------------------------------------------------------------
function openCrypto() {
  addLog("Crypto Portfolio opened");
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";

  const totalDiv = document.createElement("div");
  totalDiv.textContent = "Total: $0";
  totalDiv.style.margin = "4px";

  const list = document.createElement("div");
  list.style.flex = "1";
  list.style.overflowY = "auto";

  const btnBar = document.createElement("div");
  btnBar.style.display = "flex";
  btnBar.style.gap = "4px";
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add coin";
  const refreshBtn = document.createElement("button");
  refreshBtn.textContent = "Refresh prices";
  btnBar.append(addBtn, refreshBtn);

  container.append(totalDiv, list, btnBar);
  windowManager.createWindow("crypto", "Crypto Portfolio", container);

  const portfolio =
    currentUser && Array.isArray(currentUser.portfolio)
      ? [...currentUser.portfolio]
      : [];

  async function fetchPrices(ids) {
    if (!ids.length) return {};
    const resp = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`
    );
    return await resp.json();
  }

  async function refresh() {
    list.innerHTML = "";
    if (!portfolio.length) {
      totalDiv.textContent = "Total: $0";
      return;
    }
    try {
      const ids = portfolio.map((c) => c.id);
      const prices = await fetchPrices(ids);
      let total = 0;
      portfolio.forEach(({ id, amount }) => {
        const price = prices[id] ? prices[id].usd : 0;
        const value = price * amount;
        total += value;
        const row = document.createElement("div");
        row.textContent = `${id}: ${amount} = $${value.toFixed(2)}`;
        list.append(row);
      });
      totalDiv.textContent = "Total: $" + total.toFixed(2);
    } catch (err) {
      totalDiv.textContent = "Failed to fetch prices";
    }
  }

  addBtn.addEventListener("click", () => {
    const id = prompt("Coin ID (e.g. bitcoin):");
    if (!id) return;
    const amtStr = prompt("Amount:");
    const amount = parseFloat(amtStr);
    if (!amtStr || isNaN(amount)) return;
    const sym = id.trim().toLowerCase();
    const existing = portfolio.find((c) => c.id === sym);
    if (existing) existing.amount += amount;
    else portfolio.push({ id: sym, amount });
    if (currentUser) {
      currentUser.portfolio = portfolio;
      saveProfiles(profiles);
    }
    refresh();
  });

  refreshBtn.addEventListener("click", refresh);
  refresh();
}

// ------------------------------------------------------------
// Application: Diagnostics
// ------------------------------------------------------------
function openDiagnostics() {
  addLog("Diagnostics opened");
  const container = document.createElement("div");
  container.style.padding = "8px";
  container.textContent = "Running diagnostics...";
  windowManager.createWindow("diagnostics", "Diagnostics", container);
  fetch("/api/diagnostics/run")
    .then((r) => r.json())
    .then((data) => {
      container.innerHTML = "";
      if (data.issues && data.issues.length) {
        const list = document.createElement("ul");
        data.issues.forEach((iss) => {
          const li = document.createElement("li");
          li.textContent = iss;
          list.append(li);
        });
        container.append("Issues detected:", list);
      } else {
        container.textContent = "All checks passed";
      }
    })
    .catch((err) => {
      container.textContent = "Diagnostics failed: " + err;
    });
}

/**
 * Sheets app. Provides a simple spreadsheet editor supporting CSV import
 * and export. Users can add/remove rows and columns, edit cell values,
 * and save the current sheet as a CSV file.  This is a lightweight
 * implementation intended to mimic the basics of Google Sheets or Excel
 * without external dependencies.
 */
function openSheets(fileData) {
  addLog("Sheets opened");
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";
  // Tabs bar for multiple sheets
  const tabsBar = document.createElement("div");
  tabsBar.style.display = "flex";
  tabsBar.style.gap = "4px";
  tabsBar.style.padding = "2px";
  tabsBar.style.background = "var(--taskbar-bg)";
  // Sheets data structure: array of { name, data }
  let sheets = [];
  // Helper to create a new blank sheet
  function createSheet(name) {
    const initial = [];
    for (let r = 0; r < 5; r++) {
      const row = [];
      for (let c = 0; c < 5; c++) row.push("");
      initial.push(row);
    }
    return { name: name || `Sheet${sheets.length + 1}`, data: initial };
  }
  // Load from profile if available and no file data provided
  if (!fileData && currentUser && Array.isArray(currentUser.sheets)) {
    sheets = currentUser.sheets.map((s) => ({
      name: s.name,
      data: s.data.map((row) => row.slice()),
    }));
  }
  // Populate from provided file data if any
  if (fileData) {
    try {
      if (fileData.type === "csv") {
        sheets.push({
          name: fileData.name || "Sheet1",
          data: parseCSV(fileData.content),
        });
      } else if (fileData.type === "xlsx" && typeof XLSX !== "undefined") {
        const wb = XLSX.read(fileData.content, { type: "array" });
        wb.SheetNames.forEach((n) => {
          const ws = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 });
          sheets.push({ name: n, data: ws });
        });
      }
    } catch (err) {
      console.error(err);
    }
  }
  if (sheets.length === 0) sheets.push(createSheet("Sheet1"));
  let currentSheetIndex = 0;
  function persist() {
    if (currentUser) {
      currentUser.sheets = sheets;
      saveProfiles(profiles);
    }
  }
  persist();
  // Toolbar with actions
  const toolbar = document.createElement("div");
  toolbar.style.display = "flex";
  toolbar.style.gap = "4px";
  toolbar.style.flexWrap = "wrap";
  toolbar.style.padding = "2px";
  const openBtn = document.createElement("button");
  openBtn.textContent = "Open";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  const addRowBtn = document.createElement("button");
  addRowBtn.textContent = "Add Row";
  const addColBtn = document.createElement("button");
  addColBtn.textContent = "Add Column";
  const addSheetBtn = document.createElement("button");
  addSheetBtn.textContent = "Add Sheet";
  toolbar.append(openBtn, saveBtn, addRowBtn, addColBtn, addSheetBtn);
  container.append(tabsBar, toolbar);
  // Table container
  const tableWrapper = document.createElement("div");
  tableWrapper.style.flex = "1";
  tableWrapper.style.overflow = "auto";
  tableWrapper.style.border = "1px solid var(--window-border-dark)";
  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  tableWrapper.append(table);
  container.append(tableWrapper);
  // Render tabs
  function renderTabs() {
    tabsBar.innerHTML = "";
    sheets.forEach((sheet, idx) => {
      const tab = document.createElement("div");
      tab.classList.add("sheet-tab");
      tab.draggable = true;
      const btn = document.createElement("button");
      btn.textContent = sheet.name;
      btn.style.padding = "2px 6px";
      btn.style.background =
        idx === currentSheetIndex ? "var(--selection-bg)" : "var(--button-bg)";
      btn.style.color =
        idx === currentSheetIndex ? "var(--window-bg)" : "inherit";
      btn.style.borderTop = `2px solid var(--btn-border-light)`;
      btn.style.borderLeft = `2px solid var(--btn-border-light)`;
      btn.style.borderRight = `2px solid var(--btn-border-dark)`;
      btn.style.borderBottom = `2px solid var(--btn-border-dark)`;
      btn.addEventListener("click", () => {
        currentSheetIndex = idx;
        renderTabs();
        renderTable();
      });
      // Double click to rename
      btn.addEventListener("dblclick", () => {
        const newName = prompt("Rename sheet", sheet.name);
        if (newName) {
          sheet.name = newName;
          renderTabs();
          persist();
        }
      });
      const close = document.createElement("span");
      close.textContent = "×";
      close.style.marginLeft = "4px";
      close.style.cursor = "pointer";
      close.addEventListener("click", (e) => {
        e.stopPropagation();
        sheets.splice(idx, 1);
        if (currentSheetIndex >= sheets.length)
          currentSheetIndex = sheets.length - 1;
        if (currentSheetIndex < 0) currentSheetIndex = 0;
        renderTabs();
        renderTable();
        persist();
      });
      tab.append(btn, close);
      tab.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", idx);
      });
      tab.addEventListener("dragover", (e) => e.preventDefault());
      tab.addEventListener("drop", (e) => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
        if (from === idx) return;
        const item = sheets.splice(from, 1)[0];
        sheets.splice(idx, 0, item);
        currentSheetIndex = idx;
        renderTabs();
        renderTable();
        persist();
      });
      tabsBar.append(tab);
    });
  }
  // Get current sheet data
  function currentData() {
    return sheets[currentSheetIndex].data;
  }
  function setCurrentData(newData) {
    sheets[currentSheetIndex].data = newData;
    persist();
  }
  // Render the table based on current sheet
  function renderTable() {
    const data = currentData();
    table.innerHTML = "";
    const headerRow = document.createElement("tr");
    const corner = document.createElement("th");
    corner.style.border = "1px solid var(--window-border-dark)";
    corner.style.background = getComputedStyle(
      document.documentElement
    ).getPropertyValue("--window-bg");
    corner.textContent = "";
    headerRow.append(corner);
    for (let c = 0; c < data[0].length; c++) {
      const th = document.createElement("th");
      th.textContent = String.fromCharCode(65 + c);
      th.style.border = "1px solid var(--window-border-dark)";
      th.style.background = "var(--taskbar-bg)";
      th.style.padding = "2px 4px";
      headerRow.append(th);
    }
    table.append(headerRow);
    for (let r = 0; r < data.length; r++) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.textContent = r + 1;
      th.style.border = "1px solid var(--window-border-dark)";
      th.style.background = "var(--taskbar-bg)";
      th.style.padding = "2px 4px";
      tr.append(th);
      for (let c = 0; c < data[r].length; c++) {
        const td = document.createElement("td");
        td.style.border = "1px solid var(--window-border-dark)";
        td.style.minWidth = "80px";
        td.style.height = "24px";
        td.style.padding = "2px";
        const input = document.createElement("input");
        input.type = "text";
        input.value = data[r][c];
        input.style.width = "100%";
        input.style.height = "100%";
        input.style.border = "none";
        input.style.background = "transparent";
        input.style.fontFamily = "inherit";
        input.style.fontSize = "14px";
        input.addEventListener("input", () => {
          data[r][c] = input.value;
          persist();
        });
        td.append(input);
        tr.append(td);
      }
      table.append(tr);
    }
  }
  // Row/column operations on current sheet
  addRowBtn.addEventListener("click", () => {
    const data = currentData();
    const cols = data[0].length;
    const newRow = new Array(cols).fill("");
    data.push(newRow);
    renderTable();
    persist();
  });
  addColBtn.addEventListener("click", () => {
    const data = currentData();
    data.forEach((row) => row.push(""));
    renderTable();
    persist();
  });
  addSheetBtn.addEventListener("click", () => {
    sheets.push(createSheet());
    currentSheetIndex = sheets.length - 1;
    renderTabs();
    renderTable();
    persist();
  });
  // CSV helpers
  function parseCSV(text) {
    const rows = [];
    let row = [],
      cur = "",
      inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            cur += '"';
            i++;
          } else inQuotes = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ",") {
          row.push(cur);
          cur = "";
        } else if (ch === "\n") {
          row.push(cur);
          rows.push(row);
          row = [];
          cur = "";
        } else if (ch === "\r") {
          /* skip */
        } else cur += ch;
      }
    }
    row.push(cur);
    rows.push(row);
    const max = Math.max(...rows.map((r) => r.length));
    rows.forEach((r) => {
      while (r.length < max) r.push("");
    });
    return rows;
  }

  function sheetToCSV(data) {
    return data
      .map((row) =>
        row
          .map((cell) => {
            if (/[",\n]/.test(cell))
              return '"' + cell.replace(/"/g, '""') + '"';
            return cell;
          })
          .join(",")
      )
      .join("\n");
  }

  openBtn.addEventListener("click", async () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv,.xlsx";
      input.style.display = "none";
      document.body.append(input);
      input.addEventListener("change", async () => {
        const file = input.files[0];
        if (!file) return;
        if (file.name.endsWith(".xlsx") && typeof XLSX !== "undefined") {
          const buf = await file.arrayBuffer();
          const wb = XLSX.read(buf, { type: "array" });
          sheets = wb.SheetNames.map((n) => ({
            name: n,
            data: XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 }),
          }));
          currentSheetIndex = 0;
          persist();
        } else {
          const text = await file.text();
          setCurrentData(parseCSV(text));
        }
        renderTabs();
        renderTable();
        input.remove();
      });
      input.click();
    } catch (err) {
      console.error(err);
    }
  });

  saveBtn.addEventListener("click", async () => {
    try {
      const opts = {
        types: [
          {
            description: "Excel",
            accept: {
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                [".xlsx"],
            },
          },
          { description: "CSV", accept: { "text/csv": [".csv"] } },
          { description: "ZIP", accept: { "application/zip": [".zip"] } },
        ],
        suggestedName: sheets[currentSheetIndex].name,
      };
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker(opts);
        const writable = await handle.createWritable();
        if (handle.name.endsWith(".xlsx") && typeof XLSX !== "undefined") {
          const wb = XLSX.utils.book_new();
          sheets.forEach((s) => {
            const ws = XLSX.utils.aoa_to_sheet(s.data);
            XLSX.utils.book_append_sheet(wb, ws, s.name);
          });
          const array = XLSX.write(wb, { bookType: "xlsx", type: "array" });
          await writable.write(array);
        } else if (handle.name.endsWith(".zip") && typeof JSZip !== "undefined") {
          const zip = new JSZip();
          sheets.forEach((s) => {
            zip.file(s.name + ".csv", sheetToCSV(s.data));
          });
          const blob = await zip.generateAsync({ type: "blob" });
          await writable.write(blob);
        } else {
          const csv = sheetToCSV(currentData());
          await writable.write(csv);
        }
        await writable.close();
      } else {
        if (sheets.length > 1 && typeof JSZip !== "undefined") {
          const zip = new JSZip();
          sheets.forEach((s) => {
            zip.file(s.name + ".csv", sheetToCSV(s.data));
          });
          const blob = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "workbook.zip";
          document.body.append(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } else {
          const csv = sheetToCSV(currentData());
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = sheets[currentSheetIndex].name + ".csv";
          document.body.append(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      console.error(err);
    }
  });
  // Create window
  const winId = windowManager.createWindow("sheets", "Sheets", container);
  // Redraw the grid when the window is resized so it fills the content area
  const winEl = windowManager.windows.get(winId).element;
  winEl.addEventListener("resized", () => setTimeout(renderTable, 0));
  // Initial render
  renderTabs();
  renderTable();
}
