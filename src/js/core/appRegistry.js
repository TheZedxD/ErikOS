import { apps } from "../apps/index.js";
export function loadApps() { return apps; }
export function getAppById(id){ return apps.find(a=>a.meta.id===id); }
