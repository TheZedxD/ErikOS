function constrainTrayIcon(element) {
  if (element && element.tagName === 'IMG') {
    element.style.width = '20px';
    element.style.height = '20px';
    element.style.minWidth = '20px';
    element.style.minHeight = '20px';
    element.style.maxWidth = '20px';
    element.style.maxHeight = '20px';
    element.style.flex = 'none';
    element.style.flexShrink = '0';
    element.style.objectFit = 'contain';
  }
}

export function registerTray(launcher){
  const hook = (id, appId)=>{
    const el = document.getElementById(id);
    if (el) el.onclick = ()=>launcher.launch(appId);
  };
  hook("tray-links-icon","link-manager");
  hook("tray-volume-icon","volume");
  hook("tray-snip-icon","recorder");

  // Constrain all tray icons
  constrainTrayIcon(document.getElementById('tray-links-icon'));
  constrainTrayIcon(document.getElementById('tray-volume-icon'));
  constrainTrayIcon(document.getElementById('tray-snip-icon'));

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
