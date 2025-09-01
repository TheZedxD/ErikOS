import { getAppById } from "./appRegistry.js";
import { WindowManager } from "./windowManager.js";

export class Launcher{
  constructor(ctx){
    this.ctx = ctx;
    this.wm = new WindowManager();
    ctx.windowManager = this.wm;
  }
  launch(id){
    const app = getAppById(id);
    if(!app){
      return console.warn("Unknown app", id);
    }
    const win = this.wm.open(app.meta);
    app.mount?.(win.body, this.ctx);
    app.launch?.(this.ctx, win);
  }
}
