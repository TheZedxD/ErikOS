import { WindowManager } from "./windowManager.js";

export class Launcher{
  constructor(ctx, apps){
    this.ctx = ctx;
    this.apps = apps;
    this.wm = new WindowManager();
    ctx.windowManager = this.wm;
  }
  async launch(id){
    const app = this.apps.find(a => a.id === id);
    if(!app){
      return console.warn("Unknown app", id);
    }
    try{
      const mod = await import(app.entry);
      const meta = mod.meta || { id: app.id, name: app.title, icon: app.icon };
      const win = this.wm.open(meta);
      mod.mount?.(win.body, this.ctx);
      mod.launch?.(this.ctx, win);
    }catch(err){
      console.error('Failed to launch', id, err);
    }
  }
}
