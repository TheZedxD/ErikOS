import { WindowManager } from "./windowManager.js";

export class Launcher {
  constructor(ctx, registry) {
    this.ctx = ctx;
    this.registry = registry;
    this.wm = ctx.windowManager || new WindowManager();
    this.ctx.windowManager = this.wm;
  }

  async launch(id) {
    const app = this.registry.find((a) => a.id === id);
    if (!app || app.comingSoon) {
      console.warn("Unknown app", id);
      return;
    }
    try {
      const mod = await import(`../apps/${id}.js`);
      if (typeof mod.launch === "function") {
        mod.launch(this.ctx);
        return;
      }
      const meta = mod.meta || {
        id: app.id,
        name: app.title,
        icon: app.icon,
      };
      if (typeof mod.mount === "function") {
        const content = document.createElement("div");
        const winId = this.wm.createWindow(meta.id, meta.name, content);
        const winInfo = this.wm.windows.get(winId);
        mod.mount(winInfo?.element || content, this.ctx);
      } else if (typeof mod.default === "function") {
        mod.default(this.ctx);
      } else {
        console.warn(`App ${id} has no entry point`);
      }
    } catch (err) {
      console.error("Failed to launch", id, err);
    }
  }
}
