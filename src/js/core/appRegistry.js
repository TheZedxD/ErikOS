import { apps as modules } from "../apps/index.js";

// Return lightweight metadata objects for UI consumption
export function loadApps() {
  return modules.map(m => ({
    id: m.meta.id,
    title: m.meta.name,
    icon: m.meta.icon,
    comingSoon: m.meta?.comingSoon,
  }));
}

// Expose the full module for launch/other internals
export function getAppById(id){
  return modules.find(m => m.meta.id === id);
}
