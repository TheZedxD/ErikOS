import {
  addLog,
  createProfile,
  currentUser,
  deleteProfile,
  profiles,
  renameProfile,
  saveProfiles,
  setCurrentUser,
} from '../core/globals.js';
import { openAppWindow } from '../utils/appWindow.js';

export function openProfileManager() {
  addLog('Profile Manager opened');
  openAppWindow('profiles', 'Profile Manager', (content) => {
    content.innerHTML = '';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '6px';

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '4px';
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Profile';
    actions.append(addBtn);

    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '4px';

    content.append(actions, list);

    function render() {
      list.innerHTML = '';
      if (!profiles.length) {
        const empty = document.createElement('p');
        empty.textContent = 'No profiles configured.';
        list.append(empty);
        return;
      }

      profiles.forEach((profile) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        row.style.border = '1px solid var(--window-border-dark)';
        row.style.padding = '4px';

        const name = document.createElement('span');
        name.textContent = profile.name;
        if (currentUser && profile.id === currentUser.id) {
          name.style.fontWeight = 'bold';
        }

        const renameBtn = document.createElement('button');
        renameBtn.textContent = 'Rename';
        renameBtn.addEventListener('click', () => {
          const newName = prompt('Enter new profile name', profile.name);
          if (newName && newName.trim()) {
            renameProfile(profile.id, newName.trim());
            saveProfiles();
            render();
          }
        });

        const switchBtn = document.createElement('button');
        switchBtn.textContent = 'Switch';
        switchBtn.disabled = currentUser && profile.id === currentUser.id;
        switchBtn.addEventListener('click', () => {
          addLog(`Switched to profile ${profile.name}`);
          window.dispatchEvent(
            new CustomEvent('erikos-logout', { detail: { profileId: profile.id } })
          );
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
          if (profiles.length === 1) {
            alert('At least one profile must exist.');
            return;
          }
          if (!confirm(`Delete profile ${profile.name}?`)) return;
          const wasActive = currentUser && currentUser.id === profile.id;
          if (deleteProfile(profile.id)) {
            saveProfiles();
            if (wasActive) {
              addLog(`Profile ${profile.name} deleted. Logging out.`);
              window.dispatchEvent(new CustomEvent('erikos-logout'));
            } else {
              render();
            }
          }
        });

        row.append(name, renameBtn, switchBtn, deleteBtn);
        list.append(row);
      });
    }

    addBtn.addEventListener('click', () => {
      const name = prompt('Profile name', 'New User');
      const profile = createProfile(name && name.trim() ? name.trim() : 'New User');
      saveProfiles();
      render();
      if (!currentUser) {
        setCurrentUser(profile);
        window.dispatchEvent(new CustomEvent('erikos-logout'));
      }
    });

    render();
  });
}
