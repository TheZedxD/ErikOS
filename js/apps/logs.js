import { addLog, clearLogs, getLogsData } from '../core/globals.js';
import { openAppWindow } from '../utils/appWindow.js';

export function openLogs() {
  addLog('Logs opened');
  openAppWindow('logs', 'Logs', (content) => {
    content.innerHTML = '';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.height = '100%';
    content.style.gap = '6px';

    const dateSelect = document.createElement('select');
    const logList = document.createElement('div');
    logList.style.flex = '1';
    logList.style.overflowY = 'auto';
    logList.style.border = '1px solid var(--window-border-dark)';
    logList.style.padding = '4px';
    logList.style.fontFamily = 'monospace';

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear Logs';

    function renderEntries() {
      logList.innerHTML = '';
      const data = getLogsData();
      const entries = data[dateSelect.value] || [];
      entries.forEach((entry) => {
        const line = document.createElement('div');
        line.textContent = `[${entry.time}] ${entry.message}`;
        logList.append(line);
      });
    }

    function refreshDates() {
      const data = getLogsData();
      const keys = Object.keys(data).sort().reverse();
      dateSelect.innerHTML = '';
      keys.forEach((key) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = key;
        dateSelect.append(opt);
      });
      if (keys.length) {
        dateSelect.value = keys[0];
        renderEntries();
      } else {
        logList.innerHTML = '';
      }
    }

    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all logs?')) {
        clearLogs();
        refreshDates();
      }
    });

    dateSelect.addEventListener('change', renderEntries);

    content.append(dateSelect, logList, clearBtn);
    refreshDates();
  });
}
