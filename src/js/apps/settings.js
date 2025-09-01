
export const meta = { id: 'settings', name: 'Settings', icon: '/icons/settings.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export async function mount(winEl, ctx) {
  const container = winEl;
  container.classList.add('settings-panel');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '100%';

  const tabs = document.createElement('div');
  tabs.classList.add('settings-tabs');
  const contentArea = document.createElement('div');
  contentArea.style.flex = '1';
  contentArea.style.overflowY = 'auto';

  const panels = {};
  function makePanel(name) {
    const panel = document.createElement('div');
    panel.classList.add('settings-section');
    panel.style.display = 'none';
    panels[name] = panel;
    return panel;
  }

  const appearance = makePanel('Appearance');
  const themeHeading = document.createElement('h3');
  themeHeading.textContent = 'Theme';
  const themeSelect = document.createElement('select');
  [
    'default',
    'matrix',
    'highcontrast',
    'red',
    'pink',
    'solarized',
    'vaporwave',
  ].forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    const activeTheme = currentUser
      ? currentUser.theme || 'default'
      : document.body.className.match(/theme-(\w+)/)?.[1] || 'default';
    if (name === activeTheme) opt.selected = true;
    themeSelect.append(opt);
  });
  appearance.append(themeHeading, themeSelect);

  const activeThemeClass = currentUser
    ? currentUser.theme || 'default'
    : document.body.className.match(/theme-(\w+)/)?.[1] || 'default';
  Array.from(themeSelect.options).forEach((opt) => {
    opt.addEventListener('mouseenter', () => {
      document.body.className = document.body.className
        .replace(/theme-\w+/g, '')
        .trim();
      const val = opt.value;
      if (val && val !== 'default') document.body.classList.add('theme-' + val);
    });
    opt.addEventListener('mouseleave', () => {
      document.body.className = document.body.className
        .replace(/theme-\w+/g, '')
        .trim();
      if (activeThemeClass && activeThemeClass !== 'default')
        document.body.classList.add('theme-' + activeThemeClass);
    });
  });

  const wallpaperHeading = document.createElement('h3');
  wallpaperHeading.textContent = 'Wallpaper';
  const wallpaperInput = document.createElement('input');
  wallpaperInput.type = 'file';
  wallpaperInput.accept = 'image/*';
  const resetWallpaperBtn = document.createElement('button');
  resetWallpaperBtn.textContent = 'Reset Wallpaper';
  appearance.append(wallpaperHeading, wallpaperInput, resetWallpaperBtn);

  const desktopPanel = makePanel('Desktop');
  desktopPanel.style.display = 'flex';
  desktopPanel.style.flexDirection = 'column';
  desktopPanel.style.gap = '8px';
  const iconListResp = await fetch('/api/list-icons').catch(() => null);
  const iconData = iconListResp ? await iconListResp.json() : {};
  let availableIcons = iconData.icons || [];
  const layoutHeading = document.createElement('h3');
  layoutHeading.textContent = 'Icon Layout';
  const freeRadio = document.createElement('input');
  freeRadio.type = 'radio';
  freeRadio.name = 'icon-layout';
  freeRadio.value = 'free';
  const freeLabel = document.createElement('label');
  freeLabel.append(freeRadio, document.createTextNode(' Free form'));
  const gridRadio = document.createElement('input');
  gridRadio.type = 'radio';
  gridRadio.name = 'icon-layout';
  gridRadio.value = 'grid';
  const gridLabel = document.createElement('label');
  gridLabel.append(gridRadio, document.createTextNode(' Snap to grid'));
  if (currentUser && currentUser.iconLayout === 'free')
    freeRadio.checked = true;
  else gridRadio.checked = true;
  desktopPanel.append(layoutHeading, freeLabel, gridLabel);

  const trayHeading = document.createElement('h3');
  trayHeading.textContent = 'Taskbar Elements';
  const clockChk = document.createElement('input');
  clockChk.type = 'checkbox';
  clockChk.checked = currentUser ? currentUser.showClock : true;
  const clockLabel = document.createElement('label');
  clockLabel.append(clockChk, document.createTextNode(' Show clock'));
  const volChk = document.createElement('input');
  volChk.type = 'checkbox';
  volChk.checked = currentUser ? currentUser.showVolume : true;
  const volLabel = document.createElement('label');
  volLabel.append(volChk, document.createTextNode(' Show volume control'));
  const linksChk = document.createElement('input');
  linksChk.type = 'checkbox';
  linksChk.checked = currentUser ? currentUser.showLinks : true;
  const linksLabel = document.createElement('label');
  linksLabel.append(linksChk, document.createTextNode(' Show quick links'));
  desktopPanel.append(trayHeading, clockLabel, volLabel, linksLabel);

  const appsHeading = document.createElement('h3');
  appsHeading.textContent = 'Desktop Icons';
  desktopPanel.append(appsHeading);
  applications.forEach((app) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '4px';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.id = `vis-${app.id}`;
    const isVisible =
      currentUser && Array.isArray(currentUser.visibleApps)
        ? currentUser.visibleApps.includes(app.id)
        : true;
    chk.checked = isVisible;
    const lbl = document.createElement('label');
    lbl.htmlFor = chk.id;
    lbl.append(chk, document.createTextNode(' ' + app.name));
    row.append(lbl);

    const select = document.createElement('select');
    select.classList.add('icon-select');
    const defOpt = document.createElement('option');
    defOpt.value = app.icon;
    defOpt.textContent = '(default)';
    select.append(defOpt);
    availableIcons.forEach((file) => {
      const opt = document.createElement('option');
      opt.value = '/icons/' + file;
      opt.textContent = file;
      select.append(opt);
    });
    if (
      currentUser &&
      currentUser.customIcons &&
      currentUser.customIcons[app.id]
    ) {
      select.value = currentUser.customIcons[app.id];
    }
    select.addEventListener('change', () => {
      if (!currentUser) return;
      currentUser.customIcons = currentUser.customIcons || {};
      currentUser.customIcons[app.id] = select.value;
      saveProfiles(profiles);
      initDesktop();
    });
    const iconBtn = document.createElement('button');
    iconBtn.textContent = 'Upload Icon';
    const resetIconBtn = document.createElement('button');
    resetIconBtn.textContent = 'Reset';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png';
    fileInput.style.display = 'none';
    iconBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file || !currentUser) return;
      const form = new FormData();
      form.append('file', file);
      try {
        const resp = await fetch('/api/upload-icon', {
          method: 'POST',
          body: form,
        });
        const data = await resp.json();
        if (!data.ok) {
          alert(data.error || 'Upload failed');
          return;
        }
        const filename = data.file;
        if (!availableIcons.includes(filename)) {
          availableIcons.push(filename);
          document.querySelectorAll('select.icon-select').forEach((sel) => {
            const opt = document.createElement('option');
            opt.value = '/icons/' + filename;
            opt.textContent = filename;
            sel.append(opt);
          });
        }
        currentUser.customIcons = currentUser.customIcons || {};
        currentUser.customIcons[app.id] = '/icons/' + filename;
        saveProfiles(profiles);
        initDesktop();
        select.value = '/icons/' + filename;
      } catch (err) {
        console.error('Upload failed', err);
        alert('Upload failed');
      }
    });
    resetIconBtn.addEventListener('click', () => {
      if (!currentUser || !currentUser.customIcons) return;
      delete currentUser.customIcons[app.id];
      saveProfiles(profiles);
      initDesktop();
      select.value = app.icon;
    });
    row.append(select, iconBtn, resetIconBtn, fileInput);

    const defaultName = app.icon.split('/').pop();
    if (!availableIcons.includes(defaultName)) {
      console.warn('Missing icon for app', app.id);
    }

    chk.addEventListener('change', () => {
      if (!currentUser) return;
      const list = currentUser.visibleApps || [];
      if (chk.checked) {
        if (!list.includes(app.id)) list.push(app.id);
      } else {
        const idx = list.indexOf(app.id);
        if (idx >= 0) list.splice(idx, 1);
      }
      currentUser.visibleApps = list;
      saveProfiles(profiles);
      initDesktop();
    });
    desktopPanel.append(row);
  });

  const securityPanel = makePanel('Security');
  if (currentUser) {
    const accHeading = document.createElement('h3');
    accHeading.textContent = 'Account Security';
    const requireChk = document.createElement('input');
    requireChk.type = 'checkbox';
    requireChk.checked = currentUser.requirePassword;
    const requireLabel = document.createElement('label');
    requireLabel.append(
      requireChk,
      document.createTextNode(' Require password at login')
    );
    const changePwdBtn = document.createElement('button');
    changePwdBtn.textContent = 'Change Password';
    securityPanel.append(accHeading, requireLabel, changePwdBtn);
    changePwdBtn.addEventListener('click', () => {
      const pwd = prompt('Enter new password (leave blank to remove password)');
      currentUser.password = pwd || null;
      currentUser.requirePassword = pwd ? requireChk.checked : false;
      saveProfiles(profiles);
      alert('Password updated');
    });
    requireChk.addEventListener('change', () => {
      currentUser.requirePassword =
        requireChk.checked && !!currentUser.password;
      saveProfiles(profiles);
    });

    const loginBgHeading = document.createElement('h3');
    loginBgHeading.textContent = 'Login Screen Background';
    const loginBgInput = document.createElement('input');
    loginBgInput.type = 'file';
    loginBgInput.accept = 'image/*';
    const resetLoginBgBtn = document.createElement('button');
    resetLoginBgBtn.textContent = 'Reset Login Background';
    securityPanel.append(loginBgHeading, loginBgInput, resetLoginBgBtn);

    loginBgInput.addEventListener('change', () => {
      const file = loginBgInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        localStorage.setItem('win95-login-bg', dataUrl);
        alert(
          'Login background updated. It will be applied next time you log out.'
        );
      };
      reader.readAsDataURL(file);
    });
    resetLoginBgBtn.addEventListener('click', () => {
      localStorage.removeItem('win95-login-bg');
      alert(
        'Login background reset. It will revert to the default colour on next login.'
      );
    });
  }

  const audioPanel = makePanel('Audio');
  const audioHeading = document.createElement('h3');
  audioHeading.textContent = 'Volume';
  const volSlider = document.createElement('input');
  volSlider.type = 'range';
  volSlider.min = '0';
  volSlider.max = '1';
  volSlider.step = '0.01';
  volSlider.value = String(globalVolume);
  audioPanel.append(audioHeading, volSlider);
  volSlider.addEventListener('input', () => {
    setGlobalVolume(parseFloat(volSlider.value));
  });

  const advancedPanel = makePanel('Advanced');
  advancedPanel.append(
    document.createTextNode('Advanced settings coming soon.')
  );

  const categories = [
    { name: 'Appearance', panel: appearance },
    { name: 'Desktop', panel: desktopPanel },
    { name: 'Security', panel: securityPanel },
    { name: 'Audio', panel: audioPanel },
    { name: 'Advanced', panel: advancedPanel },
  ];
  categories.forEach(({ name, panel }, index) => {
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.classList.add('tab-button');
    if (index === 0) btn.classList.add('active');
    btn.addEventListener('click', () => {
      tabs
        .querySelectorAll('button')
        .forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      Object.values(panels).forEach((p) => (p.style.display = 'none'));
      panel.style.display = 'block';
    });
    tabs.append(btn);
    contentArea.append(panel);
  });
  if (categories.length > 0) categories[0].panel.style.display = 'block';

  themeSelect.addEventListener('change', () => {
    const val = themeSelect.value;
    if (currentUser) {
      currentUser.theme = val === 'default' ? null : val;
      saveProfiles(profiles);
    }
    setTheme(val);
  });
  wallpaperInput.addEventListener('change', () => {
    const file = wallpaperInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      if (currentUser) {
        currentUser.wallpaper = dataUrl;
        saveProfiles(profiles);
      } else {
        localStorage.setItem('win95-wallpaper', dataUrl);
      }
      document.body.style.backgroundImage = `url(${dataUrl})`;
    };
    reader.readAsDataURL(file);
  });
  resetWallpaperBtn.addEventListener('click', () => {
    if (currentUser) {
      currentUser.wallpaper = null;
      saveProfiles(profiles);
    } else {
      localStorage.removeItem('win95-wallpaper');
    }
    document.body.style.backgroundImage = `url('./images/wallpaper.png')`;
  });

  freeRadio.addEventListener('change', () => {
    if (freeRadio.checked) setIconLayout('free');
  });
  gridRadio.addEventListener('change', () => {
    if (gridRadio.checked) setIconLayout('grid');
  });

  clockChk.addEventListener('change', () => {
    if (!currentUser) return;
    currentUser.showClock = clockChk.checked;
    saveProfiles(profiles);
    document.getElementById('system-clock').style.display = clockChk.checked
      ? 'flex'
      : 'none';
  });
  volChk.addEventListener('change', () => {
    if (!currentUser) return;
    currentUser.showVolume = volChk.checked;
    saveProfiles(profiles);
    document.getElementById('tray-volume-icon').style.display = volChk.checked
      ? 'inline'
      : 'none';
  });
  linksChk.addEventListener('change', () => {
    if (!currentUser) return;
    currentUser.showLinks = linksChk.checked;
    saveProfiles(profiles);
    document.getElementById('tray-links-icon').style.display = linksChk.checked
      ? 'inline'
      : 'none';
  });

  container.append(tabs, contentArea);
}
