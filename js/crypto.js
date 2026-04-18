// ═══════════════════════════════════════
//  MARKET TERMINAL — Crypto Module
// ═══════════════════════════════════════

let _cryptoData = [];
let _cryptoPage  = 1;
let _cryptoPerPage = 50;
let _cryptoRange = '1';
let _cryptoQuery = '';
let _cryptoDetailChart = null;
window._cryptoLoaded = false;

window.loadCrypto = async function() {
  window._cryptoLoaded = true;
  await fetchCryptoPage(_cryptoPage);
};

async function fetchCryptoPage(page) {
  document.getElementById('cryptoBody').innerHTML =
    `<tr><td colspan="8" class="loading-cell">Fetching CoinGecko data (page ${page})…</td></tr>`;
  try {
    // CoinGecko free API — up to 250 coins per call, page support
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${_cryptoPerPage}&page=${page}&sparkline=false&price_change_percentage=24h,7d`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _cryptoData = data;
    renderCryptoTable();
    updateCryptoMovers();
    buildScreenerData();
    document.getElementById('cryptoPageInfo').textContent = `Page ${page} (rank ${(page-1)*_cryptoPerPage+1}–${page*_cryptoPerPage})`;
  } catch(e) {
    document.getElementById('cryptoBody').innerHTML =
      `<tr><td colspan="8" class="loading-cell">CoinGecko rate limited. Wait 60 s then switch tabs to retry. Error: ${e.message}</td></tr>`;
  }
}

function renderCryptoTable() {
  let data = _cryptoData;
  if (_cryptoQuery) {
    const q = _cryptoQuery.toLowerCase();
    data = data.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
  }
  const body = document.getElementById('cryptoBody');
  if (!data.length) { body.innerHTML = '<tr><td colspan="8" class="loading-cell">No results.</td></tr>'; return; }

  body.innerHTML = data.map((c, i) => {
    const chg24 = c.price_change_percentage_24h;
    const chg7  = c.price_change_percentage_7d_in_currency;
    return `<tr onclick="selectCoin('${c.id}')">
      <td style="color:#4a5a6a">${c.market_cap_rank || ((_cryptoPage-1)*_cryptoPerPage + i + 1)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <img src="${c.image}" width="18" height="18" style="border-radius:50%;flex-shrink:0;" onerror="this.style.display='none'" />
          <span style="color:#0096ff;font-weight:600">${c.symbol.toUpperCase()}</span>
          <span style="color:#8899aa;font-size:10px">${c.name}</span>
        </div>
      </td>
      <td>$${fmtCrypto(c.current_price)}</td>
      <td class="${colorClass(chg24)}">${fmtPct(chg24)}</td>
      <td class="${colorClass(chg7)}">${fmtPct(chg7)}</td>
      <td>${fmtBig(c.market_cap)}</td>
      <td>${fmtBig(c.total_volume)}</td>
      <td>$${fmtCrypto(c.ath)}</td>
    </tr>`;
  }).join('');
}

function fmtCrypto(n) {
  if (n == null) return '—';
  if (n >= 1000) return fmt(n, 2);
  if (n >= 1)    return fmt(n, 4);
  if (n >= 0.01) return fmt(n, 6);
  return n.toFixed(8);
}

window.filterCrypto = function() {
  _cryptoQuery = document.getElementById('cryptoSearch').value;
  renderCryptoTable();
};

window.cryptoPage = function(dir) {
  _cryptoPage = Math.max(1, _cryptoPage + dir);
  fetchCryptoPage(_cryptoPage);
};

window.setCryptoRange = function(range, btn) {
  _cryptoRange = range;
  document.querySelectorAll('#tab-crypto .range-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (_cryptoDetailChart && window._currentCoinId) {
    loadCoinHistory(window._currentCoinId, range);
  }
};

// ── COIN DETAIL ──
window.selectCoin = async function(id) {
  window._currentCoinId = id;
  const coin = _cryptoData.find(c => c.id === id);
  if (!coin) return;

  const panel = document.getElementById('cryptoDetailPanel');
  panel.innerHTML = `
    <div class="coin-detail-wrap">
      <div class="coin-detail-header">
        <img src="${coin.image}" class="coin-detail-img" onerror="this.style.display='none'"/>
        <div>
          <div class="detail-sym">${coin.symbol.toUpperCase()}</div>
          <div class="detail-name">${coin.name} · Rank #${coin.market_cap_rank}</div>
        </div>
      </div>
      <div class="detail-price">$${fmtCrypto(coin.current_price)}</div>
      <div class="detail-change ${colorClass(coin.price_change_percentage_24h)}">${fmtPct(coin.price_change_percentage_24h)} (24h)</div>
      <div class="detail-stats" style="margin-top:0.8rem;">
        <div class="stat-item"><div class="stat-label">MKT CAP</div><div class="stat-val">${fmtBig(coin.market_cap)}</div></div>
        <div class="stat-item"><div class="stat-label">VOL 24H</div><div class="stat-val">${fmtBig(coin.total_volume)}</div></div>
        <div class="stat-item"><div class="stat-label">ATH</div><div class="stat-val">$${fmtCrypto(coin.ath)}</div></div>
        <div class="stat-item"><div class="stat-label">ATL</div><div class="stat-val">$${fmtCrypto(coin.atl)}</div></div>
        <div class="stat-item"><div class="stat-label">CIRC SUPPLY</div><div class="stat-val">${coin.circulating_supply ? fmt(coin.circulating_supply, 0) : '—'}</div></div>
        <div class="stat-item"><div class="stat-label">MAX SUPPLY</div><div class="stat-val">${coin.max_supply ? fmt(coin.max_supply, 0) : '∞'}</div></div>
      </div>
      <div class="detail-chart-wrap">
        <div class="panel-title">PRICE HISTORY</div>
        <div class="detail-range" id="coinRangeBtns">
          <button onclick="loadCoinHistory('${id}','1',this)">1D</button>
          <button onclick="loadCoinHistory('${id}','7',this)">7D</button>
          <button onclick="loadCoinHistory('${id}','30',this)">1M</button>
          <button onclick="loadCoinHistory('${id}','90',this)">3M</button>
          <button onclick="loadCoinHistory('${id}','365',this)">1Y</button>
          <button onclick="loadCoinHistory('${id}','max',this)" class="active">MAX</button>
        </div>
        <div style="height:200px;position:relative;">
          <canvas id="coinDetailCanvas"></canvas>
        </div>
        <div id="coinStats" style="margin-top:0.5rem;font-size:11px;color:#8899aa;">Loading…</div>
      </div>
    </div>`;

  loadCoinHistory(id, 'max', document.querySelector('#coinRangeBtns .active'));
};

window.loadCoinHistory = async function(id, days, btn) {
  if (btn) {
    document.querySelectorAll('#coinRangeBtns button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const points = data.prices.map(([t, p]) => ({ x: new Date(t), y: p }));
    renderCoinChart(points);

    const first = points[0]?.y;
    const last  = points[points.length-1]?.y;
    const ret   = first ? ((last - first) / first * 100) : null;
    const hi    = Math.max(...points.map(p => p.y));
    const lo    = Math.min(...points.map(p => p.y));
    const startD = points[0]?.x.toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'});
    const el = document.getElementById('coinStats');
    if (el) el.innerHTML = `
      <div class="detail-stats">
        <div class="stat-item"><div class="stat-label">FROM</div><div class="stat-val">${startD}</div></div>
        <div class="stat-item"><div class="stat-label">RETURN</div><div class="stat-val ${colorClass(ret)}">${fmtPct(ret)}</div></div>
        <div class="stat-item"><div class="stat-label">PERIOD HIGH</div><div class="stat-val">$${fmtCrypto(hi)}</div></div>
        <div class="stat-item"><div class="stat-label">PERIOD LOW</div><div class="stat-val">$${fmtCrypto(lo)}</div></div>
      </div>`;
  } catch(e) {
    const el = document.getElementById('coinStats');
    if (el) el.textContent = 'Rate limited by CoinGecko. Try again in 60s.';
  }
};

function renderCoinChart(points) {
  const canvas = document.getElementById('coinDetailCanvas');
  if (!canvas) return;
  if (_cryptoDetailChart) { _cryptoDetailChart.destroy(); _cryptoDetailChart = null; }
  const ctx = canvas.getContext('2d');
  const color = '#f5a623';
  const opts = baseChartOpts(color);
  opts.plugins.tooltip.callbacks.label = c => ` $${fmtCrypto(c.parsed.y)}`;
  opts.scales.y.ticks.callback = v => '$' + fmtCrypto(v);

  _cryptoDetailChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        data: points,
        borderColor: color,
        borderWidth: 1.5,
        backgroundColor: makeGradient(ctx, color),
        fill: true,
        pointRadius: 0,
        tension: 0.2
      }]
    },
    options: opts
  });
}

function updateCryptoMovers() {
  const sorted = [..._cryptoData].sort((a, b) =>
    Math.abs(b.price_change_percentage_24h || 0) - Math.abs(a.price_change_percentage_24h || 0)
  ).slice(0, 15);

  const el = document.getElementById('cryptoMovers');
  if (!el) return;
  el.innerHTML = sorted.map(c => {
    const pct = c.price_change_percentage_24h;
    return `<div class="mover-row">
      <span class="mover-sym">${c.symbol.toUpperCase()}</span>
      <span class="mover-name">${c.name}</span>
      <span class="mover-pct ${colorClass(pct)}">${fmtPct(pct)}</span>
    </div>`;
  }).join('');
}
