// ═══════════════════════════════════════════════════════
//  MARKET TERMINAL v3 — Main App (reads local JSON data)
// ═══════════════════════════════════════════════════════

// ── Global state ──
const STATE = {
  overview:       null,
  stocksQuotes:   null,
  historyMonthly: null,
  cryptoMarkets:  null,
  cryptoHistory:  null,
  metals:         null,

  stocksFilter: { sector:'all', query:'' },
  stocksSort:   { col:'mktcap', dir:-1 },
  stockSelected: null,
  stockDetailChart: null,

  cryptoPage: 0,
  cryptoPerPage: 50,
  cryptoFilter: '',
  cryptoSort: { col:'market_cap_rank', dir:1 },
  cryptoSelected: null,
  cryptoDetailChart: null,

  metalSelected: null,
  metalRange: 'MAX',
  metalChart: null,

  screenerData: [],
  ovChart: null,
};

// ── Data loading ──
async function loadJSON(path) {
  const res = await fetch(path + '?v=' + Date.now());
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

async function loadAllData() {
  try {
    const [ov, sq, hm, cm, ch, mt] = await Promise.all([
      loadJSON('data/overview.json'),
      loadJSON('data/stocks_quotes.json'),
      loadJSON('data/history_monthly.json'),
      loadJSON('data/crypto_markets.json'),
      loadJSON('data/crypto_history.json'),
      loadJSON('data/metals.json'),
    ]);
    STATE.overview       = ov;
    STATE.stocksQuotes   = sq;
    STATE.historyMonthly = hm;
    STATE.cryptoMarkets  = cm;
    STATE.cryptoHistory  = ch;
    STATE.metals         = mt;

    // Show data freshness from stocks timestamp
    showDataAge(sq.updated);

    renderOverview();
    renderStocksTable();
    buildSectorFilters();
    renderCryptoTable();
    renderMetalCards();
    buildScreener();
  } catch(e) {
    console.error('Data load error:', e);
    // Data files don't exist yet — show helpful message
    document.getElementById('tickerBar').innerHTML =
      '<span style="color:#f5a623">⚠ No data files yet. Go to GitHub → Actions → Run workflow manually to fetch data for the first time.</span>';
  }
}

// ═══════════════════════════════
//  TAB SWITCHING
// ═══════════════════════════════
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
  });
});

// ═══════════════════════════════
//  OVERVIEW
// ═══════════════════════════════
function renderOverview() {
  if (!STATE.overview) return;
  const ticker = STATE.overview.ticker || [];

  // Ticker bar
  const parts = ticker.map(q => {
    const chg = q.change || 0;
    const cls = chg >= 0 ? 'color:#00d4aa' : 'color:#ff3b5c';
    const sym = q.symbol.replace('^','').replace('-USD','');
    return `<span style="margin-right:2rem"><span style="color:#8899aa">${sym}</span> $${fmt(q.price||0,2)} <span style="${cls}">${fmtPct(chg)}</span></span>`;
  }).join('  ·  ');
  setEl('tickerBar', parts + '  ·  ' + parts);

  // Overview cards — key assets
  const cardDefs = [
    { sym:'^GSPC',   label:'S&P 500' },
    { sym:'^NDX',    label:'NASDAQ 100' },
    { sym:'^DJI',    label:'DOW JONES' },
    { sym:'^VIX',    label:'VIX' },
    { sym:'BTC-USD', label:'BITCOIN' },
    { sym:'ETH-USD', label:'ETHEREUM' },
    { sym:'GLD',     label:'GOLD (GLD)' },
    { sym:'SLV',     label:'SILVER (SLV)' },
  ];
  const bySymbol = {};
  ticker.forEach(q => bySymbol[q.symbol] = q);

  const html = cardDefs.map(def => {
    const q = bySymbol[def.sym] || {};
    const chgCls = colorClass(q.change);
    return `<div class="overview-card">
      <div class="ov-label">${def.label}</div>
      <div class="ov-price">$${fmt(q.price||0, q.price > 100 ? 2 : 4)}</div>
      <div class="ov-change ${chgCls}">${fmtPct(q.change)}</div>
    </div>`;
  }).join('');
  setEl('overviewCards', html);

  // SP500 overview chart
  if (STATE.historyMonthly?.data?.SP500) {
    const pts = STATE.historyMonthly.data.SP500.map(([t, p]) => ({ x: new Date(t), y: p }));
    const canvas = document.getElementById('ovChart');
    if (canvas) {
      if (STATE.ovChart) { STATE.ovChart.destroy(); STATE.ovChart = null; }
      const ctx = canvas.getContext('2d');
      const color = '#00d4aa';
      const opts = baseChartOpts(color);
      STATE.ovChart = new Chart(ctx, {
        type: 'line',
        data: { datasets: [{ data: pts, borderColor: color, borderWidth: 1.5, backgroundColor: makeGradient(ctx, color), fill: true, pointRadius: 0, tension: 0.2 }] },
        options: opts
      });
    }
  }

  // Crypto movers
  if (STATE.cryptoMarkets?.data) {
    const sorted = [...STATE.cryptoMarkets.data]
      .filter(c => c.price_change_percentage_24h != null)
      .sort((a,b) => Math.abs(b.price_change_percentage_24h) - Math.abs(a.price_change_percentage_24h))
      .slice(0, 15);
    const moversHtml = sorted.map(c => {
      const pct = c.price_change_percentage_24h;
      return `<div class="mover-row">
        <span class="mover-sym">${c.symbol.toUpperCase()}</span>
        <span class="mover-name">${c.name}</span>
        <span class="mover-pct ${colorClass(pct)}">${fmtPct(pct)}</span>
      </div>`;
    }).join('');
    setEl('cryptoMovers', moversHtml);
  }
}

// ═══════════════════════════════
//  STOCKS
// ═══════════════════════════════
function buildSectorFilters() {
  if (!STATE.stocksQuotes?.data) return;
  const sectors = ['all', ...new Set(STATE.stocksQuotes.data.map(s => s.sector).filter(Boolean).sort())];
  const html = sectors.map(s => {
    const label = s === 'all' ? 'ALL' : s.toUpperCase().replace(' ','&nbsp;');
    const active = s === 'all' ? ' active' : '';
    return `<button class="sector-btn${active}" onclick="setSector('${s}',this)">${label}</button>`;
  }).join('');
  setEl('sectorFilters', html);

  // Also populate screener sector dropdown
  const sel = document.getElementById('sc-sector');
  if (sel) {
    sectors.filter(s=>s!=='all').forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      sel.appendChild(opt);
    });
  }
}

function getFilteredStocks() {
  if (!STATE.stocksQuotes?.data) return [];
  let data = [...STATE.stocksQuotes.data];
  if (STATE.stocksFilter.sector !== 'all')
    data = data.filter(s => s.sector === STATE.stocksFilter.sector);
  if (STATE.stocksFilter.query) {
    const q = STATE.stocksFilter.query.toLowerCase();
    data = data.filter(s => s.symbol.toLowerCase().includes(q) || (s.name||'').toLowerCase().includes(q));
  }
  data.sort((a,b) => {
    let av = a[STATE.stocksSort.col], bv = b[STATE.stocksSort.col];
    if (av==null) return 1; if (bv==null) return -1;
    return typeof av==='string' ? av.localeCompare(bv)*STATE.stocksSort.dir : (av-bv)*STATE.stocksSort.dir;
  });
  return data;
}

function renderStocksTable() {
  const data = getFilteredStocks();
  if (!data.length) { setEl('stocksBody','<tr><td colspan="11" class="loading-cell">No results.</td></tr>'); return; }
  const html = data.map(s => {
    const sel = STATE.stockSelected?.symbol === s.symbol ? ' class="selected"' : '';
    return `<tr onclick="selectStock('${s.symbol}')"${sel}>
      <td class="sym">${s.symbol}</td>
      <td class="name-cell">${s.name||'—'}</td>
      <td>${s.price!=null?'$'+fmt(s.price):'—'}</td>
      <td class="${colorClass(s.change)}">${fmtPct(s.change)}</td>
      <td class="sector-cell">${s.sector||'—'}</td>
      <td>${s.pe!=null?fmt(s.pe,1):'—'}</td>
      <td>${fmtBig(s.mktcap)}</td>
      <td>${s.high52!=null?'$'+fmt(s.high52):'—'}</td>
      <td>${s.low52!=null?'$'+fmt(s.low52):'—'}</td>
      <td>${s.divYield!=null?fmt(s.divYield*100,2)+'%':'—'}</td>
      <td>${s.eps!=null?'$'+fmt(s.eps,2):'—'}</td>
    </tr>`;
  }).join('');
  setEl('stocksBody', html);
}

window.filterStocks = () => { STATE.stocksFilter.query = document.getElementById('stockSearch').value; renderStocksTable(); };
window.setSector = (sector, btn) => {
  STATE.stocksFilter.sector = sector;
  document.querySelectorAll('.sector-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderStocksTable();
};
window.sortTable = (type, col) => {
  if (type==='stocks') {
    if (STATE.stocksSort.col===col) STATE.stocksSort.dir*=-1;
    else { STATE.stocksSort.col=col; STATE.stocksSort.dir=-1; }
    renderStocksTable();
  } else if (type==='crypto') {
    if (STATE.cryptoSort.col===col) STATE.cryptoSort.dir*=-1;
    else { STATE.cryptoSort.col=col; STATE.cryptoSort.dir=-1; }
    renderCryptoTable();
  }
};

window.selectStock = function(symbol) {
  const s = STATE.stocksQuotes?.data?.find(x => x.symbol===symbol);
  if (!s) return;
  STATE.stockSelected = s;
  renderStocksTable();

  // Find history
  const histKey = symbol.replace('.','');
  const histData = STATE.historyMonthly?.data?.[histKey];

  const panel = document.getElementById('stockDetailPanel');
  panel.innerHTML = `
    <div class="detail-header">
      <div class="detail-sym">${s.symbol}</div>
      <div class="detail-name">${s.name}</div>
      <div class="detail-price">${s.price!=null?'$'+fmt(s.price):'—'}</div>
      <div class="detail-change ${colorClass(s.change)}">${fmtPct(s.change)} today</div>
    </div>
    <div class="detail-stats">
      <div class="stat-item"><div class="stat-label">SECTOR</div><div class="stat-val">${s.sector||'—'}</div></div>
      <div class="stat-item"><div class="stat-label">P/E RATIO</div><div class="stat-val">${s.pe!=null?fmt(s.pe,1):'—'}</div></div>
      <div class="stat-item"><div class="stat-label">MKT CAP</div><div class="stat-val">${fmtBig(s.mktcap)}</div></div>
      <div class="stat-item"><div class="stat-label">EPS (TTM)</div><div class="stat-val">${s.eps!=null?'$'+fmt(s.eps,2):'—'}</div></div>
      <div class="stat-item"><div class="stat-label">DIV YIELD</div><div class="stat-val">${s.divYield!=null?fmt(s.divYield*100,2)+'%':'—'}</div></div>
      <div class="stat-item"><div class="stat-label">52W HIGH</div><div class="stat-val">${s.high52!=null?'$'+fmt(s.high52):'—'}</div></div>
      <div class="stat-item"><div class="stat-label">52W LOW</div><div class="stat-val">${s.low52!=null?'$'+fmt(s.low52):'—'}</div></div>
      <div class="stat-item"><div class="stat-label">AVG VOLUME</div><div class="stat-val">${s.avgVolume?fmt(s.avgVolume,0):'—'}</div></div>
    </div>
    <div class="detail-chart-wrap">
      <div class="panel-title">PRICE HISTORY${histData?'':' (not in cached history — click range to fetch live)'}</div>
      ${histData ? renderStockHistoryChart(histData, symbol) : '<div style="color:#4a5a6a;padding:1rem;font-size:11px;">History for this stock is not pre-cached.<br>Only top stocks have cached history.<br>Clicking below fetches from Yahoo Finance.</div>'}
      <div class="detail-range" id="stockRangeBtns">
        <button onclick="fetchStockHistory('${symbol}','5d',this)">5D</button>
        <button onclick="fetchStockHistory('${symbol}','1mo',this)">1M</button>
        <button onclick="fetchStockHistory('${symbol}','3mo',this)">3M</button>
        <button onclick="fetchStockHistory('${symbol}','1y',this)">1Y</button>
        <button onclick="fetchStockHistory('${symbol}','5y',this)">5Y</button>
        <button onclick="fetchStockHistory('${symbol}','10y',this)">10Y</button>
        <button onclick="fetchStockHistory('${symbol}','max',this)" class="active">MAX (26Y+)</button>
      </div>
      <div id="stockHistStats"></div>
    </div>`;

  if (histData) {
    showHistStats(histData, 'stockHistStats');
  }
};

function renderStockHistoryChart(rawPts, symbol) {
  // Returns placeholder div; chart rendered after DOM insert via setTimeout
  setTimeout(() => {
    const canvas = document.getElementById('stockHistCanvas');
    if (!canvas) return;
    if (STATE.stockDetailChart) { STATE.stockDetailChart.destroy(); STATE.stockDetailChart=null; }
    const pts = rawPts.map(([t,p]) => ({x:new Date(t), y:p}));
    const ctx = canvas.getContext('2d');
    const color = '#00d4aa';
    const opts = baseChartOpts(color);
    STATE.stockDetailChart = new Chart(ctx, {
      type:'line',
      data:{ datasets:[{ data:pts, borderColor:color, borderWidth:1.5, backgroundColor:makeGradient(ctx,color), fill:true, pointRadius:0, tension:0.2 }] },
      options:opts
    });
  }, 50);
  return '<div style="height:180px;position:relative;"><canvas id="stockHistCanvas"></canvas></div>';
}

function showHistStats(rawPts, elId) {
  const pts = rawPts.map(([t,p]) => ({x:new Date(t),y:p}));
  const first=pts[0]?.y, last=pts[pts.length-1]?.y;
  const ret = first ? ((last-first)/first*100) : null;
  const hi=Math.max(...pts.map(p=>p.y)), lo=Math.min(...pts.map(p=>p.y));
  const startD = pts[0]?.x.toLocaleDateString('en-US',{year:'numeric',month:'short'});
  setEl(elId,`<div class="detail-stats" style="margin-top:0.5rem;">
    <div class="stat-item"><div class="stat-label">FROM</div><div class="stat-val">${startD}</div></div>
    <div class="stat-item"><div class="stat-label">TOTAL RETURN</div><div class="stat-val ${colorClass(ret)}">${fmtPct(ret)}</div></div>
    <div class="stat-item"><div class="stat-label">HIST. HIGH</div><div class="stat-val">$${fmt(hi)}</div></div>
    <div class="stat-item"><div class="stat-label">HIST. LOW</div><div class="stat-val">$${fmt(lo)}</div></div>
  </div>`);
}

// Live fetch for stocks not in pre-cached history
window.fetchStockHistory = async function(symbol, range, btn) {
  document.querySelectorAll('#stockRangeBtns button').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  try {
    const intervals = {'5d':'1d','1mo':'1d','3mo':'1wk','1y':'1wk','5y':'1mo','10y':'1mo','max':'1mo'};
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${intervals[range]||'1mo'}`;
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy);
    const outer = await res.json();
    const data = JSON.parse(outer.contents);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No data');
    const ts = result.timestamp;
    const adj = result.indicators.adjclose?.[0]?.adjclose || result.indicators.quote[0].close;
    const rawPts = ts.map((t,i)=>[t*1000, adj[i]]).filter(p=>p[1]!=null);

    // Re-render chart
    const canvas = document.getElementById('stockHistCanvas');
    if (canvas) {
      if (STATE.stockDetailChart) { STATE.stockDetailChart.destroy(); STATE.stockDetailChart=null; }
      const pts = rawPts.map(([t,p])=>({x:new Date(t),y:p}));
      const ctx = canvas.getContext('2d');
      const color='#00d4aa';
      STATE.stockDetailChart = new Chart(ctx,{
        type:'line', data:{datasets:[{data:pts,borderColor:color,borderWidth:1.5,backgroundColor:makeGradient(ctx,color),fill:true,pointRadius:0,tension:0.2}]}, options:baseChartOpts(color)
      });
    }
    showHistStats(rawPts, 'stockHistStats');
  } catch(e) {
    setEl('stockHistStats',`<div style="color:#ff3b5c;font-size:11px;padding:0.5rem;">Live fetch failed. ${e.message}</div>`);
  }
};

// ═══════════════════════════════
//  CRYPTO
// ═══════════════════════════════
function getFilteredCrypto() {
  if (!STATE.cryptoMarkets?.data) return [];
  let data = [...STATE.cryptoMarkets.data];
  if (STATE.cryptoFilter) {
    const q = STATE.cryptoFilter.toLowerCase();
    data = data.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
  }
  data.sort((a,b) => {
    let av=a[STATE.cryptoSort.col], bv=b[STATE.cryptoSort.col];
    if(av==null) return 1; if(bv==null) return -1;
    return (av-bv)*STATE.cryptoSort.dir;
  });
  return data;
}

function renderCryptoTable() {
  const all = getFilteredCrypto();
  const start = STATE.cryptoPage * STATE.cryptoPerPage;
  const data = all.slice(start, start + STATE.cryptoPerPage);
  setEl('cryptoPageInfo', `Showing ${start+1}–${Math.min(start+STATE.cryptoPerPage, all.length)} of ${all.length}`);

  if (!data.length) { setEl('cryptoBody','<tr><td colspan="10" class="loading-cell">No results.</td></tr>'); return; }
  const html = data.map(c => {
    const c24=c.price_change_percentage_24h, c7=c.price_change_percentage_7d_in_currency, c30=c.price_change_percentage_30d_in_currency;
    return `<tr onclick="selectCoin('${c.id}')">
      <td style="color:#4a5a6a">${c.market_cap_rank||'—'}</td>
      <td><div style="display:flex;align-items:center;gap:0.5rem;">
        <img src="${c.image}" width="16" height="16" style="border-radius:50%;flex-shrink:0" onerror="this.style.display='none'"/>
        <span style="color:#0096ff;font-weight:600">${c.symbol.toUpperCase()}</span>
        <span style="color:#8899aa;font-size:10px">${c.name}</span>
      </div></td>
      <td>${fmtCrypto(c.current_price)}</td>
      <td class="${colorClass(c24)}">${fmtPct(c24)}</td>
      <td class="${colorClass(c7)}">${fmtPct(c7)}</td>
      <td class="${colorClass(c30)}">${fmtPct(c30)}</td>
      <td>${fmtBig(c.market_cap)}</td>
      <td>${fmtBig(c.total_volume)}</td>
      <td>${fmtCrypto(c.ath)}</td>
      <td>${c.circulating_supply?fmt(c.circulating_supply,0):'—'}</td>
    </tr>`;
  }).join('');
  setEl('cryptoBody', html);
}

window.filterCrypto = () => { STATE.cryptoFilter=document.getElementById('cryptoSearch').value; STATE.cryptoPage=0; renderCryptoTable(); };
window.cryptoPageChange = (dir) => {
  const all=getFilteredCrypto();
  const maxPage=Math.floor(all.length/STATE.cryptoPerPage);
  STATE.cryptoPage=Math.max(0,Math.min(maxPage,STATE.cryptoPage+dir));
  renderCryptoTable();
};

window.selectCoin = function(id) {
  const c = STATE.cryptoMarkets?.data?.find(x=>x.id===id);
  if (!c) return;
  STATE.cryptoSelected = c;

  const histPts = STATE.cryptoHistory?.data?.[id];
  const panel = document.getElementById('cryptoDetailPanel');
  const c24=c.price_change_percentage_24h;

  panel.innerHTML = `
    <div class="coin-detail-header" style="display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem;">
      <img src="${c.image}" width="32" height="32" style="border-radius:50%" onerror="this.style.display='none'"/>
      <div>
        <div class="detail-sym">${c.symbol.toUpperCase()}</div>
        <div class="detail-name">${c.name} · Rank #${c.market_cap_rank}</div>
      </div>
    </div>
    <div class="detail-price">${fmtCrypto(c.current_price)}</div>
    <div class="detail-change ${colorClass(c24)}">${fmtPct(c24)} (24h)</div>
    <div class="detail-stats" style="margin-top:0.8rem;">
      <div class="stat-item"><div class="stat-label">MKT CAP</div><div class="stat-val">${fmtBig(c.market_cap)}</div></div>
      <div class="stat-item"><div class="stat-label">VOL 24H</div><div class="stat-val">${fmtBig(c.total_volume)}</div></div>
      <div class="stat-item"><div class="stat-label">ATH</div><div class="stat-val">${fmtCrypto(c.ath)}</div></div>
      <div class="stat-item"><div class="stat-label">ATL</div><div class="stat-val">${fmtCrypto(c.atl)}</div></div>
      <div class="stat-item"><div class="stat-label">7D %</div><div class="stat-val ${colorClass(c.price_change_percentage_7d_in_currency)}">${fmtPct(c.price_change_percentage_7d_in_currency)}</div></div>
      <div class="stat-item"><div class="stat-label">30D %</div><div class="stat-val ${colorClass(c.price_change_percentage_30d_in_currency)}">${fmtPct(c.price_change_percentage_30d_in_currency)}</div></div>
      <div class="stat-item"><div class="stat-label">CIRC SUPPLY</div><div class="stat-val">${c.circulating_supply?fmt(c.circulating_supply,0):'—'}</div></div>
      <div class="stat-item"><div class="stat-label">MAX SUPPLY</div><div class="stat-val">${c.max_supply?fmt(c.max_supply,0):'∞'}</div></div>
    </div>
    <div class="detail-chart-wrap" style="margin-top:0.8rem;">
      <div class="panel-title">PRICE HISTORY${histPts?' (pre-cached)':' (top 20 coins only pre-cached)'}</div>
      ${histPts ? '<div style="height:180px;position:relative;"><canvas id="coinHistCanvas"></canvas></div>' : '<div style="color:#4a5a6a;font-size:11px;padding:0.5rem;">History only cached for top 20 coins. Fetching live…</div>'}
      <div id="coinHistStats"></div>
    </div>`;

  if (histPts) {
    setTimeout(() => renderCoinHistChart(histPts, '#f5a623'), 50);
    showCoinHistStats(histPts);
  } else {
    fetchCoinHistLive(id);
  }
};

function renderCoinHistChart(rawPts, color) {
  const canvas = document.getElementById('coinHistCanvas');
  if (!canvas) return;
  if (STATE.cryptoDetailChart) { STATE.cryptoDetailChart.destroy(); STATE.cryptoDetailChart=null; }
  const pts = rawPts.map(([t,p])=>({x:new Date(t),y:p}));
  const ctx = canvas.getContext('2d');
  const opts = baseChartOpts(color);
  opts.plugins.tooltip.callbacks.label = c => ` ${fmtCrypto(c.parsed.y)}`;
  opts.scales.y.ticks.callback = v => fmtCrypto(v);
  STATE.cryptoDetailChart = new Chart(ctx,{
    type:'line', data:{datasets:[{data:pts,borderColor:color,borderWidth:1.5,backgroundColor:makeGradient(ctx,color),fill:true,pointRadius:0,tension:0.2}]}, options:opts
  });
}

function showCoinHistStats(rawPts) {
  const pts = rawPts.map(([t,p])=>({x:new Date(t),y:p}));
  const first=pts[0]?.y, last=pts[pts.length-1]?.y;
  const ret=first?((last-first)/first*100):null;
  const hi=Math.max(...pts.map(p=>p.y)), lo=Math.min(...pts.map(p=>p.y));
  const startD=pts[0]?.x.toLocaleDateString('en-US',{year:'numeric',month:'short'});
  setEl('coinHistStats',`<div class="detail-stats" style="margin-top:0.5rem;">
    <div class="stat-item"><div class="stat-label">FROM</div><div class="stat-val">${startD}</div></div>
    <div class="stat-item"><div class="stat-label">TOTAL RETURN</div><div class="stat-val ${colorClass(ret)}">${fmtPct(ret)}</div></div>
    <div class="stat-item"><div class="stat-label">HIST. HIGH</div><div class="stat-val">${fmtCrypto(hi)}</div></div>
    <div class="stat-item"><div class="stat-label">HIST. LOW</div><div class="stat-val">${fmtCrypto(lo)}</div></div>
  </div>`);
}

async function fetchCoinHistLive(id) {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=max&interval=monthly`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.prices) {
      // Inject canvas if missing
      const wrap = document.querySelector('.detail-chart-wrap');
      if (wrap && !document.getElementById('coinHistCanvas')) {
        const div = document.createElement('div');
        div.style.cssText = 'height:180px;position:relative;';
        div.innerHTML = '<canvas id="coinHistCanvas"></canvas>';
        wrap.insertBefore(div, document.getElementById('coinHistStats'));
      }
      setTimeout(()=>renderCoinHistChart(data.prices,'#f5a623'),50);
      showCoinHistStats(data.prices);
    }
  } catch(e) {
    setEl('coinHistStats','<div style="color:#ff3b5c;font-size:11px;padding:0.5rem;">Live history fetch failed (rate limit). Try again in 60s.</div>');
  }
}

// ═══════════════════════════════
//  METALS
// ═══════════════════════════════
const METAL_COLORS = { XAU:'#f5c842', XAG:'#c0c8d8', XPT:'#b0d8d8', HG:'#e07040' };
const METAL_ELEM   = { XAU:'Au', XAG:'Ag', XPT:'Pt', HG:'Cu' };

function renderMetalCards() {
  if (!STATE.metals?.quotes) return;
  const q = STATE.metals.quotes;
  const html = Object.entries(q).map(([id, m]) => `
    <div class="metal-card" id="mc-${id}" onclick="selectMetal('${id}')">
      <div class="metal-icon" style="color:${METAL_COLORS[id]}">${METAL_ELEM[id]||id}</div>
      <div class="metal-name">${m.name.toUpperCase()}</div>
      <div class="metal-price">$${fmt(m.price,2)}</div>
      <div class="metal-change ${colorClass(m.change)}">${fmtPct(m.change)}</div>
      <div class="metal-unit">USD / troy oz${id==='HG'?' (per lb)':''}</div>
      <div style="font-size:9px;color:#4a5a6a;margin-top:0.3rem;">52W: $${fmt(m.low52)}–$${fmt(m.high52)}</div>
    </div>`).join('');
  setEl('metalsGrid', html);
}

window.selectMetal = function(id) {
  STATE.metalSelected = id;
  document.querySelectorAll('.metal-card').forEach(c=>c.classList.remove('active'));
  const card=document.getElementById('mc-'+id);
  if(card) card.classList.add('active');
  const m = STATE.metals?.quotes?.[id];
  setEl('metalChartTitle', `${m?.name||id} — PRICE HISTORY (${STATE.metalRange})`);
  renderMetalChart();
};

window.setMetalRange = function(range, btn) {
  STATE.metalRange = range;
  document.querySelectorAll('#metalRangeBtns .range-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  if(STATE.metalSelected) {
    const m=STATE.metals?.quotes?.[STATE.metalSelected];
    setEl('metalChartTitle',`${m?.name||STATE.metalSelected} — PRICE HISTORY (${range})`);
    renderMetalChart();
  }
};

function renderMetalChart() {
  const id = STATE.metalSelected;
  if (!id || !STATE.metals?.history?.[id]) return;

  const allPts = STATE.metals.history[id].map(([t,p])=>({x:new Date(t),y:p}));
  const cutoff = {
    '1Y': Date.now()-365*86400000,
    '5Y': Date.now()-5*365*86400000,
    '10Y':Date.now()-10*365*86400000,
    '20Y':Date.now()-20*365*86400000,
    'MAX':0,
  }[STATE.metalRange]||0;
  const pts = allPts.filter(p=>p.x.getTime()>=cutoff);

  const canvas = document.getElementById('metalChart');
  if (!canvas) return;
  if (STATE.metalChart) { STATE.metalChart.destroy(); STATE.metalChart=null; }
  const color = METAL_COLORS[id]||'#00d4aa';
  const ctx = canvas.getContext('2d');
  const opts = baseChartOpts(color);
  STATE.metalChart = new Chart(ctx,{
    type:'line',
    data:{datasets:[{data:pts,borderColor:color,borderWidth:1.8,backgroundColor:makeGradient(ctx,color),fill:true,pointRadius:0,tension:0.2}]},
    options:opts
  });

  // Stats
  const first=pts[0]?.y, last=pts[pts.length-1]?.y;
  const ret=first?((last-first)/first*100):null;
  const hi=Math.max(...pts.map(p=>p.y)), lo=Math.min(...pts.map(p=>p.y));
  const startD=pts[0]?.x.toLocaleDateString('en-US',{year:'numeric',month:'short'});
  setEl('metalStatsRow',`
    <div class="metal-stat"><div class="ms-label">FROM</div><div class="ms-val">${startD}</div></div>
    <div class="metal-stat"><div class="ms-label">PERIOD RETURN</div><div class="ms-val ${colorClass(ret)}">${fmtPct(ret)}</div></div>
    <div class="metal-stat"><div class="ms-label">PERIOD HIGH</div><div class="ms-val">$${fmt(hi)}</div></div>
    <div class="metal-stat"><div class="ms-label">PERIOD LOW</div><div class="ms-val">$${fmt(lo)}</div></div>
    <div class="metal-stat"><div class="ms-label">DATA POINTS</div><div class="ms-val">${pts.length} monthly</div></div>
  `);
}

// ═══════════════════════════════
//  SCREENER
// ═══════════════════════════════
function buildScreener() {
  const data = [];
  // Stocks
  (STATE.stocksQuotes?.data||[]).forEach(s => {
    if (s.price!=null) data.push({name:s.symbol, fullName:s.name, type:'stocks', sector:s.sector, price:s.price, change:s.change, change7:null, mktcap:s.mktcap, pe:s.pe});
  });
  // Crypto
  (STATE.cryptoMarkets?.data||[]).forEach(c => {
    data.push({name:c.symbol.toUpperCase(), fullName:c.name, type:'crypto', sector:'Crypto', price:c.current_price, change:c.price_change_percentage_24h, change7:c.price_change_percentage_7d_in_currency, mktcap:c.market_cap, pe:null});
  });
  // Metals
  Object.entries(STATE.metals?.quotes||{}).forEach(([id,m]) => {
    data.push({name:id, fullName:m.name, type:'metals', sector:'Metals', price:m.price, change:m.change, change7:null, mktcap:null, pe:null});
  });
  STATE.screenerData = data;
  runScreener();
}

window.runScreener = function() {
  const cls    = document.getElementById('sc-class')?.value||'all';
  const minP   = parseFloat(document.getElementById('sc-minprice')?.value)||0;
  const maxP   = parseFloat(document.getElementById('sc-maxprice')?.value)||Infinity;
  const minChg = parseFloat(document.getElementById('sc-minchg')?.value)??-Infinity;
  const maxChg = parseFloat(document.getElementById('sc-maxchg')?.value)??Infinity;
  const sector = document.getElementById('sc-sector')?.value||'';
  const sortBy = document.getElementById('sc-sort')?.value||'mktcap';

  let data = [...STATE.screenerData];
  if (cls!=='all') data=data.filter(d=>d.type===cls);
  if (sector) data=data.filter(d=>d.sector===sector);
  data=data.filter(d=> d.price>=minP && d.price<=maxP && (d.change??0)>=minChg && (d.change??0)<=maxChg);
  data.sort((a,b)=>(b[sortBy]||0)-(a[sortBy]||0));

  setEl('screenerCount',`${data.length} results`);
  if(!data.length){setEl('screenerBody','<tr><td colspan="8" class="loading-cell">No results. Load tabs first.</td></tr>');return;}
  setEl('screenerBody', data.map(d=>`<tr>
    <td class="sym">${d.name} <span style="color:#4a5a6a;font-size:10px">${d.fullName}</span></td>
    <td style="color:#8899aa;font-size:10px">${d.type.toUpperCase()}</td>
    <td class="sector-cell">${d.sector||'—'}</td>
    <td>$${fmt(d.price, d.price>100?2:4)}</td>
    <td class="${colorClass(d.change)}">${fmtPct(d.change)}</td>
    <td class="${colorClass(d.change7)}">${fmtPct(d.change7)}</td>
    <td>${fmtBig(d.mktcap)}</td>
    <td>${d.pe!=null?fmt(d.pe,1):'—'}</td>
  </tr>`).join(''));
};

window.exportCSV = function() {
  const rows = STATE.screenerData.map(d =>
    `${d.name},"${d.fullName}",${d.type},${d.sector||''},${d.price},${d.change?.toFixed(2)||''},${d.change7?.toFixed(2)||''},${d.mktcap||''},${d.pe?.toFixed(1)||''}`
  );
  const csv = 'Symbol,Name,Type,Sector,Price,24h%,7d%,MarketCap,PE\n' + rows.join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = `market-terminal-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
};

// ── INIT ──
loadAllData();
