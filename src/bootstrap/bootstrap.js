import { apps as appModules } from "../js/apps/index.js";
import { renderDesktopIcons } from "../js/core/desktop.js";
import { registerTray } from "../js/core/tray.js";
import { wireTaskbarButtons } from "../js/core/taskbar.js";
import { buildStartMenu, wireStartToggle } from "../js/core/startMenu.js";
import { Launcher } from "../js/core/launcher.js";
import { WindowManager } from "../js/core/windowManager.js";

function buildRegistry(mods) {
  return mods.map((m) => ({
    id: m.meta.id,
    title: m.meta.name,
    icon: m.meta.icon,
    comingSoon: !!m.meta.comingSoon,
  }));
}

async function main() {
  const ctx = { profileId: localStorage.getItem("profileId") || "default" };
  const wm = new WindowManager();
  ctx.windowManager = wm;

  const registry = buildRegistry(appModules);
  const launcher = new Launcher(ctx, registry);

  renderDesktopIcons(registry, launcher, ctx.profileId);
  registerTray(launcher);
  wireTaskbarButtons();
  buildStartMenu(registry, launcher);
  wireStartToggle();

  window.__BOOT_OK__ = true;
}

main();

