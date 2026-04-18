// ═══════════════════════════════════════
//  MARKET TERMINAL — Stocks Module
// ═══════════════════════════════════════

let _stockData = [];
let _stockFilter = { sector: 'all', query: '' };
let _stockSort = { col: 'symbol', dir: 1 };
let _stockDetailChart = null;
let _selectedStock = null;

window._stocksLoaded = false;

// ── LOAD: use Yahoo Finance via allorigins proxy ──
async function loadStocks() {
  window._stocksLoaded = true;
  const symbols = SP500.map(s => s.symbol);
  const body = document.getElementById('stocksBody');
  body.innerHTML = '<tr><td colspan="7" class="loading-cell">Fetching live prices…</td></tr>';

  // Batch in groups of 20 to avoid URL length limits
  const batches = [];
  for (let i = 0; i < symbols.length; i += 20) batches.push(symbols.slice(i, i + 20));

  const rows = {};
  SP500.forEach(s => { rows[s.symbol] = { ...s, price: null, change: null, pe: null, mktcap: null }; });

  for (const batch of batches) {
    try {
      const syms = batch.join(',');
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${syms}&fields=regularMarketPrice,regularMarketChangePercent,trailingPE,marketCap`;
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxy);
      const outer = await res.json();
      const data = JSON.parse(outer.contents);
      const quotes = data?.quoteResponse?.result || [];
      quotes.forEach(q => {
        if (rows[q.symbol]) {
          rows[q.symbol].price    = q.regularMarketPrice;
          rows[q.symbol].change   = q.regularMarketChangePercent;
          rows[q.symbol].pe       = q.trailingPE;
          rows[q.symbol].mktcap   = q.marketCap;
        }
      });
    } catch(e) {
      console.warn('Batch error:', e);
    }
  }

  _stockData = Object.values(rows);
  renderStocksTable();
  buildScreenerData();
}

function renderStocksTable() {
  const body = document.getElementById('stocksBody');
  let data = [..._stockData];

  if (_stockFilter.sector !== 'all') {
    data = data.filter(s => s.sector === _stockFilter.sector);
  }
  if (_stockFilter.query) {
    const q = _stockFilter.query.toLowerCase();
    data = data.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
  }

  // Sort
  data.sort((a, b) => {
    let av = a[_stockSort.col], bv = b[_stockSort.col];
    if (av == null) av = _stockSort.dir > 0 ? -Infinity : Infinity;
    if (bv == null) bv = _stockSort.dir > 0 ? -Infinity : Infinity;
    if (typeof av === 'string') return av.localeCompare(bv) * _stockSort.dir;
    return (av - bv) * _stockSort.dir;
  });

  if (!data.length) {
    body.innerHTML = '<tr><td colspan="7" class="loading-cell">No results found.</td></tr>';
    return;
  }

  body.innerHTML = data.map(s => {
    const chgCls = colorClass(s.change);
    const isSelected = _selectedStock?.symbol === s.symbol ? ' class="selected"' : '';
    return `<tr onclick="selectStock('${s.symbol}')"${isSelected}>
      <td class="sym">${s.symbol}</td>
      <td class="name-cell">${s.name}</td>
      <td>${s.price != null ? '$' + fmt(s.price) : '—'}</td>
      <td class="${chgCls}">${fmtPct(s.change)}</td>
      <td class="sector-cell">${s.sector}</td>
      <td>${s.pe != null ? fmt(s.pe, 1) : '—'}</td>
      <td>${fmtBig(s.mktcap)}</td>
    </tr>`;
  }).join('');
}

window.filterStocks = function() {
  _stockFilter.query = document.getElementById('stockSearch').value;
  renderStocksTable();
};

window.filterSector = function(sector, btn) {
  _stockFilter.sector = sector;
  document.querySelectorAll('.sector-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderStocksTable();
};

window.sortStocks = function(col) {
  if (_stockSort.col === col) _stockSort.dir *= -1;
  else { _stockSort.col = col; _stockSort.dir = 1; }
  renderStocksTable();
};

// ── STOCK DETAIL ──
window.selectStock = async function(symbol) {
  _selectedStock = _stockData.find(s => s.symbol === symbol);
  if (!_selectedStock) return;
  renderStocksTable(); // re-highlight

  const panel = document.getElementById('stockDetailPanel');
  const s = _selectedStock;
  panel.innerHTML = `
    <div class="detail-header">
      <div class="detail-sym">${s.symbol}</div>
      <div class="detail-name">${s.name}</div>
      <div class="detail-price">${s.price != null ? '$'+fmt(s.price) : '—'}</div>
      <div class="detail-change ${colorClass(s.change)}">${fmtPct(s.change)} today</div>
    </div>
    <div class="detail-stats">
      <div class="stat-item"><div class="stat-label">SECTOR</div><div class="stat-val">${s.sector}</div></div>
      <div class="stat-item"><div class="stat-label">P/E RATIO</div><div class="stat-val">${s.pe != null ? fmt(s.pe,1) : '—'}</div></div>
      <div class="stat-item"><div class="stat-label">MKT CAP</div><div class="stat-val">${fmtBig(s.mktcap)}</div></div>
      <div class="stat-item"><div class="stat-label">1D CHANGE</div><div class="stat-val ${colorClass(s.change)}">${fmtPct(s.change)}</div></div>
    </div>
    <div class="detail-chart-wrap">
      <div class="panel-title">PRICE HISTORY</div>
      <div class="detail-range" id="stockRangeBtns">
        <button onclick="loadStockHistory('${symbol}','5d',this)">5D</button>
        <button onclick="loadStockHistory('${symbol}','1mo',this)">1M</button>
        <button onclick="loadStockHistory('${symbol}','3mo',this)">3M</button>
        <button onclick="loadStockHistory('${symbol}','1y',this)" class="active">1Y</button>
        <button onclick="loadStockHistory('${symbol}','5y',this)">5Y</button>
        <button onclick="loadStockHistory('${symbol}','10y',this)">10Y</button>
        <button onclick="loadStockHistory('${symbol}','max',this)">MAX(26Y+)</button>
      </div>
      <div style="height:200px;position:relative;">
        <canvas id="stockDetailCanvas"></canvas>
      </div>
      <div id="stockFundamentals" style="margin-top:0.8rem;font-size:11px;color:#8899aa;">
        Loading historical data…
      </div>
    </div>`;

  loadStockHistory(symbol, '1y', document.querySelector('#stockRangeBtns .active'));
};

window.loadStockHistory = async function(symbol, range, btn) {
  if (btn) {
    document.querySelectorAll('#stockRangeBtns button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  const intervals = { '5d': '1d', '1mo': '1d', '3mo': '1wk', '1y': '1wk', '5y': '1mo', '10y': '1mo', 'max': '1mo' };
  const interval = intervals[range] || '1wk';
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy);
    const outer = await res.json();
    const data = JSON.parse(outer.contents);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No data');

    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;
    const adjClose = result.indicators.adjclose?.[0]?.adjclose || closes;

    const points = timestamps.map((t, i) => ({
      x: new Date(t * 1000),
      y: adjClose[i] ?? closes[i]
    })).filter(p => p.y != null);

    renderStockDetailChart(points, symbol);

    const first = points[0]?.y;
    const last = points[points.length-1]?.y;
    const totalReturn = first ? ((last - first) / first * 100) : null;
    const maxP = Math.max(...points.map(p=>p.y));
    const minP = Math.min(...points.map(p=>p.y));
    const startDate = points[0]?.x.toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'});

    document.getElementById('stockFundamentals').innerHTML = `
      <div class="detail-stats" style="margin-top:0.5rem;">
        <div class="stat-item"><div class="stat-label">FROM DATE</div><div class="stat-val">${startDate || '—'}</div></div>
        <div class="stat-item"><div class="stat-label">PERIOD RETURN</div><div class="stat-val ${colorClass(totalReturn)}">${fmtPct(totalReturn)}</div></div>
        <div class="stat-item"><div class="stat-label">PERIOD HIGH</div><div class="stat-val">$${fmt(maxP)}</div></div>
        <div class="stat-item"><div class="stat-label">PERIOD LOW</div><div class="stat-val">$${fmt(minP)}</div></div>
      </div>`;
  } catch(e) {
    console.error('Stock history error:', e);
    const el = document.getElementById('stockFundamentals');
    if (el) el.textContent = 'Could not load history (API rate limit or CORS). Try again in a moment.';
  }
};

function renderStockDetailChart(points, symbol) {
  const canvas = document.getElementById('stockDetailCanvas');
  if (!canvas) return;
  if (_stockDetailChart) { _stockDetailChart.destroy(); _stockDetailChart = null; }
  const ctx = canvas.getContext('2d');
  const color = '#00d4aa';
  const opts = baseChartOpts(color);
  opts.plugins.tooltip.callbacks.label = ctx => ` $${fmt(ctx.parsed.y)}`;

  _stockDetailChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        data: points,
        borderColor: color,
        borderWidth: 1.5,
        backgroundColor: makeGradient(ctx, color),
        fill: true,
        pointRadius: 0,
        tension: 0.2,
      }]
    },
    options: opts
  });
}
