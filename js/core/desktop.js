import { applications } from './globals.js';

let listeners = [];

export function initDesktop() {
  const startBtn = document.getElementById('start-button');
  const startMenu = document.getElementById('start-menu');
  const appList = document.getElementById('start-app-list');

  console.time('BOOT: start');
  appList.innerHTML = '';
  applications.forEach(app => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = app.name;
    btn.addEventListener('click', () => {
      startMenu.setAttribute('aria-hidden', 'true');
      app.launch();
    });
    li.appendChild(btn);
    appList.appendChild(li);
  });

  const logoutLi = document.createElement('li');
  const logoutBtn = document.createElement('button');
  logoutBtn.id = 'start-logout-btn';
  logoutBtn.textContent = 'Log Out';
  logoutBtn.addEventListener('click', () => {
    startMenu.setAttribute('aria-hidden', 'true');
    window.dispatchEvent(new CustomEvent('erikos-logout'));
  });
  logoutLi.appendChild(logoutBtn);
  appList.appendChild(logoutLi);

  const toggleMenu = () => {
    const hidden = startMenu.getAttribute('aria-hidden') === 'true';
    startMenu.setAttribute('aria-hidden', hidden ? 'false' : 'true');
  };
  startBtn.addEventListener('click', toggleMenu);
  listeners.push({ target: startBtn, type: 'click', handler: toggleMenu });

  const outsideHandler = (e) => {
    if (!startMenu.contains(e.target) && e.target !== startBtn) {
      startMenu.setAttribute('aria-hidden', 'true');
    }
  };
  window.addEventListener('pointerdown', outsideHandler);
  listeners.push({ target: window, type: 'pointerdown', handler: outsideHandler });

  const resizeHandler = () => {};
  window.addEventListener('resize', resizeHandler);
  listeners.push({ target: window, type: 'resize', handler: resizeHandler });

  const keyHandler = (e) => {
    if (e.key === 'Escape') startMenu.setAttribute('aria-hidden', 'true');
  };
  window.addEventListener('keydown', keyHandler);
  listeners.push({ target: window, type: 'keydown', handler: keyHandler });
  console.timeEnd('BOOT: start');
}

export function teardownDesktop() {
  listeners.forEach(({ target, type, handler }) => target.removeEventListener(type, handler));
  listeners = [];
  const appList = document.getElementById('start-app-list');
  if (appList) appList.innerHTML = '';
  const startMenu = document.getElementById('start-menu');
  if (startMenu) startMenu.setAttribute('aria-hidden', 'true');
}
