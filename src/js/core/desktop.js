import { ASSET_BASE } from "../../config.js";

const GRID_SIZE = 88;
const snap = (v) => Math.round(v / GRID_SIZE) * GRID_SIZE;
const resolveIcon = (icon) =>
  icon.startsWith("http") || icon.startsWith("/")
    ? icon
    : `${ASSET_BASE}/${icon}`;

let menuEl = null;
let keyBound = false;
function getMenu() {
  if (!menuEl) {
    menuEl = document.createElement("ul");
    menuEl.id = "context-menu";
    document.body.appendChild(menuEl);
    const hide = () => (menuEl.style.display = "none");
    document.addEventListener("click", hide);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hide();
    });
  }
  return menuEl;
}
function hideMenu() {
  if (menuEl) menuEl.style.display = "none";
}
function showMenu(x, y, items) {
  const menu = getMenu();
  menu.innerHTML = "";
  items.forEach(({ label, action }) => {
    const li = document.createElement("li");
    li.textContent = label;
    li.addEventListener(
      "click",
      () => {
        hideMenu();
        action();
      },
      { once: true },
    );
    menu.appendChild(li);
  });
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.display = "block";
}

export function renderDesktopIcons(apps, launcher, profileId = "default") {
  const root = document.getElementById("desktop");
  if (!root) return;

  const storageKey = `desktop:positions:${profileId}`;
  const nameKey = `desktop:names:${profileId}`;
  const layoutKey = `desktop:layout:${profileId}`;

  const positions = JSON.parse(localStorage.getItem(storageKey) || "{}");
  const names = JSON.parse(localStorage.getItem(nameKey) || "{}");
  const layout = localStorage.getItem(layoutKey) || "grid";

  root.dataset.layout = layout;
  root.innerHTML = "";

  const occupied = new Set();
  const cols = Math.floor(root.clientWidth / GRID_SIZE);
  const rows = Math.floor(root.clientHeight / GRID_SIZE);

  const findFree = () => {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const pos = { x: x * GRID_SIZE, y: y * GRID_SIZE };
        const k = `${pos.x},${pos.y}`;
        if (!occupied.has(k)) return pos;
      }
    }
    return { x: 0, y: 0 };
  };

  const place = (id) => {
    let pos = positions[id];
    if (pos) {
      if (layout === "grid") pos = { x: snap(pos.x), y: snap(pos.y) };
      const k = `${pos.x},${pos.y}`;
      if (!occupied.has(k)) {
        occupied.add(k);
        return pos;
      }
    }
    const free = findFree();
    occupied.add(`${free.x},${free.y}`);
    positions[id] = free;
    return free;
  };

  const clearSelection = () => {
    root.querySelectorAll(".desktop-icon.selected").forEach((i) =>
      i.classList.remove("selected"),
    );
  };
  const selectIcon = (el) => {
    clearSelection();
    el.classList.add("selected");
  };

  const startRename = (el, id) => {
    const label = el.querySelector(".label");
    const input = document.createElement("input");
    input.type = "text";
    input.value = label.textContent;
    input.style.width = "86px";
    label.replaceWith(input);
    input.focus();
    input.select();
    const finish = (commit) => {
      const val = commit ? input.value.trim() || input.value : label.textContent;
      label.textContent = val;
      input.replaceWith(label);
      names[id] = val;
      localStorage.setItem(nameKey, JSON.stringify(names));
    };
    input.addEventListener("blur", () => finish(true), { once: true });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish(true);
      else if (e.key === "Escape") finish(false);
    });
  };

  for (const a of apps) {
    const el = document.createElement("div");
    el.className = "desktop-icon";
    el.dataset.appId = a.id;
    el.innerHTML = `<img alt=""><span class="label"></span>`;
    const img = el.querySelector("img");
    img.src = resolveIcon(a.icon);
    el.querySelector(".label").textContent = names[a.id] || a.title;
    el.addEventListener("dblclick", () => launcher.launch(a.id));

    const pos = place(a.id);
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;

    el.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || e.target.tagName === "INPUT") return;
      e.preventDefault();
      selectIcon(el);
      const startX = e.clientX;
      const startY = e.clientY;
      const rect = el.getBoundingClientRect();
      const offX = startX - rect.left;
      const offY = startY - rect.top;
      el.classList.add("dragging");
      const move = (ev) => {
        el.style.left = `${ev.clientX - offX}px`;
        el.style.top = `${ev.clientY - offY}px`;
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        el.classList.remove("dragging");
        let x = parseInt(el.style.left, 10);
        let y = parseInt(el.style.top, 10);
        if (layout === "grid") {
          x = snap(x);
          y = snap(y);
        }
        for (const [id, pos] of Object.entries(positions)) {
          if (id !== a.id && pos.x === x && pos.y === y) {
            const free = findFree();
            x = free.x;
            y = free.y;
            break;
          }
        }
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        positions[a.id] = { x, y };
        occupied.clear();
        Object.values(positions).forEach((p) =>
          occupied.add(`${p.x},${p.y}`),
        );
        localStorage.setItem(storageKey, JSON.stringify(positions));
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });

    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      selectIcon(el);
      showMenu(e.clientX, e.clientY, [
        { label: "Open", action: () => launcher.launch(a.id) },
        { label: "Rename", action: () => startRename(el, a.id) },
      ]);
    });

    root.appendChild(el);
  }

  root.onmousedown = (e) => {
    if (e.target === root) clearSelection();
  };

  root.oncontextmenu = (e) => {
    if (e.target !== root) return;
    e.preventDefault();
    const items = [
      { label: "New Folder", action: () => alert("Coming soon") },
      {
        label:
          layout === "grid" ? "Change Layout: Free" : "Change Layout: Grid",
        action: () => {
          const newLayout = layout === "grid" ? "free" : "grid";
          root.dataset.layout = newLayout;
          localStorage.setItem(layoutKey, newLayout);
          if (newLayout === "grid") {
            Object.values(positions).forEach((p) => {
              p.x = snap(p.x);
              p.y = snap(p.y);
            });
            localStorage.setItem(storageKey, JSON.stringify(positions));
          }
          renderDesktopIcons(apps, launcher, profileId);
        },
      },
      { label: "Settings", action: () => launcher.launch("settings") },
      {
        label: "Refresh",
        action: () => renderDesktopIcons(apps, launcher, profileId),
      },
    ];
    showMenu(e.clientX, e.clientY, items);
  };

  if (!keyBound) {
    window.addEventListener("keydown", (e) => {
      if (e.key === "F2") {
        const sel = root.querySelector(".desktop-icon.selected");
        if (sel) {
          e.preventDefault();
          startRename(sel, sel.dataset.appId);
        }
      }
      if ((e.key === "d" || e.key === "D") && e.metaKey) {
        e.preventDefault();
        window.showDesktop?.();
      }
    });
    keyBound = true;
  }

  if (!window.showDesktop) {
    window.showDesktop = () => {
      const wm = launcher.wm;
      const anyVisible = Array.from(wm.windows.values()).some(
        (w) => !w.minimized,
      );
      wm.windows.forEach((w) => {
        if (anyVisible) wm.minimizeWindow(w.id);
        else wm.restoreWindow(w.id);
      });
    };
  }

  localStorage.setItem(storageKey, JSON.stringify(positions));
  localStorage.setItem(nameKey, JSON.stringify(names));
}

