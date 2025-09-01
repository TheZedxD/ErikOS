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
  const toggle = ()=>menu.setAttribute("aria-hidden",
    menu.getAttribute("aria-hidden")!=="false"?"false":"true");
  btn.addEventListener("click", toggle);
  document.addEventListener("keydown", e=>{ if (e.key==="Escape") menu.setAttribute("aria-hidden","true");});
  document.addEventListener("click", e=>{ if (!menu.contains(e.target) && e.target!==btn) menu.setAttribute("aria-hidden","true"); });
}
