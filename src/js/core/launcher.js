import { WindowManager } from "./windowManager.js";
import { logger as defaultLogger } from "../utils/logger.js";

export class Launcher {
  constructor(ctx, registry) {
    this.ctx = ctx;
    this.registry = registry;
    this.wm = ctx.windowManager || new WindowManager();
    this.ctx.windowManager = this.wm;
    this.logger = this.ctx.logger || defaultLogger;
    this.ctx.logger = this.logger;
  }

  async launch(id) {
    const app = this.registry.find((a) => a.id === id);
    if (!app || app.comingSoon) {
      console.warn("Unknown app", id);
      return;
    }
    let mod;
    try {
      mod = await import(`../apps/${id}.js`);
    } catch (error) {
      const meta = {
        id: app.id,
        name: app.title,
        icon: app.icon,
      };
      this._renderError(meta, error);
      return;
    }

    const meta = {
      id: mod.meta?.id || app.id,
      name: mod.meta?.name || app.title,
      icon: mod.meta?.icon || app.icon,
    };

    if (typeof mod.launch === "function") {
      try {
        await Promise.resolve(mod.launch(this.ctx));
      } catch (error) {
        this._renderError(meta, error);
      }
      return;
    }

    if (typeof mod.mount === "function") {
      const content = document.createElement("div");
      let winId;
      let winInfo;
      try {
        winId = this.wm.createWindow(meta.id, meta.name, content);
        winInfo = this.wm.windows.get(winId);
        await Promise.resolve(mod.mount(winInfo?.element || content, this.ctx));
      } catch (error) {
        if (!winInfo && winId) {
          winInfo = this.wm.windows.get(winId);
        }
        this._renderError(meta, error, winInfo);
      }
      return;
    }

    if (typeof mod.default === "function") {
      try {
        await Promise.resolve(mod.default(this.ctx));
      } catch (error) {
        this._renderError(meta, error);
      }
      return;
    }

    console.warn(`App ${id} has no entry point`);
  }

  _renderError(meta, error, winInfo) {
    const message = error?.message || String(error);
    const stack = error?.stack || (error ? String(error) : "");
    this.logger.error({ app: meta.id, message, stack });

    const panel = document.createElement("div");
    panel.className = "app-error-panel";
    panel.style.padding = "16px";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.gap = "12px";

    const title = document.createElement("h2");
    title.textContent = `${meta.name} ran into a problem`;
    title.style.margin = "0";
    panel.append(title);

    const summary = document.createElement("p");
    summary.textContent = message;
    summary.style.margin = "0";
    summary.style.fontWeight = "600";
    panel.append(summary);

    const pre = document.createElement("pre");
    pre.textContent = stack;
    pre.style.whiteSpace = "pre-wrap";
    pre.style.background = "var(--window-border-dark, #1b1b1b)";
    pre.style.color = "inherit";
    pre.style.padding = "8px";
    pre.style.borderRadius = "4px";
    pre.style.maxHeight = "200px";
    pre.style.overflow = "auto";
    panel.append(pre);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy logs";
    copyBtn.addEventListener("click", async () => {
      const payload = this.logger.formatRecentErrors(50) || `${message}\n${stack}`;
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(payload);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = payload;
          textarea.setAttribute("readonly", "true");
          textarea.style.position = "absolute";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          textarea.remove();
        }
        copyBtn.textContent = "Copied";
        setTimeout(() => {
          copyBtn.textContent = "Copy logs";
        }, 2000);
      } catch (_) {
        copyBtn.textContent = "Copy failed";
        setTimeout(() => {
          copyBtn.textContent = "Copy logs";
        }, 2000);
      }
    });
    actions.append(copyBtn);

    const reopenBtn = document.createElement("button");
    reopenBtn.textContent = "Reopen";
    let targetId = winInfo?.id;
    reopenBtn.addEventListener("click", () => {
      if (targetId) {
        this.wm.closeWindow(targetId);
      }
      this.launch(meta.id);
    });
    actions.append(reopenBtn);

    panel.append(actions);

    if (!winInfo) {
      const container = document.createElement("div");
      const winId = this.wm.createWindow(meta.id, `${meta.name} (error)`, container);
      winInfo = this.wm.windows.get(winId);
      targetId = winInfo?.id || winId;
    }

    if (winInfo?.body) {
      winInfo.body.innerHTML = "";
      winInfo.body.append(panel);
    } else if (winInfo?.element) {
      const content = winInfo.element.querySelector(".content");
      if (content) {
        content.innerHTML = "";
        content.append(panel);
      }
    }
  }
}
