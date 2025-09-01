import { gate } from './logBoot.js';
import { API_BASE, ASSET_BASE, REGISTRY_URL } from '../config.js';
import { renderDesktopIcons } from '../js/core/desktop.js';
import { registerTray } from '../js/core/tray.js';
import { wireTaskbarButtons } from '../js/core/taskbar.js';
import { buildStartMenu, wireStartToggle } from '../js/core/startMenu.js';
import { Launcher } from '../js/core/launcher.js';

async function loadConfig(){
  if (API_BASE === undefined || ASSET_BASE === undefined || REGISTRY_URL === undefined){
    throw new Error('Missing config');
  }
  return { API_BASE, ASSET_BASE, REGISTRY_URL };
}

async function loadRegistry(){
  console.log('Fetching registry', REGISTRY_URL);
  const res = await fetch(REGISTRY_URL);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${REGISTRY_URL}`);
  }
  const data = await res.json();
  if(!Array.isArray(data)) throw new Error('Registry must be an array');
  const apps = [];
  for(const app of data){
    const {id, title, icon, entry, comingSoon} = app;
    const missing = [];
    if(!id) missing.push('id');
    if(!title) missing.push('title');
    if(!icon) missing.push('icon');
    if(!entry) missing.push('entry');
    if(typeof comingSoon !== 'boolean') missing.push('comingSoon');
    if(missing.length){
      console.error(`Invalid app ${id||'unknown'} missing ${missing.join(',')}`);
      continue;
    }
    apps.push({id, title, icon, entry, comingSoon});
  }
  return apps;
}

async function mountDesktop(ctx, apps, launcher){
  renderDesktopIcons(apps, launcher, ctx.profileId || 'default');
}

async function mountTaskbar(ctx, apps, launcher){
  registerTray(launcher);
  wireTaskbarButtons();
}

async function mountStartMenu(ctx, apps, launcher){
  buildStartMenu(apps, launcher);
  wireStartToggle();
}

async function main(){
  const ctx = { profileId: localStorage.getItem('profileId') || 'default' };
  await gate('loadConfig', loadConfig);
  const apps = await gate('loadRegistry', loadRegistry);
  const launcher = new Launcher(ctx, apps);
  await gate('mountDesktop', () => mountDesktop(ctx, apps, launcher));
  await gate('mountTaskbar', () => mountTaskbar(ctx, apps, launcher));
  await gate('mountStartMenu', () => mountStartMenu(ctx, apps, launcher));
  window.__BOOT_OK__ = true;
}

main();
