#!/usr/bin/env python3
"""
MARKET TERMINAL — Daily Data Fetcher
Runs via GitHub Actions. Fetches stocks, crypto, metals and saves as JSON.
"""

import json
import time
import os
from datetime import datetime, timezone
import urllib.request
import urllib.parse
import urllib.error

OUT = "data"
os.makedirs(OUT, exist_ok=True)

def fetch(url, retries=3, delay=4):
    headers = {"User-Agent": "Mozilla/5.0 (compatible; MarketTerminal/2.0)"}
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode())
        except Exception as e:
            print(f"  Attempt {i+1} failed: {e}")
            if i < retries - 1:
                time.sleep(delay)
    return None

def save(name, data):
    path = f"{OUT}/{name}.json"
    with open(path, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"  ✓ Saved {path} ({os.path.getsize(path)//1024}KB)")

# ─────────────────────────────────────────
#  1. STOCKS — S&P 500 quotes (Yahoo Finance)
# ─────────────────────────────────────────
print("\n📈 Fetching S&P 500 quotes...")

SP500_SYMBOLS = [
    "AAPL","MSFT","NVDA","AMZN","META","GOOGL","GOOG","BRK-B","JPM","V",
    "TSLA","UNH","LLY","AVGO","XOM","JNJ","MA","PG","COST","HD","MRK","ABBV",
    "AMD","CRM","PEP","ACN","WMT","BAC","MCD","TMO","CSCO","ABT","ORCL","WFC",
    "NFLX","DIS","CAT","DHR","IBM","GE","INTC","QCOM","GS","RTX","LMT","NOC",
    "BA","GD","ANET","SPGI","HON","AMGN","LOW","DE","INTU","TXN","UNP","PFE",
    "ISRG","BKNG","SBUX","ADP","BLK","SCHW","MDT","GILD","REGN","CVX","AXP",
    "MMC","ETN","SYK","ADI","CI","MO","CB","VRTX","KLAC","MU","SO","NEE","DUK",
    "PLD","COP","LRCX","BSX","EOG","MMM","CME","ICE","PANW","SNPS","CDNS","MCO",
    "ZTS","EQIX","TJX","EMR","ITW","AON","SLB","USB","UBER","CVS","WM","ELV",
    "BDX","EW","APH","CARR","WELL","WDAY","MSI","OKE","SRE","PH","ORLY","HCA",
    "PSA","AJG","PCAR","GWW","ROK","FAST","FICO","MCHP","CTAS","AIG","ALL",
    "AFL","VLO","PSX","MPC","HAL","OXY","TMUS","CMCSA","VZ","T","CHTR",
    "TTWO","EA","LYV","NKE","DHI","LEN","KMB","CL","GIS","KO","PM","FOXA",
    "PARA","NOC","L3HI","HII","NKE","GPC","AZO","TSCO","PHM","CAG","HRL",
    "SJM","MKC","CPB","ATVI","ADM","BKR","FSLR","ENPH","CEG","VST","NRG",
    "PCG","EIX","PPL","AEP","D","FE","EXC","XEL","CMS","ETR","WEC","ES",
    "EVRG","NI","PNW","AES","CNP","LNT","OTIS","CARR","TT","JCI","ROP",
    "AME","VRSK","IDXX","A","ILMN","DXCM","MTD","WAT","BIO","IQV","CRL",
]

# Remove duplicates
SP500_SYMBOLS = list(dict.fromkeys(SP500_SYMBOLS))

SECTORS = {
    "AAPL":"Technology","MSFT":"Technology","NVDA":"Technology","AMZN":"Consumer Discretionary",
    "META":"Communication Services","GOOGL":"Communication Services","GOOG":"Communication Services",
    "BRK-B":"Financials","JPM":"Financials","V":"Financials","TSLA":"Consumer Discretionary",
    "UNH":"Health Care","LLY":"Health Care","AVGO":"Technology","XOM":"Energy",
    "JNJ":"Health Care","MA":"Financials","PG":"Consumer Staples","COST":"Consumer Staples",
    "HD":"Consumer Discretionary","MRK":"Health Care","ABBV":"Health Care","AMD":"Technology",
    "CRM":"Technology","PEP":"Consumer Staples","ACN":"Technology","WMT":"Consumer Staples",
    "BAC":"Financials","MCD":"Consumer Discretionary","TMO":"Health Care","CSCO":"Technology",
    "ABT":"Health Care","ORCL":"Technology","WFC":"Financials","NFLX":"Entertainment",
    "DIS":"Entertainment","CAT":"Industrials","DHR":"Health Care","IBM":"Technology",
    "GE":"Industrials","INTC":"Technology","QCOM":"Technology","GS":"Financials",
    "RTX":"Defense","LMT":"Defense","NOC":"Defense","BA":"Defense","GD":"Defense",
    "ANET":"Technology","SPGI":"Financials","HON":"Industrials","AMGN":"Health Care",
    "LOW":"Consumer Discretionary","DE":"Industrials","INTU":"Technology","TXN":"Technology",
    "UNP":"Industrials","PFE":"Health Care","ISRG":"Health Care","BKNG":"Consumer Discretionary",
    "SBUX":"Consumer Discretionary","ADP":"Technology","BLK":"Financials","SCHW":"Financials",
    "MDT":"Health Care","GILD":"Health Care","REGN":"Health Care","CVX":"Energy",
    "AXP":"Financials","MMC":"Financials","ETN":"Industrials","SYK":"Health Care",
    "ADI":"Technology","CI":"Health Care","MO":"Consumer Staples","CB":"Financials",
    "VRTX":"Health Care","KLAC":"Technology","MU":"Technology","SO":"Utilities",
    "NEE":"Utilities","DUK":"Utilities","PLD":"Real Estate","COP":"Energy",
    "LRCX":"Technology","BSX":"Health Care","EOG":"Energy","MMM":"Industrials",
    "CME":"Financials","ICE":"Financials","PANW":"Technology","SNPS":"Technology",
    "CDNS":"Technology","MCO":"Financials","ZTS":"Health Care","EQIX":"Real Estate",
    "TJX":"Consumer Discretionary","EMR":"Industrials","ITW":"Industrials","AON":"Financials",
    "SLB":"Energy","USB":"Financials","UBER":"Industrials","CVS":"Health Care",
    "WM":"Industrials","ELV":"Health Care","BDX":"Health Care","EW":"Health Care",
    "APH":"Technology","CARR":"Industrials","WELL":"Real Estate","WDAY":"Technology",
    "MSI":"Technology","OKE":"Energy","SRE":"Utilities","PH":"Industrials",
    "ORLY":"Consumer Discretionary","HCA":"Health Care","PSA":"Real Estate",
    "AJG":"Financials","PCAR":"Industrials","GWW":"Industrials","ROK":"Industrials",
    "FAST":"Industrials","FICO":"Technology","MCHP":"Technology","CTAS":"Industrials",
    "AIG":"Financials","ALL":"Financials","AFL":"Financials","VLO":"Energy",
    "PSX":"Energy","MPC":"Energy","HAL":"Energy","OXY":"Energy","TMUS":"Communication Services",
    "CMCSA":"Communication Services","VZ":"Communication Services","T":"Communication Services",
    "CHTR":"Communication Services","TTWO":"Entertainment","EA":"Entertainment",
    "LYV":"Entertainment","NKE":"Consumer Discretionary","DHI":"Consumer Discretionary",
    "LEN":"Consumer Discretionary","KMB":"Consumer Staples","CL":"Consumer Staples",
    "GIS":"Consumer Staples","KO":"Consumer Staples","PM":"Consumer Staples",
    "FOXA":"Entertainment","PARA":"Entertainment","L3HI":"Defense","HII":"Defense",
    "GPC":"Consumer Discretionary","AZO":"Consumer Discretionary","TSCO":"Consumer Discretionary",
    "PHM":"Consumer Discretionary","CAG":"Consumer Staples","HRL":"Consumer Staples",
    "SJM":"Consumer Staples","MKC":"Consumer Staples","CPB":"Consumer Staples",
    "ATVI":"Entertainment","ADM":"Consumer Staples","BKR":"Energy","FSLR":"Energy",
    "ENPH":"Energy","CEG":"Utilities","VST":"Utilities","NRG":"Utilities",
    "PCG":"Utilities","EIX":"Utilities","PPL":"Utilities","AEP":"Utilities",
    "D":"Utilities","FE":"Utilities","EXC":"Utilities","XEL":"Utilities",
    "CMS":"Utilities","ETR":"Utilities","WEC":"Utilities","ES":"Utilities",
    "EVRG":"Utilities","NI":"Utilities","PNW":"Utilities","AES":"Utilities",
    "CNP":"Utilities","LNT":"Utilities","OTIS":"Industrials","TT":"Industrials",
    "JCI":"Industrials","ROP":"Industrials","AME":"Industrials","VRSK":"Industrials",
    "IDXX":"Health Care","A":"Health Care","ILMN":"Health Care","DXCM":"Health Care",
    "MTD":"Health Care","WAT":"Health Care","BIO":"Health Care","IQV":"Health Care","CRL":"Health Care",
}

NAMES = {
    "AAPL":"Apple Inc.","MSFT":"Microsoft Corp.","NVDA":"NVIDIA Corp.","AMZN":"Amazon.com Inc.",
    "META":"Meta Platforms","GOOGL":"Alphabet Class A","GOOG":"Alphabet Class C",
    "BRK-B":"Berkshire Hathaway B","JPM":"JPMorgan Chase","V":"Visa Inc.",
    "TSLA":"Tesla Inc.","UNH":"UnitedHealth Group","LLY":"Eli Lilly","AVGO":"Broadcom Inc.",
    "XOM":"Exxon Mobil","JNJ":"Johnson & Johnson","MA":"Mastercard Inc.","PG":"Procter & Gamble",
    "COST":"Costco Wholesale","HD":"Home Depot","MRK":"Merck & Co.","ABBV":"AbbVie Inc.",
    "AMD":"Advanced Micro Devices","CRM":"Salesforce Inc.","PEP":"PepsiCo Inc.",
    "ACN":"Accenture PLC","WMT":"Walmart Inc.","BAC":"Bank of America","MCD":"McDonald's Corp.",
    "TMO":"Thermo Fisher Scientific","CSCO":"Cisco Systems","ABT":"Abbott Laboratories",
    "ORCL":"Oracle Corp.","WFC":"Wells Fargo","NFLX":"Netflix Inc.","DIS":"Walt Disney Co.",
    "CAT":"Caterpillar Inc.","DHR":"Danaher Corp.","IBM":"IBM Corp.","GE":"GE Aerospace",
    "INTC":"Intel Corp.","QCOM":"QUALCOMM Inc.","GS":"Goldman Sachs","RTX":"RTX Corp.",
    "LMT":"Lockheed Martin","NOC":"Northrop Grumman","BA":"Boeing Co.","GD":"General Dynamics",
    "ANET":"Arista Networks","SPGI":"S&P Global Inc.","HON":"Honeywell Intl.","AMGN":"Amgen Inc.",
    "LOW":"Lowe's Companies","DE":"Deere & Company","INTU":"Intuit Inc.","TXN":"Texas Instruments",
    "UNP":"Union Pacific","PFE":"Pfizer Inc.","ISRG":"Intuitive Surgical","BKNG":"Booking Holdings",
    "SBUX":"Starbucks Corp.","ADP":"Automatic Data Processing","BLK":"BlackRock Inc.",
    "SCHW":"Charles Schwab","MDT":"Medtronic PLC","GILD":"Gilead Sciences","REGN":"Regeneron Pharma",
    "CVX":"Chevron Corp.","AXP":"American Express","MMC":"Marsh & McLennan","ETN":"Eaton Corp.",
    "SYK":"Stryker Corp.","ADI":"Analog Devices","CI":"The Cigna Group","MO":"Altria Group",
    "CB":"Chubb Limited","VRTX":"Vertex Pharmaceuticals","KLAC":"KLA Corp.","MU":"Micron Technology",
    "SO":"Southern Company","NEE":"NextEra Energy","DUK":"Duke Energy","PLD":"Prologis Inc.",
    "COP":"ConocoPhillips","LRCX":"Lam Research","BSX":"Boston Scientific","EOG":"EOG Resources",
    "MMM":"3M Company","CME":"CME Group","ICE":"Intercontinental Exchange","PANW":"Palo Alto Networks",
    "SNPS":"Synopsys Inc.","CDNS":"Cadence Design","MCO":"Moody's Corp.","ZTS":"Zoetis Inc.",
    "EQIX":"Equinix Inc.","TJX":"TJX Companies","EMR":"Emerson Electric","ITW":"Illinois Tool Works",
    "AON":"Aon PLC","SLB":"SLB (Schlumberger)","USB":"U.S. Bancorp","UBER":"Uber Technologies",
    "CVS":"CVS Health","WM":"Waste Management","ELV":"Elevance Health","BDX":"Becton Dickinson",
    "EW":"Edwards Lifesciences","APH":"Amphenol Corp.","CARR":"Carrier Global","WELL":"Welltower Inc.",
    "WDAY":"Workday Inc.","MSI":"Motorola Solutions","OKE":"ONEOK Inc.","SRE":"Sempra",
    "PH":"Parker-Hannifin","ORLY":"O'Reilly Automotive","HCA":"HCA Healthcare","PSA":"Public Storage",
    "AJG":"Arthur J. Gallagher","PCAR":"PACCAR Inc.","GWW":"W.W. Grainger","ROK":"Rockwell Automation",
    "FAST":"Fastenal Co.","FICO":"Fair Isaac Corp.","MCHP":"Microchip Technology","CTAS":"Cintas Corp.",
    "AIG":"American Intl. Group","ALL":"Allstate Corp.","AFL":"Aflac Inc.","VLO":"Valero Energy",
    "PSX":"Phillips 66","MPC":"Marathon Petroleum","HAL":"Halliburton Co.","OXY":"Occidental Petroleum",
    "TMUS":"T-Mobile US","CMCSA":"Comcast Corp.","VZ":"Verizon Communications","T":"AT&T Inc.",
    "CHTR":"Charter Communications","TTWO":"Take-Two Interactive","EA":"Electronic Arts",
    "LYV":"Live Nation Entertainment","NKE":"Nike Inc.","DHI":"D.R. Horton","LEN":"Lennar Corp.",
    "KMB":"Kimberly-Clark","CL":"Colgate-Palmolive","GIS":"General Mills","KO":"Coca-Cola Co.",
    "PM":"Philip Morris Intl.","FOXA":"Fox Corp. Class A","PARA":"Paramount Global",
    "L3HI":"L3Harris Technologies","HII":"Huntington Ingalls","GPC":"Genuine Parts",
    "AZO":"AutoZone Inc.","TSCO":"Tractor Supply","PHM":"PulteGroup Inc.","CAG":"Conagra Brands",
    "HRL":"Hormel Foods","SJM":"J.M. Smucker","MKC":"McCormick & Co.","CPB":"Campbell Soup",
    "ATVI":"Activision Blizzard","ADM":"Archer-Daniels-Midland","BKR":"Baker Hughes",
    "FSLR":"First Solar","ENPH":"Enphase Energy","CEG":"Constellation Energy",
    "VST":"Vistra Corp.","NRG":"NRG Energy","PCG":"PG&E Corp.","EIX":"Edison International",
    "PPL":"PPL Corp.","AEP":"American Electric Power","D":"Dominion Energy","FE":"FirstEnergy",
    "EXC":"Exelon Corp.","XEL":"Xcel Energy","CMS":"CMS Energy","ETR":"Entergy Corp.",
    "WEC":"WEC Energy Group","ES":"Eversource Energy","EVRG":"Evergy Inc.","NI":"NiSource Inc.",
    "PNW":"Pinnacle West Capital","AES":"AES Corp.","CNP":"CenterPoint Energy","LNT":"Alliant Energy",
    "OTIS":"Otis Worldwide","TT":"Trane Technologies","JCI":"Johnson Controls","ROP":"Roper Technologies",
    "AME":"AMETEK Inc.","VRSK":"Verisk Analytics","IDXX":"IDEXX Laboratories","A":"Agilent Technologies",
    "ILMN":"Illumina Inc.","DXCM":"DexCom Inc.","MTD":"Mettler-Toledo","WAT":"Waters Corp.",
    "BIO":"Bio-Rad Laboratories","IQV":"IQVIA Holdings","CRL":"Charles River Labs",
}

# Fetch in batches of 20
all_quotes = []
batches = [SP500_SYMBOLS[i:i+20] for i in range(0, len(SP500_SYMBOLS), 20)]
for batch in batches:
    syms = ",".join(batch)
    url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={syms}&fields=regularMarketPrice,regularMarketChangePercent,trailingPE,marketCap,fiftyTwoWeekHigh,fiftyTwoWeekLow,regularMarketVolume,averageDailyVolume3Month,dividendYield,epsTrailingTwelveMonths"
    data = fetch(url)
    if data:
        quotes = data.get("quoteResponse", {}).get("result", [])
        all_quotes.extend(quotes)
    time.sleep(1.5)

stocks_out = []
for q in all_quotes:
    sym = q.get("symbol","").replace("-",".")
    stocks_out.append({
        "symbol": sym,
        "name": NAMES.get(q.get("symbol",""), q.get("longName", q.get("shortName",""))),
        "sector": SECTORS.get(q.get("symbol",""), "Other"),
        "price": q.get("regularMarketPrice"),
        "change": q.get("regularMarketChangePercent"),
        "pe": q.get("trailingPE"),
        "mktcap": q.get("marketCap"),
        "high52": q.get("fiftyTwoWeekHigh"),
        "low52": q.get("fiftyTwoWeekLow"),
        "volume": q.get("regularMarketVolume"),
        "avgVolume": q.get("averageDailyVolume3Month"),
        "divYield": q.get("dividendYield"),
        "eps": q.get("epsTrailingTwelveMonths"),
    })

print(f"  Fetched {len(stocks_out)} stocks")
save("stocks_quotes", {"updated": datetime.now(timezone.utc).isoformat(), "data": stocks_out})

# ─────────────────────────────────────────
#  2. STOCK HISTORY — Key indices + top stocks
# ─────────────────────────────────────────
print("\n📊 Fetching stock/index history (max range)...")

HISTORY_SYMBOLS = {
    "^GSPC":  "SP500",
    "^NDX":   "NASDAQ100",
    "^DJI":   "DOW",
    "^VIX":   "VIX",
    "AAPL":   "AAPL",
    "MSFT":   "MSFT",
    "NVDA":   "NVDA",
    "AMZN":   "AMZN",
    "META":   "META",
    "GOOGL":  "GOOGL",
    "TSLA":   "TSLA",
    "BRK-B":  "BRKB",
    "JPM":    "JPM",
    "LLY":    "LLY",
    "XOM":    "XOM",
    "GLD":    "GLD",
    "SLV":    "SLV",
    "PPLT":   "PPLT",
    "HG=F":   "COPPER",
}

history_out = {}
for sym, key in HISTORY_SYMBOLS.items():
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}?range=max&interval=1mo"
    data = fetch(url)
    if data:
        try:
            result = data["chart"]["result"][0]
            ts = result["timestamp"]
            closes = result["indicators"]["adjclose"][0]["adjclose"] if "adjclose" in result["indicators"] else result["indicators"]["quote"][0]["close"]
            pts = [[t * 1000, round(c, 4)] for t, c in zip(ts, closes) if c is not None]
            history_out[key] = pts
            print(f"  ✓ {key}: {len(pts)} monthly points")
        except Exception as e:
            print(f"  ✗ {key}: {e}")
    time.sleep(1.2)

save("history_monthly", {"updated": datetime.now(timezone.utc).isoformat(), "data": history_out})

# ─────────────────────────────────────────
#  3. CRYPTO — CoinGecko top 500
# ─────────────────────────────────────────
print("\n◆ Fetching crypto (top 500 via CoinGecko)...")

crypto_all = []
for page in range(1, 11):  # 10 pages × 50 = 500 coins
    url = f"https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page={page}&sparkline=false&price_change_percentage=24h,7d,30d"
    data = fetch(url, retries=3, delay=6)
    if data:
        crypto_all.extend(data)
        print(f"  Page {page}: {len(data)} coins")
    else:
        print(f"  Page {page}: failed (rate limited)")
    time.sleep(3)  # Respect CoinGecko free tier

save("crypto_markets", {"updated": datetime.now(timezone.utc).isoformat(), "data": crypto_all})

# ─────────────────────────────────────────
#  4. CRYPTO HISTORY — BTC, ETH, top 20
# ─────────────────────────────────────────
print("\n◆ Fetching crypto history (max range)...")

CRYPTO_HISTORY_IDS = [
    "bitcoin","ethereum","tether","binancecoin","solana","ripple",
    "usd-coin","cardano","avalanche-2","dogecoin","polkadot","chainlink",
    "tron","polygon","shiba-inu","litecoin","bitcoin-cash","stellar",
    "monero","ethereum-classic"
]

crypto_history = {}
for cid in CRYPTO_HISTORY_IDS:
    url = f"https://api.coingecko.com/api/v3/coins/{cid}/market_chart?vs_currency=usd&days=max&interval=monthly"
    data = fetch(url, retries=3, delay=8)
    if data and "prices" in data:
        # Downsample: keep monthly points
        pts = [[p[0], round(p[1], 6)] for p in data["prices"]]
        crypto_history[cid] = pts
        print(f"  ✓ {cid}: {len(pts)} points")
    else:
        print(f"  ✗ {cid}: failed")
    time.sleep(4)

save("crypto_history", {"updated": datetime.now(timezone.utc).isoformat(), "data": crypto_history})

# ─────────────────────────────────────────
#  5. METALS — via Yahoo Finance ETF proxies
# ─────────────────────────────────────────
print("\n◉ Fetching metals history...")

import urllib.parse

METALS = {
    "GLD":  ("XAU", "Gold",     9.2593),   # GLD holds ~0.10796 oz; reciprocal ~9.26
    "SLV":  ("XAG", "Silver",   1.0),
    "PPLT": ("XPT", "Platinum", 10.0),
    "HG=F": ("HG",  "Copper",   1.0),
}

metals_quotes = {}
metals_history = {}

for etf, (metal_id, metal_name, mult) in METALS.items():
    # Quote
    url_q = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={urllib.parse.quote(etf)}&fields=regularMarketPrice,regularMarketChangePercent,fiftyTwoWeekHigh,fiftyTwoWeekLow"
    dq = fetch(url_q)
    if dq:
        q = dq.get("quoteResponse", {}).get("result", [{}])[0]
        metals_quotes[metal_id] = {
            "name":    metal_name,
            "price":   round((q.get("regularMarketPrice") or 0) * mult, 2),
            "change":  q.get("regularMarketChangePercent"),
            "high52":  round((q.get("fiftyTwoWeekHigh") or 0) * mult, 2),
            "low52":   round((q.get("fiftyTwoWeekLow") or 0) * mult, 2),
        }

    # History (max range, monthly)
    url_h = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(etf)}?range=max&interval=1mo"
    dh = fetch(url_h)
    if dh:
        try:
            result = dh["chart"]["result"][0]
            ts = result["timestamp"]
            adj = result["indicators"].get("adjclose", [{}])[0].get("adjclose") or result["indicators"]["quote"][0]["close"]
            pts = [[t * 1000, round(c * mult, 4)] for t, c in zip(ts, adj) if c is not None]
            metals_history[metal_id] = pts
            print(f"  ✓ {metal_name}: {len(pts)} monthly points")
        except Exception as e:
            print(f"  ✗ {metal_name} history: {e}")
    time.sleep(1.5)

save("metals", {"updated": datetime.now(timezone.utc).isoformat(), "quotes": metals_quotes, "history": metals_history})

# ─────────────────────────────────────────
#  6. OVERVIEW TICKER
# ─────────────────────────────────────────
print("\n📡 Building overview snapshot...")

ticker_syms = ["^GSPC","^NDX","^DJI","BTC-USD","ETH-USD","GLD","SLV","AAPL","MSFT","TSLA","NVDA","AMZN","^VIX"]
url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={','.join(urllib.parse.quote(s) for s in ticker_syms)}&fields=regularMarketPrice,regularMarketChangePercent,shortName"
data = fetch(url)
ticker_out = []
if data:
    for q in data.get("quoteResponse", {}).get("result", []):
        ticker_out.append({
            "symbol": q.get("symbol",""),
            "name":   q.get("shortName",""),
            "price":  q.get("regularMarketPrice"),
            "change": q.get("regularMarketChangePercent"),
        })

save("overview", {"updated": datetime.now(timezone.utc).isoformat(), "ticker": ticker_out})

print(f"\n✅ All done! Data saved to /{OUT}/")
print(f"   Timestamp: {datetime.now(timezone.utc).isoformat()}")
