export function buildStartMenu(apps, launcher){
  const ul = document.getElementById("start-app-list"); if (!ul) return;
  ul.innerHTML = "";
  for (const a of apps){
    const li = document.createElement("li");
    li.textContent = a.meta.name;
    li.addEventListener("click", ()=> launcher.launch(a.meta.id));
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
