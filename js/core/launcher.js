import { windowManager } from './windowManager.js';
import { getAppById } from './appRegistry.js';

export function launchApp(id) {
  const app = getAppById(id);
  if (!app) return;
  windowManager.open(app);
}
