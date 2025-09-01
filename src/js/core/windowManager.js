export class WindowManager{
  constructor(){
    this.root = document.getElementById("windows-root");
    this.taskbar = document.getElementById("taskbar-windows");
    this.z = 1;
    this.count = 0;
    this.windows = new Map();
    this.active = null;
  }

  open(meta){
    const id = `${meta.id||"win"}-${++this.count}`;
    const win = document.createElement("div");
    win.className = "window";
    win.dataset.id = id;
    win.style.zIndex = this.z++;
    win.style.position = "absolute";
    win.style.left = `${50 + this.count*20}px`;
    win.style.top = `${50 + this.count*20}px`;

    const header = document.createElement("div");
    header.className = "window-header";
    header.innerHTML = `<span class="title">${meta.name||meta.title||id}</span>`+
      `<div class="window-controls"><button data-act="min">_</button><button data-act="close">×</button></div>`;
    const body = document.createElement("div");
    body.className = "window-body";
    const resizer = document.createElement("div");
    resizer.className = "window-resizer";

    win.append(header, body, resizer);
    this.root?.appendChild(win);

    const info = { id, el: win, body, header, resizer, taskBtn: null, minimized:false };
    this.windows.set(id, info);

    this._wireDrag(info);
    this._wireResize(info);

    header.addEventListener("click",()=>this.focus(id));
    header.querySelector("[data-act=min]")?.addEventListener("click",e=>{e.stopPropagation();this.minimize(id);});
    header.querySelector("[data-act=close]")?.addEventListener("click",e=>{e.stopPropagation();this.close(id);});
    win.addEventListener("mousedown",()=>this.focus(id));

    // taskbar button
    const btn=document.createElement("button");
    btn.className="task-btn";
    btn.textContent=meta.name||meta.title||id;
    btn.dataset.win=id;
    btn.addEventListener("click",()=>this.focus(id));
    this.taskbar?.appendChild(btn);
    info.taskBtn=btn;

    this.focus(id);
    return {id, body};
  }

  focus(id){
    const info=this.windows.get(id); if(!info) return;
    if(info.minimized){
      info.minimized=false;
      info.el.style.display="";
    }
    if(this.active && this.active!==id){
      window.dispatchEvent(new CustomEvent('window-blurred',{detail:{id:this.active}}));
    }
    this.active=id;
    info.el.style.display="";
    info.el.style.zIndex=this.z++;
    window.dispatchEvent(new CustomEvent('window-focused',{detail:{id}}));
  }

  minimize(id){
    const info=this.windows.get(id); if(!info||info.minimized) return;
    const wasActive = this.active===id;
    info.minimized=true;
    info.el.style.display="none";
    if(wasActive){
      this.active=null;
      window.dispatchEvent(new CustomEvent('window-blurred',{detail:{id}}));
    }
  }

  restore(id){
    const info=this.windows.get(id); if(!info||!info.minimized) return;
    info.minimized=false;
    info.el.style.display="";
    this.focus(id);
  }

  toggle(id){
    const info=this.windows.get(id); if(!info) return;
    if(info.minimized) this.restore(id); else this.minimize(id);
  }

  close(id){
    const info=this.windows.get(id); if(!info) return;
    const wasActive = this.active===id;
    info.el.remove();
    info.taskBtn?.remove();
    this.windows.delete(id);
    if(wasActive){
      this.active=null;
      window.dispatchEvent(new CustomEvent('window-blurred',{detail:{id}}));
    }
  }

  _wireDrag(info){
    const win=info.el; const header=info.header;
    header.addEventListener("mousedown",e=>{
      if(e.button!==0) return; e.preventDefault();
      const startX=e.clientX; const startY=e.clientY;
      const rect=win.getBoundingClientRect();
      const offX=startX-rect.left; const offY=startY-rect.top;
      const move=ev=>{win.style.left=`${ev.clientX-offX}px`; win.style.top=`${ev.clientY-offY}px`;};
      const up=()=>{window.removeEventListener("mousemove",move);window.removeEventListener("mouseup",up);};
      window.addEventListener("mousemove",move); window.addEventListener("mouseup",up);
    });
  }

  _wireResize(info){
    const win=info.el; const res=info.resizer;
    res.addEventListener("mousedown",e=>{
      if(e.button!==0) return; e.preventDefault();
      const startX=e.clientX; const startY=e.clientY;
      const startW=win.offsetWidth; const startH=win.offsetHeight;
      const move=ev=>{win.style.width=`${startW+(ev.clientX-startX)}px`; win.style.height=`${startH+(ev.clientY-startY)}px`;};
      const up=()=>{window.removeEventListener("mousemove",move);window.removeEventListener("mouseup",up);};
      window.addEventListener("mousemove",move); window.addEventListener("mouseup",up);
    });
  }
}
