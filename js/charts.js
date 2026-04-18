// ═══════════════════════════════════════
//  MARKET TERMINAL — Charts Module
// ═══════════════════════════════════════

let _ovChart = null;

async function loadOverviewChart() {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=1y&interval=1wk`;
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy);
    const outer = await res.json();
    const data = JSON.parse(outer.contents);
    const result = data?.chart?.result?.[0];
    if (!result) return;

    const ts = result.timestamp;
    const cl = result.indicators.quote[0].close;
    const points = ts.map((t, i) => ({ x: new Date(t * 1000), y: cl[i] })).filter(p => p.y != null);

    const canvas = document.getElementById('ovChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const color = '#00d4aa';
    const opts  = baseChartOpts(color);

    _ovChart = new Chart(ctx, {
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
  } catch(e) {
    console.warn('Overview chart error:', e);
  }
}
