import { apps as appModules } from "../js/apps/index.js";
import { renderDesktopIcons } from "../js/core/desktop.js";
import { registerTray } from "../js/core/tray.js";
import { wireTaskbarButtons } from "../js/core/taskbar.js";
import { buildStartMenu, wireStartToggle } from "../js/core/startMenu.js";
import { Launcher } from "../js/core/launcher.js";
import { WindowManager } from "../js/core/windowManager.js";
import { logger } from "../js/utils/logger.js";
import {
  getGlobalVolume,
  setGlobalVolume,
  registerAudio,
  onVolumeChange,
} from "../js/utils/audioBus.js";

function buildGlobals() {
  const g = {};
  if (typeof window === "undefined") {
    Object.defineProperty(g, "globalVolume", {
      get: () => getGlobalVolume(),
      set: (value) => setGlobalVolume(value),
      configurable: true,
    });
    g.registerAudio = registerAudio;
    g.addAudioElement = registerAudio;
    g.setGlobalVolume = (value) => setGlobalVolume(value);
    g.onGlobalVolumeChange = onVolumeChange;
    return g;
  }
  Object.defineProperties(g, {
    currentUser: {
      get: () => window.currentUser,
      set: (value) => {
        window.currentUser = value;
      },
      configurable: true,
    },
    profiles: {
      get: () => window.profiles,
      set: (value) => {
        window.profiles = value;
      },
      configurable: true,
    },
    logsData: {
      get: () => window.logsData,
      set: (value) => {
        window.logsData = value;
      },
      configurable: true,
    },
    globalVolume: {
      get: () => getGlobalVolume(),
      set: (value) => {
        setGlobalVolume(value);
      },
      configurable: true,
    },
  });

  g.saveProfiles = window.saveProfiles;
  g.setTheme = window.setTheme;
  g.applyUserSettings = window.applyUserSettings;
  g.initContextMenu = window.initContextMenu;
  g.initDesktop = window.initDesktop;
  g.addLog = window.addLog;
  g.saveLogs = window.saveLogs;
  g.showLoginScreen = window.showLoginScreen;
  g.logoutUser = window.logoutUser;
  g.showToast = window.showToast;
  g.applyChatColors = window.applyChatColors;
  g.registerAudio = registerAudio;
  g.addAudioElement = registerAudio;
  g.setGlobalVolume = (value) => {
    setGlobalVolume(value);
  };
  g.onGlobalVolumeChange = onVolumeChange;
  return g;
}

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
  ctx.logger = logger;
  const wm = new WindowManager();
  ctx.windowManager = wm;
  ctx.globals = buildGlobals();

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

