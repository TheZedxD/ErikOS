import { APIClient } from '../utils/api.js';

export const meta = { id: 'settings', name: 'Settings', icon: '/icons/settings.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export async function mount(winEl, ctx) {
  const container = winEl.querySelector('.content');
  const g = ctx.globals;
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
    const activeTheme = g.currentUser
      ? g.currentUser.theme || 'default'
      : document.body.className.match(/theme-(\w+)/)?.[1] || 'default';
    if (name === activeTheme) opt.selected = true;
    themeSelect.append(opt);
  });
  appearance.append(themeHeading, themeSelect);

  const activeThemeClass = g.currentUser
    ? g.currentUser.theme || 'default'
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
  const api = new APIClient(ctx);
  const iconListResp = await api.getJSON('/api/list-icons');
  const iconData = iconListResp.ok ? iconListResp.data : {};
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
  if (g.currentUser && g.currentUser.iconLayout === 'free')
    freeRadio.checked = true;
  else gridRadio.checked = true;
  desktopPanel.append(layoutHeading, freeLabel, gridLabel);

  const trayHeading = document.createElement('h3');
  trayHeading.textContent = 'Taskbar Elements';
  const clockChk = document.createElement('input');
  clockChk.type = 'checkbox';
  clockChk.checked = g.currentUser ? g.currentUser.showClock : true;
  const clockLabel = document.createElement('label');
  clockLabel.append(clockChk, document.createTextNode(' Show clock'));
  const volChk = document.createElement('input');
  volChk.type = 'checkbox';
  volChk.checked = g.currentUser ? g.currentUser.showVolume : true;
  const volLabel = document.createElement('label');
  volLabel.append(volChk, document.createTextNode(' Show volume control'));
  const linksChk = document.createElement('input');
  linksChk.type = 'checkbox';
  linksChk.checked = g.currentUser ? g.currentUser.showLinks : true;
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
      g.currentUser && Array.isArray(g.currentUser.visibleApps)
        ? g.currentUser.visibleApps.includes(app.id)
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
      g.currentUser &&
      g.currentUser.customIcons &&
      g.currentUser.customIcons[app.id]
    ) {
      select.value = g.currentUser.customIcons[app.id];
    }
    select.addEventListener('change', () => {
      if (!g.currentUser) return;
      g.currentUser.customIcons = g.currentUser.customIcons || {};
      g.currentUser.customIcons[app.id] = select.value;
      g.saveProfiles?.(g.profiles);
      g.initDesktop?.();
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
      if (!file || !g.currentUser) return;
      const form = new FormData();
      form.append('file', file);
      try {
        const resp = await api.post('/api/upload-icon', form);
        const data = resp.ok ? resp.data : {};
        if (!resp.ok || !data.ok) {
          alert(data.error || resp.error || 'Upload failed');
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
        g.currentUser.customIcons = g.currentUser.customIcons || {};
        g.currentUser.customIcons[app.id] = '/icons/' + filename;
        g.saveProfiles?.(g.profiles);
        g.initDesktop?.();
        select.value = '/icons/' + filename;
      } catch (err) {
        console.error('Upload failed', err);
        alert('Upload failed');
      }
    });
    resetIconBtn.addEventListener('click', () => {
      if (!g.currentUser || !g.currentUser.customIcons) return;
      delete g.currentUser.customIcons[app.id];
      g.saveProfiles?.(g.profiles);
      g.initDesktop?.();
      select.value = app.icon;
    });
    row.append(select, iconBtn, resetIconBtn, fileInput);

    const defaultName = app.icon.split('/').pop();
    if (!availableIcons.includes(defaultName)) {
      console.warn('Missing icon for app', app.id);
    }

    chk.addEventListener('change', () => {
      if (!g.currentUser) return;
      const list = g.currentUser.visibleApps || [];
      if (chk.checked) {
        if (!list.includes(app.id)) list.push(app.id);
      } else {
        const idx = list.indexOf(app.id);
        if (idx >= 0) list.splice(idx, 1);
      }
      g.currentUser.visibleApps = list;
      g.saveProfiles?.(g.profiles);
      g.initDesktop?.();
    });
    desktopPanel.append(row);
  });

  const securityPanel = makePanel('Security');
  if (g.currentUser) {
    const accHeading = document.createElement('h3');
    accHeading.textContent = 'Account Security';
    const requireChk = document.createElement('input');
    requireChk.type = 'checkbox';
    requireChk.checked = g.currentUser.requirePassword;
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
      g.currentUser.password = pwd || null;
      g.currentUser.requirePassword = pwd ? requireChk.checked : false;
      g.saveProfiles?.(g.profiles);
      alert('Password updated');
    });
    requireChk.addEventListener('change', () => {
      g.currentUser.requirePassword =
        requireChk.checked && !!g.currentUser.password;
      g.saveProfiles?.(g.profiles);
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
  const volWrapper = document.createElement('label');
  volWrapper.textContent = 'System volume';
  volWrapper.style.display = 'flex';
  volWrapper.style.flexDirection = 'column';
  volWrapper.style.gap = '4px';
  const volSlider = document.createElement('input');
  volSlider.type = 'range';
  volSlider.min = '0';
  volSlider.max = '1';
  volSlider.step = '0.01';
  volSlider.value = String(g.globalVolume);
  volSlider.setAttribute('aria-valuemin', '0');
  volSlider.setAttribute('aria-valuemax', '1');
  volSlider.setAttribute('aria-label', 'System volume');
  volWrapper.append(volSlider);
  audioPanel.append(audioHeading, volWrapper);
  volSlider.addEventListener('input', () => {
    const value = parseFloat(volSlider.value);
    g.setGlobalVolume?.(value);
  });
  const detach = g.onGlobalVolumeChange?.((value) => {
    const current = Number.parseFloat(volSlider.value);
    if (!Number.isFinite(current) || Math.abs(current - value) > 0.001) {
      volSlider.value = String(value);
    }
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
    if (g.currentUser) {
      g.currentUser.theme = val === 'default' ? null : val;
      g.saveProfiles?.(g.profiles);
    }
    g.setTheme?.(val);
  });
  wallpaperInput.addEventListener('change', () => {
    const file = wallpaperInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      if (g.currentUser) {
        g.currentUser.wallpaper = dataUrl;
        g.saveProfiles?.(g.profiles);
      } else {
        localStorage.setItem('win95-wallpaper', dataUrl);
      }
      document.body.style.backgroundImage = `url(${dataUrl})`;
    };
    reader.readAsDataURL(file);
  });
  resetWallpaperBtn.addEventListener('click', () => {
    if (g.currentUser) {
      g.currentUser.wallpaper = null;
      g.saveProfiles?.(g.profiles);
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
    if (!g.currentUser) return;
    g.currentUser.showClock = clockChk.checked;
    g.saveProfiles?.(g.profiles);
    document.getElementById('system-clock').style.display = clockChk.checked
      ? 'flex'
      : 'none';
  });
  volChk.addEventListener('change', () => {
    if (!g.currentUser) return;
    g.currentUser.showVolume = volChk.checked;
    g.saveProfiles?.(g.profiles);
    document.getElementById('tray-volume-icon').style.display = volChk.checked
      ? 'inline'
      : 'none';
  });
  linksChk.addEventListener('change', () => {
    if (!g.currentUser) return;
    g.currentUser.showLinks = linksChk.checked;
    g.saveProfiles?.(g.profiles);
    document.getElementById('tray-links-icon').style.display = linksChk.checked
      ? 'inline'
      : 'none';
  });

  if (typeof detach === 'function') {
    winEl.addEventListener(
      'window-closed',
      () => {
        detach();
      },
      { once: true },
    );
  }

  container.append(tabs, contentArea);
}
