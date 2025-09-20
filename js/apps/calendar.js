import { addLog } from '../core/globals.js';
import { openAppWindow } from '../utils/appWindow.js';

export function openCalendar() {
  addLog('Calendar opened');
  openAppWindow('calendar', 'Calendar', (content) => {
    content.innerHTML = '';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.height = '100%';
    content.style.gap = '6px';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '<';
    const title = document.createElement('span');
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '>';
    header.append(prevBtn, title, nextBtn);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    content.append(header, table);

    let currentDate = new Date();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    function render() {
      title.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      table.innerHTML = '';
      const headerRow = document.createElement('tr');
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((day) => {
        const th = document.createElement('th');
        th.textContent = day;
        th.style.border = '1px solid var(--window-border-dark)';
        th.style.padding = '2px';
        th.style.background = 'var(--window-border-light)';
        headerRow.append(th);
      });
      table.append(headerRow);

      const firstOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const firstDay = firstOfMonth.getDay();
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      let row = document.createElement('tr');

      for (let i = 0; i < firstDay; i += 1) {
        const td = document.createElement('td');
        td.style.border = '1px solid var(--window-border-dark)';
        td.style.height = '24px';
        row.append(td);
      }

      for (let day = 1; day <= daysInMonth; day += 1) {
        if ((firstDay + day - 1) % 7 === 0 && row.children.length) {
          table.append(row);
          row = document.createElement('tr');
        }
        const td = document.createElement('td');
        td.textContent = String(day);
        td.style.border = '1px solid var(--window-border-dark)';
        td.style.padding = '4px';
        td.style.textAlign = 'center';
        const today = new Date();
        if (
          day === today.getDate() &&
          currentDate.getMonth() === today.getMonth() &&
          currentDate.getFullYear() === today.getFullYear()
        ) {
          td.style.background = 'var(--selection-bg)';
          td.style.color = '#fff';
        }
        row.append(td);
      }

      while (row.children.length < 7) {
        const td = document.createElement('td');
        td.style.border = '1px solid var(--window-border-dark)';
        td.style.height = '24px';
        row.append(td);
      }
      table.append(row);
    }

    prevBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      render();
    });
    nextBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      render();
    });

    render();
  });
}
