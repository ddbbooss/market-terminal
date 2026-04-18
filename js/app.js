// ═══════════════════════════════════════
//  MARKET TERMINAL — App Bootstrap
// ═══════════════════════════════════════

// Override tab-btn active logic more precisely
document.querySelectorAll('.tab-btn').forEach((btn, i) => {
  const tabs = ['overview','stocks','crypto','metals','screener'];
  btn.onclick = () => switchTab(tabs[i]);
});

// ── OVERVIEW: Live price cards ──
async function loadOverviewPrices() {
  const pairs = [
    { sym: '^GSPC',  priceId: 'spx-price',    changeId: 'spx-change'    },
    { sym: '^NDX',   priceId: 'qqq-price',     changeId: 'qqq-change'    },
    { sym: 'BTC-USD',priceId: 'btc-price',     changeId: 'btc-change'    },
    { sym: 'ETH-USD',priceId: 'eth-price',     changeId: 'eth-change'    },
    { sym: 'GLD',    priceId: 'gold-price',    changeId: 'gold-change',  mult: 9.28 },
    { sym: 'SLV',    priceId: 'silver-price',  changeId: 'silver-change' },
  ];

  for (const p of pairs) {
    try {
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(p.sym)}&fields=regularMarketPrice,regularMarketChangePercent`;
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxy);
      const outer = await res.json();
      const data  = JSON.parse(outer.contents);
      const q     = data?.quoteResponse?.result?.[0];
      if (!q) continue;

      const price  = (q.regularMarketPrice || 0) * (p.mult || 1);
      const change = q.regularMarketChangePercent || 0;

      setEl(p.priceId, '$' + fmt(price, price > 1000 ? 2 : 4));
      const chgEl = document.getElementById(p.changeId);
      if (chgEl) {
        chgEl.textContent = fmtPct(change);
        chgEl.className = 'ov-change ' + colorClass(change);
      }
    } catch(e) { /* silent */ }
  }
}

// ── TICKER BAR ──
async function buildTickerBar() {
  try {
    const syms = ['^GSPC', '^NDX', '^DJI', 'BTC-USD', 'ETH-USD', 'GLD', 'SLV', 'AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN'];
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${syms.join(',')}&fields=regularMarketPrice,regularMarketChangePercent,shortName`;
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res  = await fetch(proxy);
    const outer = await res.json();
    const data  = JSON.parse(outer.contents);
    const quotes = data?.quoteResponse?.result || [];

    const parts = quotes.map(q => {
      const chg = q.regularMarketChangePercent;
      const sign = chg >= 0 ? '+' : '';
      const cls  = chg >= 0 ? 'color:#00d4aa' : 'color:#ff3b5c';
      return `<span style="margin-right:2rem"><span style="color:#8899aa">${q.symbol.replace('^','').replace('-USD','')}</span> <span>$${fmt(q.regularMarketPrice,2)}</span> <span style="${cls}">${sign}${fmt(chg,2)}%</span></span>`;
    }).join('  ·  ');

    setEl('tickerBar', parts + '  ·  ' + parts); // duplicate for scroll effect
  } catch(e) {
    setEl('tickerBar', 'Market data loading…');
  }
}

// ── INIT ──
async function init() {
  await Promise.all([
    loadOverviewPrices(),
    loadOverviewChart(),
    buildTickerBar(),
  ]);
  // Pre-load metals prices for overview cards
  loadMetals();
}

init();

// Refresh overview every 90 seconds
setInterval(() => {
  loadOverviewPrices();
  buildTickerBar();
}, 90_000);
