import { ASSET_BASE } from "../../config.js";

export function filterApps(apps, query = "") {
  const q = query.toLowerCase();
  return apps.filter((a) => a.title.toLowerCase().includes(q));
}

function trackRecent(id) {
  try {
    const data = JSON.parse(localStorage.getItem("recent-apps") || "[]");
    const idx = data.indexOf(id);
    if (idx !== -1) data.splice(idx, 1);
    data.unshift(id);
    localStorage.setItem("recent-apps", JSON.stringify(data.slice(0, 5)));
  } catch (_) {
    /* ignore */
  }
}

function renderRecent(apps, launcher) {
  const ul = document.getElementById("start-recent-list");
  if (!ul) return;
  ul.innerHTML = "";
  let ids = [];
  try {
    ids = JSON.parse(localStorage.getItem("recent-apps") || "[]");
  } catch (_) {
    /* ignore */
  }
  for (const id of ids) {
    const app = apps.find((a) => a.id === id);
    if (!app) continue;
    const li = document.createElement("li");
    li.innerHTML = `<img alt=""><span></span>`;
    li.querySelector("img").src = app.icon.startsWith("http")
      ? app.icon
      : `${ASSET_BASE}/${app.icon.replace(/^\//, "")}`;
    li.querySelector("span").textContent = app.title;
    li.tabIndex = 0;
    li.addEventListener("click", () => launcher.launch(app.id));
    ul.appendChild(li);
  }
}

export function buildStartMenu(apps, launcher, query = "") {
  const ul = document.getElementById("start-app-list");
  if (!ul) return;
  ul.innerHTML = "";
  for (const a of filterApps(apps, query)) {
    const li = document.createElement("li");
    li.innerHTML = `<img alt=""><span></span>`;
    li.querySelector("img").src = a.icon.startsWith("http")
      ? a.icon
      : `${ASSET_BASE}/${a.icon.replace(/^\//, "")}`;
    li.querySelector("span").textContent = a.title;
    if (!a.comingSoon) {
      li.tabIndex = 0;
      li.addEventListener("click", () => {
        launcher.launch(a.id);
        trackRecent(a.id);
        renderRecent(apps, launcher);
      });
    } else {
      li.classList.add("coming-soon");
    }
    ul.appendChild(li);
  }
  renderRecent(apps, launcher);
}

export function wireStartToggle(launcher, apps = []) {
  const btn = document.getElementById("start-button");
  const menu = document.getElementById("start-menu");
  const search = document.getElementById("start-search");
  const user = document.getElementById("start-user");
  const shutdown = document.getElementById("start-shutdown");
  const logout = document.getElementById("start-logout");
  if (user && window.currentUser) user.textContent = window.currentUser.name || "";
  if (shutdown) shutdown.addEventListener("click", () => window.dispatchEvent(new CustomEvent("shutdown")));
  if (logout) logout.addEventListener("click", () => window.dispatchEvent(new CustomEvent("logout")));
  if (!btn || !menu) return;
  menu.setAttribute("role", "menu");
  const open = () => {
    menu.hidden = false;
    search?.focus();
  };
  const close = () => {
    menu.hidden = true;
  };
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.hidden ? open() : close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Meta" && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      menu.hidden ? open() : close();
    }
    if (e.ctrlKey && e.code === "Space") {
      e.preventDefault();
      open();
    }
    if (e.ctrlKey && e.shiftKey && e.key === "S") {
      e.preventDefault();
      launcher.launch("recorder");
    }
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && e.target !== btn) close();
  });
  menu.addEventListener("keydown", (e) => {
    const items = Array.from(menu.querySelectorAll("li:not(.coming-soon)"));
    let idx = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      idx = (idx + 1) % items.length;
      items[idx].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      idx = (idx - 1 + items.length) % items.length;
      items[idx].focus();
    }
  });
  search?.addEventListener("input", () => buildStartMenu(apps, launcher, search.value));
}
