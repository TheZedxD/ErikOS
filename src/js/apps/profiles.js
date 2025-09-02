
export const meta = { id: 'profiles', name: 'Profile Manager', icon: '/icons/user.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  if (!ctx.globals.currentUser) {
    const container = winEl.querySelector('.content');
    if (container) container.textContent = 'No user logged in';
    return;
  }

  const container = winEl.querySelector('.content');
  container.classList.add('file-manager');
  const content = document.createElement('div');
  content.classList.add('file-manager-content');
  container.append(content);

  function render() {
    content.innerHTML = '';
    ctx.globals.profiles.forEach((profile, idx) => {
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
          ctx.globals.saveProfiles?.(ctx.globals.profiles);
          render();
        }
      });
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        if (ctx.globals.profiles.length === 1) {
          alert('At least one profile must exist');
          return;
        }
        if (confirm('Delete this profile?')) {
          const removingCurrent = profile.id === ctx.globals.currentUser.id;
          ctx.globals.profiles.splice(idx,1);
          ctx.globals.saveProfiles?.(ctx.globals.profiles);
          if (removingCurrent) {
            ctx.globals.currentUser = null;
            localStorage.removeItem('win95-current-user');
            ctx.globals.showLoginScreen?.();
          } else {
            render();
          }
        }
      });
      const switchBtn = document.createElement('button');
      switchBtn.textContent = 'Switch';
      switchBtn.disabled = profile.id === ctx.globals.currentUser.id;
      switchBtn.addEventListener('click', () => {
        if (profile.requirePassword) {
          alert('Cannot switch to a password‑protected profile. Log out and sign in instead.');
        } else {
          ctx.globals.currentUser = profile;
          localStorage.setItem('win95-current-user', profile.id);
          ctx.globals.applyUserSettings?.(profile);
          ctx.globals.initDesktop?.();
          ctx.globals.initContextMenu?.();
          ctx.windowManager.windows.forEach(w => {
            ctx.windowManager.closeWindow(w.element.dataset.id);
          });
          ctx.globals.addLog?.('Switched to profile ' + profile.name);
        }
      });
      const logoutBtn = document.createElement('button');
      logoutBtn.textContent = 'Log Out';
      logoutBtn.addEventListener('click', () => { ctx.globals.logoutUser?.(); });
      row.append(nameSpan, renameBtn, deleteBtn, switchBtn);
      if (profile.id === ctx.globals.currentUser.id) row.append(logoutBtn);
      content.append(row);
    });
  }

  render();
}
