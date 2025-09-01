
export const meta = { id: 'profiles', name: 'Profile Manager', icon: '/icons/user.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  if (!currentUser) {
    winEl.textContent = 'No user logged in';
    return;
  }

  const container = winEl;
  container.classList.add('file-manager');
  const content = document.createElement('div');
  content.classList.add('file-manager-content');
  container.append(content);

  function render() {
    content.innerHTML = '';
    profiles.forEach((profile, idx) => {
      const row = document.createElement('div');
      row.classList.add('file-item');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = profile.name;
      const renameBtn = document.createElement('button');
      renameBtn.textContent = 'Rename';
      renameBtn.addEventListener('click', () => {
        const newName = prompt('Enter new name', profile.name);
        if (newName) {
          profile.name = newName;
          saveProfiles(profiles);
          render();
        }
      });
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        if (profiles.length === 1) {
          alert('At least one profile must exist');
          return;
        }
        if (confirm('Delete this profile?')) {
          const removingCurrent = profile.id === currentUser.id;
          profiles.splice(idx,1);
          saveProfiles(profiles);
          if (removingCurrent) {
            currentUser = null;
            localStorage.removeItem('win95-current-user');
            showLoginScreen();
          } else {
            render();
          }
        }
      });
      const switchBtn = document.createElement('button');
      switchBtn.textContent = 'Switch';
      switchBtn.disabled = profile.id === currentUser.id;
      switchBtn.addEventListener('click', () => {
        if (profile.requirePassword) {
          alert('Cannot switch to a password‑protected profile. Log out and sign in instead.');
        } else {
          currentUser = profile;
          localStorage.setItem('win95-current-user', profile.id);
          applyUserSettings(profile);
          initDesktop();
          initContextMenu();
          ctx.windowManager.windows.forEach(w => {
            ctx.windowManager.closeWindow(w.element.dataset.id);
          });
          addLog('Switched to profile ' + profile.name);
        }
      });
      const logoutBtn = document.createElement('button');
      logoutBtn.textContent = 'Log Out';
      logoutBtn.addEventListener('click', () => { logoutUser(); });
      row.append(nameSpan, renameBtn, deleteBtn, switchBtn);
      if (profile.id === currentUser.id) row.append(logoutBtn);
      content.append(row);
    });
  }

  render();
}
