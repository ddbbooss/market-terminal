// ═══════════════════════════════════
//  MARKET TERMINAL — Utilities
// ═══════════════════════════════════

function fmt(n, digits = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtBig(n) {
  if (!n) return '—';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2) + 'M';
  return '$' + fmt(n);
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return sign + fmt(n, 2) + '%';
}

function colorClass(n) {
  if (!n && n !== 0) return 'neutral';
  return n >= 0 ? 'up' : 'down';
}

function setEl(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function setClass(id, cls) {
  const el = document.getElementById(id);
  if (el) el.className = cls;
}

function updateClock() {
  const now = new Date();
  const str = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
  setText('clock', str);
}
setInterval(updateClock, 1000);
updateClock();

function openSettings() {
  document.getElementById('cfg-metals').value = CFG.metalsKey;
  document.getElementById('cfg-alpha').value  = CFG.alphaKey;
  document.getElementById('cfg-fmp').value    = CFG.fmpKey;
  const modal = document.getElementById('settingsModal');
  modal.style.display = 'flex';
}

function closeSettings(e) {
  if (e.target.id === 'settingsModal') document.getElementById('settingsModal').style.display = 'none';
}

function saveSettings() {
  localStorage.setItem('mt_metals_key', document.getElementById('cfg-metals').value.trim());
  localStorage.setItem('mt_alpha_key',  document.getElementById('cfg-alpha').value.trim());
  localStorage.setItem('mt_fmp_key',    document.getElementById('cfg-fmp').value.trim());
  document.getElementById('settingsModal').style.display = 'none';
  location.reload();
}

// Tab switching
window.switchTab = function(name) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => {
    if (b.textContent.toLowerCase().includes(name.substring(0,3))) b.classList.add('active');
  });
  if (name === 'stocks' && !window._stocksLoaded) loadStocks();
  if (name === 'crypto' && !window._cryptoLoaded) loadCrypto();
  if (name === 'metals' && !window._metalsLoaded) loadMetals();
  if (name === 'screener') runScreener();
};

// Flash cell
window.flashCell = function(el, direction) {
  el.classList.remove('flash-up', 'flash-down');
  void el.offsetWidth;
  el.classList.add(direction === 1 ? 'flash-up' : 'flash-down');
};

// Shared chart options
window.baseChartOpts = function(color) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f1217',
        borderColor: '#253040',
        borderWidth: 1,
        titleColor: '#8899aa',
        bodyColor: '#d0dae8',
        callbacks: {
          label: ctx => ' $' + fmt(ctx.parsed.y)
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        ticks: { color: '#4a5a6a', font: { family: 'IBM Plex Mono', size: 10 }, maxTicksLimit: 8 },
        grid: { color: '#1e2730' }
      },
      y: {
        position: 'right',
        ticks: { color: '#8899aa', font: { family: 'IBM Plex Mono', size: 10 }, callback: v => '$' + fmt(v, 0) },
        grid: { color: '#1e2730' }
      }
    }
  };
};

window.makeGradient = function(ctx, color) {
  const g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, color + '40');
  g.addColorStop(1, color + '00');
  return g;
};
