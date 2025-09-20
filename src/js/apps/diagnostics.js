import { APIClient } from '../utils/api.js';

export const meta = { id: 'diagnostics', name: 'Diagnostics', icon: '/icons/settings-icon.png' };

export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}

export function mount(winEl, ctx) {
  const container = winEl.querySelector('.content');
  container.style.padding = '8px';
  container.textContent = 'Running diagnostics...';
  const api = new APIClient(ctx);
  api.getJSON('/api/diagnostics/run')
    .then(res => {
      if (!res.ok) throw new Error(res.error);
      const data = res.data;
      container.innerHTML = '';
      if (data.issues && data.issues.length) {
        const list = document.createElement('ul');
        data.issues.forEach(iss => {
          const li = document.createElement('li');
          li.textContent = iss;
          list.append(li);
        });
        const issuesHeading = document.createElement('h3');
        issuesHeading.textContent = 'Issues detected';
        issuesHeading.style.marginTop = '0';
        container.append(issuesHeading, list);
      } else {
        const ok = document.createElement('p');
        ok.textContent = 'All checks passed';
        ok.style.marginTop = '0';
        container.append(ok);
      }

      const errors = Array.isArray(data.errors) ? data.errors : [];
      const errorSection = document.createElement('section');
      errorSection.style.marginTop = '16px';
      const errorHeading = document.createElement('h3');
      errorHeading.textContent = 'Recent app errors';
      errorHeading.style.marginBottom = '8px';
      errorSection.append(errorHeading);

      if (errors.length === 0) {
        const empty = document.createElement('p');
        empty.textContent = 'No recent client errors logged.';
        errorSection.append(empty);
      } else {
        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        list.style.padding = '0';
        errors.forEach(err => {
          const item = document.createElement('li');
          item.style.marginBottom = '12px';
          const header = document.createElement('strong');
          const appName = err.app || 'unknown';
          header.textContent = `[${err.timestamp}] ${appName}: ${err.message}`;
          item.append(header);
          if (err.stack) {
            const pre = document.createElement('pre');
            pre.textContent = err.stack;
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.margin = '4px 0 0';
            pre.style.padding = '6px';
            pre.style.background = 'var(--window-border-dark, #1b1b1b)';
            pre.style.borderRadius = '4px';
            pre.style.maxHeight = '160px';
            pre.style.overflow = 'auto';
            item.append(pre);
          }
          list.append(item);
        });
        errorSection.append(list);
      }

      container.append(errorSection);

      const a11ySection = document.createElement('section');
      a11ySection.style.marginTop = '16px';
      const a11yHeading = document.createElement('h3');
      a11yHeading.textContent = 'Accessibility check';
      a11yHeading.style.marginBottom = '8px';
      a11ySection.append(a11yHeading);

      const a11yIssues = collectAccessibilityIssues();
      if (a11yIssues.length === 0) {
        const okMsg = document.createElement('p');
        okMsg.textContent = 'No unlabeled buttons detected in the current UI.';
        a11ySection.append(okMsg);
      } else {
        const list = document.createElement('ul');
        a11yIssues.forEach((issue) => {
          const li = document.createElement('li');
          li.textContent = issue;
          list.append(li);
        });
        a11ySection.append(list);
      }

      container.append(a11ySection);
    })
    .catch(err => {
      container.textContent = 'Diagnostics failed: ' + err;
    });
}

function collectAccessibilityIssues(root = document) {
  const issues = [];
  const buttons = Array.from(root.querySelectorAll('button'));
  buttons.forEach((btn) => {
    if (btn.disabled) return;
    if (btn.closest('[aria-hidden="true"], [hidden]')) return;
    if (btn.offsetParent === null && !btn.matches('[role="menuitem"]')) return;
    if (hasAccessibleName(btn)) return;
    const descriptor = btn.id
      ? `#${btn.id}`
      : btn.textContent?.trim()
      ? `with text "${btn.textContent.trim()}"`
      : btn.className
      ? `.${btn.className.split(/\s+/).filter(Boolean).join('.')}`
      : 'unidentified';
    issues.push(`Button ${descriptor} is missing an accessible name.`);
  });
  return issues;
}

function hasAccessibleName(btn) {
  const ariaLabel = btn.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) return true;
  const labelledBy = btn.getAttribute('aria-labelledby');
  if (labelledBy) {
    for (const id of labelledBy.split(/\s+/)) {
      const el = id ? document.getElementById(id) : null;
      if (el && el.textContent && el.textContent.trim()) return true;
    }
  }
  if (btn.title && btn.title.trim()) return true;
  const text = btn.textContent?.trim();
  if (text) return true;
  return false;
}
