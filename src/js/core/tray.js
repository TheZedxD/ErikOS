export function registerTray(launcher){
  const hook = (id, appId)=>{
    const el = document.getElementById(id);
    if (el) el.onclick = ()=>launcher.launch(appId);
  };
  hook("tray-links-icon","link-manager");
  hook("tray-volume-icon","volume");
  hook("tray-snip-icon","recorder");
}
