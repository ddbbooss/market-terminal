// ═══════════════════════════════════════
//  MARKET TERMINAL — Metals Module
// ═══════════════════════════════════════

window._metalsLoaded = false;
let _metalChart = null;
let _selectedMetal = null;
let _metalRange = '1Y';

// Metal ETF proxies on Yahoo Finance (freely available)
// GLD = Gold, SLV = Silver, PPLT = Platinum, CPER = Copper
const METAL_PROXIES = {
  XAU: { etf: 'GLD',  multiplier: 9.28,  desc: 'Gold (via GLD ETF × 9.28 ≈ troy oz price)',  elem: 'gold'     },
  XAG: { etf: 'SLV',  multiplier: 1.00,  desc: 'Silver (via SLV ETF ≈ $/oz)',                  elem: 'silver'   },
  XPT: { etf: 'PPLT', multiplier: 10.0,  desc: 'Platinum (via PPLT ETF × 10 ≈ troy oz price)', elem: 'platinum' },
  HG:  { etf: 'HG=F', multiplier: 1.0,   desc: 'Copper Futures (via Yahoo HG=F)',               elem: 'copper'   },
};

const RANGE_MAP = {
  '1Y': '1y', '5Y': '5y', '10Y': '10y', '20Y': '20y', 'MAX': 'max'
};

window.loadMetals = async function() {
  window._metalsLoaded = true;

  // Load spot prices for overview cards
  const metals = [
    { id: 'XAU', etf: 'GLD',  mult: 9.28,  priceId: 'gold-price',     changeId: 'gold-change',     mPriceId: 'm-gold-price',     mChangeId: 'm-gold-change'     },
    { id: 'XAG', etf: 'SLV',  mult: 1.00,  priceId: 'silver-price',   changeId: 'silver-change',   mPriceId: 'm-silver-price',   mChangeId: 'm-silver-change'   },
    { id: 'XPT', etf: 'PPLT', mult: 10.0,  priceId: null,             changeId: null,              mPriceId: 'm-platinum-price', mChangeId: 'm-platinum-change' },
    { id: 'HG',  etf: 'HG=F', mult: 1.0,   priceId: null,             changeId: null,              mPriceId: 'm-copper-price',   mChangeId: 'm-copper-change'   },
  ];

  for (const m of metals) {
    try {
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${m.etf}&fields=regularMarketPrice,regularMarketChangePercent`;
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxy);
      const outer = await res.json();
      const data = JSON.parse(outer.contents);
      const q = data?.quoteResponse?.result?.[0];
      if (!q) continue;

      const price  = (q.regularMarketPrice || 0) * m.mult;
      const change = q.regularMarketChangePercent || 0;

      if (m.priceId)  setEl(m.priceId,  `$${fmt(price, 2)}`);
      if (m.changeId) {
        const el = document.getElementById(m.changeId);
        if (el) { el.textContent = fmtPct(change); el.className = 'ov-change ' + colorClass(change); }
      }
      if (m.mPriceId) setEl(m.mPriceId,  `$${fmt(price, 2)}`);
      if (m.mChangeId) {
        const el = document.getElementById(m.mChangeId);
        if (el) { el.textContent = fmtPct(change); el.className = 'metal-change ' + colorClass(change); }
      }
    } catch(e) {
      console.warn('Metal price error', m.id, e);
    }
  }
};

window.selectMetal = async function(metalId, metalName) {
  _selectedMetal = metalId;

  // Highlight card
  document.querySelectorAll('.metal-card').forEach(c => c.classList.remove('active'));
  const cardMap = { XAU: 'mc-gold', XAG: 'mc-silver', XPT: 'mc-platinum', HG: 'mc-copper' };
  const card = document.getElementById(cardMap[metalId]);
  if (card) card.classList.add('active');

  document.getElementById('metalChartTitle').textContent = `${metalName} — PRICE HISTORY (${_metalRange})`;
  await loadMetalHistory(metalId, _metalRange);
};

window.setMetalRange = async function(range, btn) {
  _metalRange = range;
  document.querySelectorAll('.metals-detail .range-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (_selectedMetal) {
    const nameMap = { XAU:'Gold', XAG:'Silver', XPT:'Platinum', HG:'Copper' };
    document.getElementById('metalChartTitle').textContent = `${nameMap[_selectedMetal]} — PRICE HISTORY (${range})`;
    await loadMetalHistory(_selectedMetal, range);
  }
};

async function loadMetalHistory(metalId, range) {
  const proxy_info = METAL_PROXIES[metalId];
  if (!proxy_info) return;

  const yahoRange = RANGE_MAP[range] || '1y';
  const intervals = { '1y':'1wk', '5y':'1mo', '10y':'1mo', '20y':'1mo', 'max':'1mo' };
  const interval = intervals[yahoRange] || '1mo';

  const statsEl = document.getElementById('metalStatsRow');
  if (statsEl) statsEl.innerHTML = '<div style="color:#4a5a6a;padding:0.5rem;">Loading history…</div>';

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${proxy_info.etf}?range=${yahoRange}&interval=${interval}`;
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy);
    const outer = await res.json();
    const data = JSON.parse(outer.contents);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No chart data');

    const timestamps = result.timestamp;
    const adj = result.indicators.adjclose?.[0]?.adjclose || result.indicators.quote[0].close;

    const mult = proxy_info.multiplier;
    const points = timestamps.map((t, i) => ({
      x: new Date(t * 1000),
      y: adj[i] != null ? adj[i] * mult : null
    })).filter(p => p.y != null);

    renderMetalChart(points, metalId);

    const first = points[0]?.y;
    const last  = points[points.length-1]?.y;
    const ret   = first ? ((last - first) / first * 100) : null;
    const hi    = Math.max(...points.map(p => p.y));
    const lo    = Math.min(...points.map(p => p.y));
    const startD = points[0]?.x.toLocaleDateString('en-US', {year:'numeric', month:'short'});
    const endD   = points[points.length-1]?.x.toLocaleDateString('en-US', {year:'numeric', month:'short'});

    if (statsEl) statsEl.innerHTML = `
      <div class="metal-stat"><div class="ms-label">START DATE</div><div class="ms-val">${startD}</div></div>
      <div class="metal-stat"><div class="ms-label">END DATE</div><div class="ms-val">${endD}</div></div>
      <div class="metal-stat"><div class="ms-label">PERIOD RETURN</div><div class="ms-val ${colorClass(ret)}">${fmtPct(ret)}</div></div>
      <div class="metal-stat"><div class="ms-label">PERIOD HIGH</div><div class="ms-val">$${fmt(hi, 2)}</div></div>
      <div class="metal-stat"><div class="ms-label">PERIOD LOW</div><div class="ms-val">$${fmt(lo, 2)}</div></div>
      <div class="metal-stat"><div class="ms-label">DATA POINTS</div><div class="ms-val">${points.length}</div></div>
    `;
  } catch(e) {
    if (statsEl) statsEl.innerHTML = `<div style="color:#ff3b5c;padding:0.5rem;">Failed: ${e.message}. Try again.</div>`;
  }
}

function renderMetalChart(points, metalId) {
  const canvas = document.getElementById('metalChart');
  if (!canvas) return;
  if (_metalChart) { _metalChart.destroy(); _metalChart = null; }
  const ctx = canvas.getContext('2d');

  const colors = { XAU: '#f5c842', XAG: '#c0c8d8', XPT: '#b0c8d8', HG: '#e07040' };
  const color = colors[metalId] || '#00d4aa';
  const opts = baseChartOpts(color);

  _metalChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        data: points,
        borderColor: color,
        borderWidth: 1.8,
        backgroundColor: makeGradient(ctx, color),
        fill: true,
        pointRadius: 0,
        tension: 0.2
      }]
    },
    options: opts
  });
}
