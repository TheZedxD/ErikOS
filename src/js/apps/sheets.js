
export const meta = { id: 'sheets', name: 'Sheets', icon: '/icons/sheets.png' };
export function launch(ctx, fileData) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx, fileData);
}
export function mount(winEl, ctx, fileData) {
  const windowManager = ctx.windowManager;
  const container = winEl.querySelector('.content');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '100%';

  const tabsBar = document.createElement('div');
  tabsBar.style.display = 'flex';
  tabsBar.style.gap = '4px';
  tabsBar.style.padding = '2px';
  tabsBar.style.background = 'var(--taskbar-bg)';

  let sheets = [];
  function createSheet(name) {
    const initial = [];
    for (let r = 0; r < 5; r++) {
      const row = [];
      for (let c = 0; c < 5; c++) row.push('');
      initial.push(row);
    }
    return { name: name || `Sheet${sheets.length + 1}`, data: initial };
  }
  if (!fileData && ctx.globals.currentUser && Array.isArray(ctx.globals.currentUser.sheets)) {
    sheets = ctx.globals.currentUser.sheets.map(s => ({ name: s.name, data: s.data.map(row => row.slice()) }));
  }
  if (fileData) {
    try {
      if (fileData.type === 'csv') {
        sheets.push({ name: fileData.name || 'Sheet1', data: parseCSV(fileData.content) });
      } else if (fileData.type === 'xlsx' && typeof XLSX !== 'undefined') {
        const wb = XLSX.read(fileData.content, { type: 'array' });
        wb.SheetNames.forEach(n => {
          const ws = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 });
          sheets.push({ name: n, data: ws });
        });
      }
    } catch (err) {
      console.error(err);
    }
  }
  if (sheets.length === 0) sheets.push(createSheet('Sheet1'));
  let currentSheetIndex = 0;
  function persist() {
    if (ctx.globals.currentUser) {
      ctx.globals.currentUser.sheets = sheets;
      ctx.globals.saveProfiles?.(ctx.globals.profiles);
    }
  }
  persist();

  const toolbar = document.createElement('div');
  toolbar.style.display = 'flex';
  toolbar.style.gap = '4px';
  toolbar.style.flexWrap = 'wrap';
  toolbar.style.padding = '2px';
  const openBtn = document.createElement('button'); openBtn.textContent = 'Open';
  const saveBtn = document.createElement('button'); saveBtn.textContent = 'Save';
  const addRowBtn = document.createElement('button'); addRowBtn.textContent = 'Add Row';
  const addColBtn = document.createElement('button'); addColBtn.textContent = 'Add Column';
  const addSheetBtn = document.createElement('button'); addSheetBtn.textContent = 'Add Sheet';
  toolbar.append(openBtn, saveBtn, addRowBtn, addColBtn, addSheetBtn);
  container.append(tabsBar, toolbar);

  const tableWrapper = document.createElement('div');
  tableWrapper.style.flex = '1';
  tableWrapper.style.overflow = 'auto';
  tableWrapper.style.border = '1px solid var(--window-border-dark)';
  const table = document.createElement('table');
  table.style.borderCollapse = 'collapse';
  tableWrapper.append(table);
  container.append(tableWrapper);

  function renderTabs() {
    tabsBar.innerHTML = '';
    sheets.forEach((sheet, idx) => {
      const tab = document.createElement('div');
      tab.classList.add('sheet-tab');
      tab.draggable = true;
      const btn = document.createElement('button');
      btn.textContent = sheet.name;
      btn.style.padding = '2px 6px';
      btn.style.background = idx === currentSheetIndex ? 'var(--selection-bg)' : 'var(--button-bg)';
      btn.style.color = idx === currentSheetIndex ? 'var(--window-bg)' : 'inherit';
      btn.style.borderTop = `2px solid var(--btn-border-light)`;
      btn.style.borderLeft = `2px solid var(--btn-border-light)`;
      btn.style.borderRight = `2px solid var(--btn-border-dark)`;
      btn.style.borderBottom = `2px solid var(--btn-border-dark)`;
      btn.addEventListener('click', () => { currentSheetIndex = idx; renderTabs(); renderTable(); });
      tab.append(btn);
      tab.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', idx);
      });
      tab.addEventListener('dragover', e => e.preventDefault());
      tab.addEventListener('drop', e => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const [m] = sheets.splice(from,1);
        sheets.splice(idx,0,m);
        persist();
        renderTabs();
      });
      const closeBtn = document.createElement('span');
      closeBtn.textContent = '×';
      closeBtn.classList.add('tab-close');
      closeBtn.addEventListener('click', ev => {
        ev.stopPropagation();
        if (sheets.length === 1) return;
        sheets.splice(idx,1);
        if (currentSheetIndex >= sheets.length) currentSheetIndex = sheets.length-1;
        persist();
        renderTabs();
        renderTable();
      });
      tab.append(closeBtn);
      tabsBar.append(tab);
    });
  }

  function currentData() { return sheets[currentSheetIndex].data; }
  function setCurrentData(d) { sheets[currentSheetIndex].data = d; persist(); }

  function renderTable() {
    const data = currentData();
    table.innerHTML = '';
    const headerRow = document.createElement('tr');
    headerRow.append(document.createElement('th'));
    for (let c=0;c<data[0].length;c++) {
      const th = document.createElement('th');
      th.textContent = String.fromCharCode(65+c);
      th.style.border = '1px solid var(--window-border-dark)';
      headerRow.append(th);
    }
    table.append(headerRow);
    data.forEach((row,r) => {
      const tr = document.createElement('tr');
      const rowHeader = document.createElement('th');
      rowHeader.textContent = String(r+1);
      rowHeader.style.border = '1px solid var(--window-border-dark)';
      tr.append(rowHeader);
      row.forEach((cell,c) => {
        const td = document.createElement('td');
        td.contentEditable = 'true';
        td.style.border = '1px solid var(--window-border-dark)';
        td.style.minWidth = '60px';
        td.textContent = cell;
        td.addEventListener('input', () => {
          data[r][c] = td.textContent;
          persist();
        });
        tr.append(td);
      });
      table.append(tr);
    });
  }

  addRowBtn.addEventListener('click', () => {
    const data = currentData();
    const cols = data[0].length;
    const row = Array(cols).fill('');
    data.push(row);
    persist();
    renderTable();
  });

  addColBtn.addEventListener('click', () => {
    const data = currentData();
    data.forEach(r => r.push(''));
    persist();
    renderTable();
  });

  addSheetBtn.addEventListener('click', () => {
    sheets.push(createSheet());
    currentSheetIndex = sheets.length-1;
    persist();
    renderTabs();
    renderTable();
  });

  function parseCSV(text) {
    return text.split('\n').map(line => line.split(','));
  }

  function sheetToCSV(data) {
    return data.map(row => row.map(cell => {
      if (/[",\n]/.test(cell)) return '"' + cell.replace(/"/g,'""') + '"';
      return cell;
    }).join(',')).join('\n');
  }

  openBtn.addEventListener('click', async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,.xlsx';
      input.style.display = 'none';
      document.body.append(input);
      input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;
        if (file.name.endsWith('.xlsx') && typeof XLSX !== 'undefined') {
          const buf = await file.arrayBuffer();
          const wb = XLSX.read(buf, { type: 'array' });
          sheets = wb.SheetNames.map(n => ({ name:n, data: XLSX.utils.sheet_to_json(wb.Sheets[n], { header:1 }) }));
          currentSheetIndex = 0; persist();
        } else {
          const text = await file.text();
          setCurrentData(parseCSV(text));
        }
        renderTabs();
        renderTable();
        input.remove();
      });
      input.click();
    } catch (err) { console.error(err); }
  });

  saveBtn.addEventListener('click', async () => {
    try {
      const opts = {
        types: [
          { description:'Excel', accept:{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx'] } },
          { description:'CSV', accept:{ 'text/csv':['.csv'] } },
          { description:'ZIP', accept:{ 'application/zip':['.zip'] } }
        ],
        suggestedName: sheets[currentSheetIndex].name,
      };
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker(opts);
        const writable = await handle.createWritable();
        if (handle.name.endsWith('.xlsx') && typeof XLSX !== 'undefined') {
          const wb = XLSX.utils.book_new();
          sheets.forEach(s => {
            const ws = XLSX.utils.aoa_to_sheet(s.data);
            XLSX.utils.book_append_sheet(wb, ws, s.name);
          });
          const array = XLSX.write(wb, { bookType:'xlsx', type:'array' });
          await writable.write(array);
        } else if (handle.name.endsWith('.zip') && typeof JSZip !== 'undefined') {
          const zip = new JSZip();
          sheets.forEach(s => { zip.file(s.name + '.csv', sheetToCSV(s.data)); });
          const blob = await zip.generateAsync({ type:'blob' });
          await writable.write(blob);
        } else {
          const csv = sheetToCSV(currentData());
          await writable.write(csv);
        }
        await writable.close();
      } else {
        if (sheets.length > 1 && typeof JSZip !== 'undefined') {
          const zip = new JSZip();
          sheets.forEach(s => { zip.file(s.name + '.csv', sheetToCSV(s.data)); });
          const blob = await zip.generateAsync({ type:'blob' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'workbook.zip'; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        } else {
          const csv = sheetToCSV(currentData());
          const blob = new Blob([csv], { type:'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = sheets[currentSheetIndex].name + '.csv';
          document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        }
      }
    } catch (err) { console.error(err); }
  });

  winEl.addEventListener('resized', () => setTimeout(renderTable,0));
  renderTabs();
  renderTable();
}
