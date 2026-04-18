// ═══════════════════════════════════════
//  MARKET TERMINAL v3 — Utilities
// ═══════════════════════════════════════

function fmt(n, digits=2) {
  if (n==null||isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
}
function fmtBig(n) {
  if (!n) return '—';
  if (n>=1e12) return '$'+(n/1e12).toFixed(2)+'T';
  if (n>=1e9)  return '$'+(n/1e9).toFixed(2)+'B';
  if (n>=1e6)  return '$'+(n/1e6).toFixed(2)+'M';
  return '$'+fmt(n);
}
function fmtPct(n) {
  if (n==null||isNaN(n)) return '—';
  return (n>=0?'+':'')+fmt(n,2)+'%';
}
function fmtCrypto(n) {
  if (n==null) return '—';
  if (n>=1000)  return '$'+fmt(n,2);
  if (n>=1)     return '$'+fmt(n,4);
  if (n>=0.01)  return '$'+fmt(n,6);
  return '$'+n.toFixed(8);
}
function colorClass(n) {
  if (!n&&n!==0) return 'neutral';
  return n>=0?'up':'down';
}
function setEl(id,html) { const e=document.getElementById(id); if(e) e.innerHTML=html; }

// Clock
function updateClock() {
  const el = document.getElementById('clock');
  if (el) el.textContent = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'});
}
setInterval(updateClock, 1000); updateClock();

// Data age indicator
function showDataAge(isoStr) {
  const el = document.getElementById('dataAge');
  if (!el || !isoStr) return;
  const mins = Math.round((Date.now() - new Date(isoStr).getTime()) / 60000);
  const h = Math.floor(mins/60), m = mins%60;
  const label = h > 0 ? `Data: ${h}h ${m}m ago` : `Data: ${m}m ago`;
  el.textContent = label;
  el.className = 'data-age ' + (mins < 120 ? 'fresh' : 'stale');
}

// Chart helpers
window.baseChartOpts = function(color) {
  return {
    responsive: true, maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f1217', borderColor: '#253040', borderWidth: 1,
        titleColor: '#8899aa', bodyColor: '#d0dae8',
        callbacks: { label: ctx => ' $'+fmt(ctx.parsed.y) }
      }
    },
    scales: {
      x: { type:'time', ticks:{ color:'#4a5a6a', font:{family:'IBM Plex Mono',size:10}, maxTicksLimit:8 }, grid:{color:'#1e2730'} },
      y: { position:'right', ticks:{ color:'#8899aa', font:{family:'IBM Plex Mono',size:10}, callback: v=>'$'+fmt(v,0) }, grid:{color:'#1e2730'} }
    }
  };
};
window.makeGradient = function(ctx, color) {
  const g = ctx.createLinearGradient(0,0,0,300);
  g.addColorStop(0, color+'40'); g.addColorStop(1, color+'00'); return g;
};
