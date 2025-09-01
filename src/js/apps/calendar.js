
export const meta = { id: 'calendar', name: 'Calendar', icon: '/icons/calendar.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  const container = winEl;
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '100%';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '<';
  const nextBtn = document.createElement('button');
  nextBtn.textContent = '>';
  const title = document.createElement('span');
  header.append(prevBtn, title, nextBtn);

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';

  container.append(header, table);

  let currentDate = new Date();

  function render() {
    const monthNames = [
      'January','February','March','April','May','June','July',
      'August','September','October','November','December'
    ];
    title.textContent = monthNames[currentDate.getMonth()] + ' ' + currentDate.getFullYear();
    table.innerHTML = '';
    const headerRow = document.createElement('tr');
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
      const th = document.createElement('th');
      th.textContent = d;
      th.style.border = '1px solid var(--window-border-dark)';
      th.style.padding = '2px';
      headerRow.append(th);
    });
    table.append(headerRow);

    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const firstDay = first.getDay();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 0).getDate();
    let row = document.createElement('tr');
    for (let i=0;i<firstDay;i++) {
      const td = document.createElement('td');
      td.textContent = '';
      td.style.border = '1px solid var(--window-border-dark)';
      td.style.height = '24px';
      row.append(td);
    }
    for (let day=1; day<=daysInMonth; day++) {
      if ((firstDay + day -1) %7===0 && row.children.length) {
        table.append(row); row = document.createElement('tr');
      }
      const td = document.createElement('td');
      td.textContent = String(day);
      td.style.border = '1px solid var(--window-border-dark)';
      td.style.padding = '2px';
      td.style.textAlign = 'center';
      const today = new Date();
      if (day===today.getDate() && currentDate.getMonth()===today.getMonth() && currentDate.getFullYear()===today.getFullYear()) {
        td.style.background = 'var(--selection-bg)';
        td.style.color = '#fff';
      }
      row.append(td);
    }
    while (row.children.length < 7) {
      const td = document.createElement('td');
      td.textContent = '';
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
}
