import { loadApps } from "./core/appRegistry.js";
import { renderDesktopIcons } from "./core/desktop.js";
import { buildStartMenu, wireStartToggle } from "./core/startMenu.js";
import { registerTray } from "./core/tray.js";
import { Launcher } from "./core/launcher.js";

export function bootstrap(){
  const ctx = {};
  const launcher = new Launcher(ctx);
  const apps = loadApps();
  renderDesktopIcons(launcher);
  buildStartMenu(apps, launcher);
  wireStartToggle();
  registerTray(launcher);
  return { ctx, launcher };
}

document.addEventListener("DOMContentLoaded", () => bootstrap());
