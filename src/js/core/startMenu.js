import { ASSET_BASE } from "../../config.js";
export function buildStartMenu(apps, launcher){
  const ul = document.getElementById("start-app-list"); if (!ul) return;
  ul.innerHTML = "";
  for (const a of apps){
    const li = document.createElement("li");
    li.innerHTML = `<img alt=""><span></span>`;
    li.querySelector("img").src = a.icon.startsWith("http") ? a.icon : `${ASSET_BASE}/${a.icon.replace(/^\//,'')}`;
    li.querySelector("span").textContent = a.title;
    if(!a.comingSoon){
      li.addEventListener("click", ()=> launcher.launch(a.id));
    } else {
      li.classList.add("coming-soon");
    }
    ul.appendChild(li);
  }
}
export function wireStartToggle(){
  const btn = document.getElementById("start-button");
  const menu = document.getElementById("start-menu");
  if (!btn || !menu) return;
  menu.setAttribute("role","menu");
  const open = ()=>{ menu.hidden = false; };
  const close = ()=>{ menu.hidden = true; };
  btn.addEventListener("click", e=>{ e.stopPropagation(); menu.hidden ? open() : close(); });
  document.addEventListener("keydown", e=>{ if (e.key==="Escape") close(); });
  document.addEventListener("click", e=>{ if (!menu.contains(e.target) && e.target!==btn) close(); });
}
