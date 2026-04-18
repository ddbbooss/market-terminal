# 📊 MARKET TERMINAL

> A Bloomberg-style financial dashboard — stocks, crypto, metals — deployed free on GitHub Pages.

![Preview](https://img.shields.io/badge/Status-Live-00d4aa?style=flat-square) ![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## 🚀 Quick Deploy (5 minutes)

### 1. Create a new GitHub repository
Go to [github.com/new](https://github.com/new) → name it `market-terminal` → **Public** → Create.

### 2. Upload these files
Either drag-drop all files into the GitHub web UI, or use git:
```bash
git clone https://github.com/YOUR_USERNAME/market-terminal
# copy all files into the folder
cd market-terminal
git add .
git commit -m "Initial deploy"
git push origin main
```

### 3. Enable GitHub Pages
- Go to your repo → **Settings** → **Pages**
- Source: **GitHub Actions**
- The workflow will auto-deploy on every push

### 4. Your live URL
```
https://YOUR_USERNAME.github.io/market-terminal/
```

---

## 📈 Features

### Overview Dashboard
- Live prices: S&P 500, NASDAQ 100, BTC, ETH, Gold, Silver
- S&P 500 1-year performance chart
- Top crypto movers (24h)
- Live scrolling ticker bar
- Auto-refresh every 90 seconds

### 📊 Equities (S&P 500)
- **163+ stocks** pre-loaded with full sector tagging
- Sector filters: Tech, Health, Finance, Energy, Consumer, Industrial, Defence, Entertainment, Utilities, and more
- Live prices + daily change % (via Yahoo Finance)
- P/E ratio and Market Cap
- **Historical charts up to 26+ years** per stock (1D → MAX)
- Click any row → detail panel with stats + chart
- Search by symbol or company name
- Sort by any column

### ◆ Crypto
- **Top 500 coins** via CoinGecko (50 per page, paginated)
- 24h and 7D price change
- ATH, circulating supply, max supply, volume
- Historical charts from **2016 to today** (MAX range via CoinGecko)
- Page through ranks 1–500+
- Search by name or symbol

### ◉ Precious Metals
| Metal    | Source            | History |
|----------|-------------------|---------|
| Gold     | GLD ETF (×9.28)   | 26+ years |
| Silver   | SLV ETF           | 26+ years |
| Platinum | PPLT ETF (×10)    | ~15 years |
| Copper   | HG=F Futures      | 26+ years |

- 5 time ranges: 1Y · 5Y · 10Y · 20Y · MAX (~26Y)
- Period return, high, low stats

### ⊞ Screener
- Filter across all asset classes simultaneously
- Min/max price filter
- Min/max 24h change filter
- **Export to CSV**

---

## 🔑 Optional API Keys (for higher limits)

Open the **⚙ CONFIG** button in the top-right corner. Keys are stored in your browser's `localStorage` only.

| Service | Free Tier | Used For |
|---------|-----------|----------|
| [metals-api.com](https://metals-api.com) | 100 req/mo | Real spot metal prices |
| [Alpha Vantage](https://alphavantage.co/support/#api-key) | 25 req/day | Extended stock fundamentals |
| [Financial Modeling Prep](https://financialmodelingprep.com/developer/docs/) | 250 req/day | P/E, EPS, DCF data |

**Without keys**, the app uses:
- Yahoo Finance (via allorigins CORS proxy) for stocks and metals
- CoinGecko free API for crypto

---

## 🗂 File Structure

```
market-terminal/
├── index.html              # Main app shell
├── css/
│   └── style.css           # Bloomberg dark theme
├── js/
│   ├── config.js           # S&P 500 company list + API config
│   ├── utils.js            # Shared helpers, clock, tab switching
│   ├── charts.js           # Overview chart
│   ├── stocks.js           # Equities module
│   ├── crypto.js           # Crypto module
│   ├── metals.js           # Metals module
│   ├── screener.js         # Cross-asset screener
│   └── app.js              # Bootstrap & ticker
└── .github/
    └── workflows/
        └── deploy.yml      # Auto GitHub Pages deployment
```

---

## 📡 Data Sources

| Data | Source | Notes |
|------|--------|-------|
| Stock prices | Yahoo Finance API (free) | Via allorigins.win CORS proxy |
| Stock history | Yahoo Finance chart API | Up to `max` range (~26Y for old stocks) |
| Crypto prices | CoinGecko API v3 (free) | Rate limit: ~10-30 req/min |
| Crypto history | CoinGecko market chart | `days=max` gives data from 2016+ for BTC/ETH |
| Metal prices | Yahoo Finance (ETF proxies) | GLD, SLV, PPLT, HG=F futures |
| Metal history | Yahoo Finance chart API | Up to `max` (~26 years) |

---

## ⚠️ Known Limitations

- **CoinGecko rate limits**: Free tier allows ~10-30 calls/min. If you hit a rate limit, wait 60 seconds before switching to the Crypto tab again.
- **Yahoo Finance CORS proxy**: `allorigins.win` is a free public proxy. For production use, consider self-hosting a proxy or using a backend.
- **P/E ratios**: Only available for stocks that report trailing PE to Yahoo Finance. Many will show `—`.
- **Metals are ETF-proxied**: GLD × 9.28 approximates gold spot price. For exact spot prices, use the metals-api.com key in Config.

---

## 🛠 Customization

### Add more stocks
Edit `js/config.js` — add entries to the `SP500` array:
```javascript
{symbol:'PLTR', name:'Palantir Technologies', sector:'Technology'},
```

### Change refresh rate
In `js/app.js`, change `90_000` (milliseconds):
```javascript
setInterval(() => { ... }, 60_000); // every 60 seconds
```

### Add your own sector
Add a sector button in `index.html`:
```html
<button class="sector-btn" onclick="filterSector('Biotech', this)">BIOTECH</button>
```
Then tag stocks with `sector:'Biotech'` in `config.js`.

---

## 📄 License

MIT — free to use, fork, and modify.
