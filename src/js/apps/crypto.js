
export const meta = { id: 'crypto', name: 'Crypto Portfolio', icon: '/icons/processes.png' };
export function launch(ctx) {
  const content = document.createElement('div');
  const id = ctx.windowManager.createWindow(meta.id, meta.name, content);
  const win = ctx.windowManager.windows.get(id).element;
  mount(win, ctx);
}
export function mount(winEl, ctx) {
  const container = winEl.querySelector('.content');
  container.style.cssText = 'display:flex; flex-direction:column; height:100%; padding:8px;';

  const totalPanel = document.createElement('div');
  totalPanel.style.cssText = `
    background: #000;
    color: #0f0;
    font-family: "Courier New", monospace;
    font-size: 32px;
    text-align: center;
    padding: 16px;
    margin-bottom: 8px;
    border: 2px inset var(--window-border-dark);
  `;
  totalPanel.textContent = 'TOTAL: $0.00';

  const holdingsPanel = document.createElement('div');
  holdingsPanel.style.cssText = `
    flex: 1;
    border: 2px solid;
    border-color: var(--window-border-dark) var(--window-border-light) var(--window-border-light) var(--window-border-dark);
    background: var(--window-bg);
    overflow-y: auto;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr 60px;
    padding: 4px;
    background: var(--taskbar-bg);
    border-bottom: 1px solid var(--window-border-dark);
    font-weight: bold;
  `;
  header.innerHTML = `
    <span>Coin</span>
    <span style="text-align:right">Amount</span>
    <span style="text-align:right">Price</span>
    <span style="text-align:right">Value</span>
    <span></span>
  `;
  holdingsPanel.append(header);

  const holdingsList = document.createElement('div');
  holdingsList.style.cssText = 'padding: 4px;';
  holdingsPanel.append(holdingsList);

  const controlPanel = document.createElement('div');
  controlPanel.style.cssText = `
    display: flex;
    gap: 4px;
    padding: 8px;
    border-top: 2px solid var(--window-border-light);
    justify-content: center;
  `;

  const addBtn = document.createElement('button');
  addBtn.textContent = '📈 Add Coin';
  addBtn.style.cssText = `
    padding: 4px 12px;
    background: var(--button-bg);
    border: 2px solid;
    border-color: var(--btn-border-light) var(--btn-border-dark) var(--btn-border-dark) var(--btn-border-light);
  `;

  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = '🔄 Refresh Prices';
  refreshBtn.style.cssText = addBtn.style.cssText;

  controlPanel.append(addBtn, refreshBtn);
  container.append(totalPanel, holdingsPanel, controlPanel);

  const portfolio = ctx.globals.currentUser && Array.isArray(ctx.globals.currentUser.portfolio)
    ? [...ctx.globals.currentUser.portfolio]
    : [];

  async function fetchPrices(ids) {
    if (!ids.length) return {};
    const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`);
    return await resp.json();
  }

  function renderHoldings(prices) {
    holdingsList.innerHTML = '';
    let total = 0;
    portfolio.forEach(({id, amount}, idx) => {
      const price = prices[id]?.usd || 0;
      const value = price * amount;
      total += value;

      const row = document.createElement('div');
      row.style.cssText = `
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr 60px;
        padding: 4px;
        border-bottom: 1px solid #e0e0e0;
        align-items: center;
      `;

      row.innerHTML = `
        <span style="font-weight:bold">${id.toUpperCase()}</span>
        <span style="text-align:right">${amount.toFixed(4)}</span>
        <span style="text-align:right">$${price.toFixed(2)}</span>
        <span style="text-align:right; font-weight:bold">$${value.toFixed(2)}</span>
      `;

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.style.cssText = 'padding:2px 6px; font-size:11px;';
      removeBtn.onclick = () => {
        portfolio.splice(idx,1);
        if (ctx.globals.currentUser) {
          ctx.globals.currentUser.portfolio = portfolio;
          ctx.globals.saveProfiles?.(ctx.globals.profiles);
        }
        refresh();
      };

      row.append(removeBtn);
      holdingsList.append(row);
    });

    totalPanel.textContent = `TOTAL: $${total.toFixed(2)}`;
    totalPanel.style.animation = 'pulse 0.5s';
  }

  async function refresh() {
    const ids = portfolio.map(c => c.id);
    const prices = await fetchPrices(ids);
    renderHoldings(prices);
  }

  addBtn.addEventListener('click', () => {
    const id = prompt('Coin ID (e.g. bitcoin):');
    if (!id) return;
    const amtStr = prompt('Amount:');
    const amount = parseFloat(amtStr);
    if (!amtStr || isNaN(amount)) return;
    const sym = id.trim().toLowerCase();
    const existing = portfolio.find(c => c.id === sym);
    if (existing) existing.amount += amount; else portfolio.push({id: sym, amount});
    if (ctx.globals.currentUser) {
      ctx.globals.currentUser.portfolio = portfolio;
      ctx.globals.saveProfiles?.(ctx.globals.profiles);
    }
    refresh();
  });

  refreshBtn.addEventListener('click', refresh);
  refresh();
}
