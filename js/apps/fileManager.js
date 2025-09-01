import { openAppWindow } from '../utils/appWindow.js';

// The backend maps the empty string "" to the current user's root folder, so
// the File Manager can start at that virtual root without exposing other users.
export function openFileManager() {
  openAppWindow('file-manager', 'File Manager');
}
