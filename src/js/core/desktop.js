import { getAppById, loadApps } from "./appRegistry.js";
export async function renderDesktopIcons(launcher){
  const root = document.getElementById("desktop"); if (!root) return;
  root.innerHTML = "";
  for (const a of loadApps()){
    const el = document.createElement("div");
    el.className = "icon"; el.dataset.appId = a.meta.id;
    el.innerHTML = `<img alt=""><span></span>`;
    el.querySelector("img").src = a.meta.icon || "/icons/default.png";
    el.querySelector("span").textContent = a.meta.name;
    el.addEventListener("dblclick", ()=> launcher.launch(a.meta.id));
    root.appendChild(el);
  }
}
