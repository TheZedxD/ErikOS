export function registerTray(launcher){
  const hook = (id, appId)=>{
    const el = document.getElementById(id);
    if (el) el.onclick = ()=>launcher.launch(appId);
  };
  hook("tray-links-icon","link-manager");
  hook("tray-volume-icon","volume");
  hook("tray-snip-icon","recorder");

  const clock = document.getElementById("tray-clock");
  if (clock){
    const update=()=>{
      const d = new Date();
      clock.textContent = d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    };
    update();
    setInterval(update,60000);
    clock.addEventListener("click",()=>launcher.launch("calendar"));
  }

  const net = document.getElementById("tray-network");
  const updNet=()=>{ if(net) net.textContent = navigator.onLine?"Online":"Offline"; };
  updNet();
  window.addEventListener("online", updNet);
  window.addEventListener("offline", updNet);
}
