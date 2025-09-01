import { ASSET_BASE } from "../../config.js";
export function renderDesktopIcons(apps, launcher){
  const root = document.getElementById("desktop"); if (!root) return;
  root.innerHTML = "";
  for (const a of apps){
    const el = document.createElement("div");
    el.className = "desktop-icon"; el.dataset.appId = a.id;
    el.innerHTML = `<img alt=""><span class="label"></span>`;
    const img = el.querySelector("img");
    img.src = a.icon.startsWith("http") ? a.icon : `${ASSET_BASE}/${a.icon.replace(/^\//,'')}`;
    el.querySelector(".label").textContent = a.title;
    el.addEventListener("dblclick", ()=> launcher.launch(a.id));
    root.appendChild(el);
  }
}
