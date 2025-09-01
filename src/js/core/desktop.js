import { ASSET_BASE } from "../../config.js";

const GRID_SIZE = 88;
const snap = v => Math.round(v / GRID_SIZE) * GRID_SIZE;
const resolveIcon = icon =>
  icon.startsWith("http") || icon.startsWith("/")
    ? icon
    : `${ASSET_BASE}/${icon}`;

export function renderDesktopIcons(apps, launcher, profileId = 'default'){
  const root = document.getElementById("desktop"); if (!root) return;
  root.dataset.layout = "grid";
  root.innerHTML = "";

  const storageKey = `desktop:positions:${profileId}`;
  const positions = JSON.parse(localStorage.getItem(storageKey) || "{}");
  const occupied = new Set();
  const cols = Math.floor(root.clientWidth / GRID_SIZE);
  const rows = Math.floor(root.clientHeight / GRID_SIZE);

  const findFree = () => {
    for(let y=0;y<rows;y++){
      for(let x=0;x<cols;x++){
        const pos={x:x*GRID_SIZE,y:y*GRID_SIZE};
        const k=`${pos.x},${pos.y}`;
        if(!occupied.has(k)) return pos;
      }
    }
    return {x:0,y:0};
  };

  const place = (id) => {
    let pos = positions[id];
    if(pos){
      pos = {x:snap(pos.x), y:snap(pos.y)};
      const k = `${pos.x},${pos.y}`;
      if(!occupied.has(k)){
        occupied.add(k);
        return pos;
      }
    }
    const free = findFree();
    occupied.add(`${free.x},${free.y}`);
    positions[id] = free;
    return free;
  };

  for (const a of apps){
    const el = document.createElement("div");
    el.className = "desktop-icon"; el.dataset.appId = a.id;
    el.innerHTML = `<img alt=""><span class="label"></span>`;
    const img = el.querySelector("img");
    img.src = resolveIcon(a.icon);
    el.querySelector(".label").textContent = a.title;
    el.addEventListener("dblclick", ()=> launcher.launch(a.id));
    const pos = place(a.id);
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;

    el.addEventListener('mousedown', e=>{
      if(e.button!==0) return; e.preventDefault();
      const startX=e.clientX; const startY=e.clientY;
      const rect=el.getBoundingClientRect();
      const offX=startX-rect.left; const offY=startY-rect.top;
      el.classList.add('dragging');
      const move=ev=>{el.style.left=`${ev.clientX-offX}px`; el.style.top=`${ev.clientY-offY}px`;};
      const up=()=>{
        window.removeEventListener('mousemove',move);
        window.removeEventListener('mouseup',up);
        el.classList.remove('dragging');
        let x=snap(parseInt(el.style.left,10));
        let y=snap(parseInt(el.style.top,10));
        for(const [id,pos] of Object.entries(positions)){
          if(id!==a.id && pos.x===x && pos.y===y){
            const free=findFree();
            x=free.x; y=free.y; break;
          }
        }
        el.style.left=`${x}px`;
        el.style.top=`${y}px`;
        positions[a.id]={x,y};
        occupied.clear();
        Object.values(positions).forEach(p=>occupied.add(`${p.x},${p.y}`));
        localStorage.setItem(storageKey, JSON.stringify(positions));
      };
      window.addEventListener('mousemove',move);
      window.addEventListener('mouseup',up);
    });

    root.appendChild(el);
  }

  localStorage.setItem(storageKey, JSON.stringify(positions));
}
