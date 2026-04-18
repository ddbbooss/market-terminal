// ═══════════════════════════════════════
//  MARKET TERMINAL — Screener Module
// ═══════════════════════════════════════

let _screenerData = [];

window.buildScreenerData = function() {
  _screenerData = [];

  // From stocks
  if (window._stockData && _stockData.length) {
    _stockData.forEach(s => {
      if (s.price != null) {
        _screenerData.push({
          name: s.symbol,
          fullName: s.name,
          type: 'stocks',
          price: s.price,
          change: s.change,
          extra: s.sector,
          mktcap: s.mktcap
        });
      }
    });
  }

  // From crypto
  if (window._cryptoData && _cryptoData.length) {
    _cryptoData.forEach(c => {
      _screenerData.push({
        name: c.symbol.toUpperCase(),
        fullName: c.name,
        type: 'crypto',
        price: c.current_price,
        change: c.price_change_percentage_24h,
        extra: 'Rank #' + c.market_cap_rank,
        mktcap: c.market_cap
      });
    });
  }
};

window.runScreener = function() {
  buildScreenerData();
  const cls    = document.getElementById('sc-class').value;
  const minP   = parseFloat(document.getElementById('sc-minprice').value) || 0;
  const maxP   = parseFloat(document.getElementById('sc-maxprice').value) || Infinity;
  const minChg = parseFloat(document.getElementById('sc-minchg').value)  ?? -Infinity;
  const maxChg = parseFloat(document.getElementById('sc-maxchg').value)  ?? Infinity;

  let data = _screenerData;
  if (cls !== 'all') data = data.filter(d => d.type === cls);
  data = data.filter(d =>
    d.price >= minP &&
    d.price <= maxP &&
    (d.change ?? 0) >= minChg &&
    (d.change ?? 0) <= maxChg
  );

  const body = document.getElementById('screenerBody');
  if (!data.length) {
    body.innerHTML = '<tr><td colspan="5" class="loading-cell">No results match filters. Load Stocks/Crypto tabs first.</td></tr>';
    return;
  }

  // Sort by market cap desc
  data.sort((a, b) => (b.mktcap || 0) - (a.mktcap || 0));

  body.innerHTML = data.map(d => `
    <tr>
      <td class="sym">${d.name} <span style="color:#4a5a6a;font-size:10px">${d.fullName}</span></td>
      <td style="color:#8899aa;font-size:10px">${d.type.toUpperCase()}</td>
      <td>$${fmt(d.price, d.price > 100 ? 2 : 4)}</td>
      <td class="${colorClass(d.change)}">${fmtPct(d.change)}</td>
      <td>${fmtBig(d.mktcap) || d.extra}</td>
    </tr>`).join('');
};

window.exportCSV = function() {
  buildScreenerData();
  const cls    = document.getElementById('sc-class').value;
  const minP   = parseFloat(document.getElementById('sc-minprice').value) || 0;
  const maxP   = parseFloat(document.getElementById('sc-maxprice').value) || Infinity;
  const minChg = parseFloat(document.getElementById('sc-minchg').value)  ?? -Infinity;
  const maxChg = parseFloat(document.getElementById('sc-maxchg').value)  ?? Infinity;

  let data = _screenerData;
  if (cls !== 'all') data = data.filter(d => d.type === cls);
  data = data.filter(d =>
    d.price >= minP && d.price <= maxP &&
    (d.change ?? 0) >= minChg && (d.change ?? 0) <= maxChg
  );

  const header = 'Symbol,Name,Type,Price (USD),24h Change %,Market Cap\n';
  const rows = data.map(d =>
    `${d.name},"${d.fullName}",${d.type},${d.price},${d.change?.toFixed(2) || ''},${d.mktcap || ''}`
  ).join('\n');

  const blob = new Blob([header + rows], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `market-terminal-screener-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
};
