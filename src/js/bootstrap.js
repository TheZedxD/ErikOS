import { loadApps } from "./core/appRegistry.js";
import { renderDesktopIcons } from "./core/desktop.js";
import { buildStartMenu, wireStartToggle } from "./core/startMenu.js";
import { registerTray } from "./core/tray.js";
import { Launcher } from "./core/launcher.js";

function overlay(msg) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.position = "fixed";
  el.style.top = "0";
  el.style.left = "0";
  el.style.right = "0";
  el.style.background = "rgba(0,0,0,0.8)";
  el.style.color = "#fff";
  el.style.padding = "6px";
  el.style.fontFamily = "sans-serif";
  el.style.fontSize = "14px";
  el.style.textAlign = "center";
  el.style.zIndex = "10000";
  document.body.appendChild(el);
}

window.addEventListener("error", (e) => {
  console.error("Uncaught error:", e.error || e.message);
  overlay(`Error: ${e.message}`);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled rejection:", e.reason);
  overlay(`Unhandled: ${e.reason}`);
});

export function bootstrap(){
  const ctx = {};
  console.time("registry");
  const apps = loadApps();
  console.timeEnd("registry");

  const launcher = new Launcher(ctx, apps);

  console.time("desktop");
  renderDesktopIcons(apps, launcher);
  console.timeEnd("desktop");

  console.time("start");
  buildStartMenu(apps, launcher);
  wireStartToggle(launcher, apps);
  console.timeEnd("start");

  console.time("tray");
  registerTray(launcher);
  console.timeEnd("tray");
  return { ctx, launcher };
}

document.addEventListener("DOMContentLoaded", () => {
  bootstrap();
  setTimeout(() => {
    if (document.querySelectorAll("#desktop .icon").length === 0) {
      overlay("Bootstrap stalled — check IDs, assets, registry.");
    }
  }, 3000);
});
