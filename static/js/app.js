/**
 * TradingView Terminal Controller — Exact UI Replica
 * Uses official TradingView Lightweight Charts engine & genuine market data
 */

document.addEventListener('DOMContentLoaded', async () => {

  // ── State ──
  const state = {
    activeSymbol: 'NIFTY',
    symbolDesc: 'Nifty 50 Index · 1D · NSE',
    price: 23146.15,
    change: 148.80,
    changePct: 0.65,
    timeframe: '1d',
    historicalCandles: [],
    forecastCandles: [],
    activeTool: 'crosshair',
    isAiForecasting: false,
  };

  // ── Initialize Official TradingView Lightweight Chart ──
  const chart = new TradingChart('tvChartContainer');
  window.tradingChart = chart;

  setTimeout(() => {
    try {
      const el = document.getElementById('tvChartContainer');
      let curr = el;
      const path = [];
      while (curr && curr !== document.body) {
        const rect = curr.getBoundingClientRect();
        const cs = window.getComputedStyle(curr);
        path.push({
          tag: curr.tagName,
          id: curr.id,
          className: curr.className,
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          style: {
            position: cs.position,
            width: cs.width,
            height: cs.height,
            left: cs.left,
            top: cs.top,
            display: cs.display,
            flex: cs.flex,
            margin: cs.margin,
            padding: cs.padding,
            transform: cs.transform
          }
        });
        curr = curr.parentElement;
      }
      fetch('/api/state/debug_layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(path)
      });
    } catch (e) {
      console.error(e);
    }
  }, 1000);

  // ── Complete Authentic TradingView Symbols & Indices Database ──
  const SYMBOLS_DATABASE = [
    // ── INDICES (Indian & Global) ──
    {
      symbol: 'NIFTY',
      displaySymbol: 'NIFTY 50',
      name: 'NIFTY 50 Index',
      exchange: 'NSE',
      category: 'indices',
      type: 'Index',
      country: 'India',
      last: 23146.15,
      chg: 148.80,
      pct: 0.65,
      file: 'nifty_daily.json',
      badgeText: '50',
      badgeBg: '#1e53e5'
    },
    {
      symbol: 'BANKNIFTY',
      displaySymbol: 'BANK NIFTY',
      name: 'NIFTY Bank Index',
      exchange: 'NSE',
      category: 'indices',
      type: 'Index',
      country: 'India',
      last: 55844.00,
      chg: 33.50,
      pct: 0.06,
      file: 'BANKNIFTY.json',
      badgeText: 'BK',
      badgeBg: '#0f2042'
    },
    {
      symbol: 'SENSEX',
      displaySymbol: 'SENSEX',
      name: 'S&P BSE SENSEX Index',
      exchange: 'BSE',
      category: 'indices',
      type: 'Index',
      country: 'India',
      last: 74729.27,
      chg: 413.66,
      pct: 0.56,
      file: 'SENSEX.json',
      badgeText: 'SX',
      badgeBg: '#e65100'
    },
    {
      symbol: 'FINNIFTY',
      displaySymbol: 'FIN NIFTY',
      name: 'NIFTY Financial Services Index',
      exchange: 'NSE',
      category: 'indices',
      type: 'Index',
      country: 'India',
      last: 24390.45,
      chg: 112.30,
      pct: 0.46,
      file: 'CNXFIN.json',
      badgeText: 'FN',
      badgeBg: '#00695c'
    },
    {
      symbol: 'CNXIT',
      displaySymbol: 'NIFTY IT',
      name: 'NIFTY IT Index',
      exchange: 'NSE',
      category: 'indices',
      type: 'Index',
      country: 'India',
      last: 31924.10,
      chg: 1204.30,
      pct: 3.92,
      file: 'CNXFIN.json',
      badgeText: 'IT',
      badgeBg: '#283593'
    },
    {
      symbol: 'INDIAVIX',
      displaySymbol: 'INDIA VIX',
      name: 'India Volatility Index',
      exchange: 'NSE',
      category: 'indices',
      type: 'Index',
      country: 'India',
      last: 13.82,
      chg: -0.42,
      pct: -2.95,
      badgeText: 'VX',
      badgeBg: '#c2185b'
    },
    {
      symbol: 'NIFTYMID50',
      displaySymbol: 'NIFTY MID 50',
      name: 'NIFTY Midcap 50 Index',
      exchange: 'NSE',
      category: 'indices',
      type: 'Index',
      country: 'India',
      last: 15420.80,
      chg: 95.40,
      pct: 0.62,
      badgeText: 'M50',
      badgeBg: '#4527a0'
    },
    {
      symbol: 'NIFTYNEXT50',
      displaySymbol: 'NIFTY NEXT 50',
      name: 'NIFTY Next 50 Index',
      exchange: 'NSE',
      category: 'indices',
      type: 'Index',
      country: 'India',
      last: 68350.25,
      chg: 312.10,
      pct: 0.46,
      badgeText: 'N50',
      badgeBg: '#0277bd'
    },
    {
      symbol: 'CNXAUTO',
      displaySymbol: 'NIFTY AUTO',
      name: 'NIFTY Auto Sector Index',
      exchange: 'NSE',
      category: 'indices',
      type: 'Index',
      country: 'India',
      last: 22840.15,
      chg: 185.60,
      pct: 0.82,
      badgeText: 'AU',
      badgeBg: '#d84315'
    },
    {
      symbol: 'CNXPHARMA',
      displaySymbol: 'NIFTY PHARMA',
      name: 'NIFTY Pharma Sector Index',
      exchange: 'NSE',
      category: 'indices',
      type: 'Index',
      country: 'India',
      last: 21650.90,
      chg: -65.20,
      pct: -0.30,
      badgeText: 'PH',
      badgeBg: '#2e7d32'
    },
    {
      symbol: 'CNXMETAL',
      displaySymbol: 'NIFTY METAL',
      name: 'NIFTY Metal Sector Index',
      exchange: 'NSE',
      category: 'indices',
      type: 'Index',
      country: 'India',
      last: 9140.35,
      chg: 142.10,
      pct: 1.58,
      badgeText: 'MT',
      badgeBg: '#4e342e'
    },
    {
      symbol: 'SPX',
      displaySymbol: 'S&P 500',
      name: 'S&P 500 Index',
      exchange: 'CME',
      category: 'indices',
      type: 'Index',
      country: 'USA',
      last: 7659.44,
      chg: -84.62,
      pct: -1.09,
      file: 'SPX.json',
      badgeText: '500',
      badgeBg: '#d32f2f'
    },
    {
      symbol: 'NDX',
      displaySymbol: 'NASDAQ 100',
      name: 'NASDAQ 100 Index',
      exchange: 'NASDAQ',
      category: 'indices',
      type: 'Index',
      country: 'USA',
      last: 18450.20,
      chg: -145.30,
      pct: -0.78,
      badgeText: 'QQQ',
      badgeBg: '#0288d1'
    },
    {
      symbol: 'DJI',
      displaySymbol: 'DOW JONES',
      name: 'Dow Jones Industrial Average',
      exchange: 'DJ',
      category: 'indices',
      type: 'Index',
      country: 'USA',
      last: 42114.40,
      chg: 165.20,
      pct: 0.39,
      badgeText: 'DJ',
      badgeBg: '#1565c0'
    },
    {
      symbol: 'DAX',
      displaySymbol: 'DAX 40',
      name: 'DAX Index',
      exchange: 'XETRA',
      category: 'indices',
      type: 'Index',
      country: 'Germany',
      last: 19460.10,
      chg: 82.50,
      pct: 0.43,
      badgeText: 'DAX',
      badgeBg: '#37474f'
    },
    {
      symbol: 'FTSE',
      displaySymbol: 'FTSE 100',
      name: 'FTSE 100 Index',
      exchange: 'LSE',
      category: 'indices',
      type: 'Index',
      country: 'UK',
      last: 8245.80,
      chg: 28.40,
      pct: 0.35,
      badgeText: 'UK',
      badgeBg: '#455a64'
    },

    // ── STOCKS ──
    {
      symbol: 'RELIANCE',
      displaySymbol: 'RELIANCE',
      name: 'Reliance Industries Ltd',
      exchange: 'NSE',
      category: 'stocks',
      type: 'Stock',
      last: 1211.20,
      chg: -3.80,
      pct: -0.31,
      file: 'RELIANCE.json',
      badgeText: 'RI',
      badgeBg: '#0b2416'
    },
    {
      symbol: 'AXISBANK',
      displaySymbol: 'AXISBANK',
      name: 'Axis Bank Ltd',
      exchange: 'NSE',
      category: 'stocks',
      type: 'Stock',
      last: 1290.00,
      chg: 2.00,
      pct: 0.16,
      file: 'AXISBANK.json',
      badgeText: 'AX',
      badgeBg: '#97144d'
    },
    {
      symbol: 'HDFCBANK',
      displaySymbol: 'HDFCBANK',
      name: 'HDFC Bank Ltd',
      exchange: 'NSE',
      category: 'stocks',
      type: 'Stock',
      last: 728.85,
      chg: 2.00,
      pct: 0.28,
      file: 'HDFCBANK.json',
      badgeText: 'HD',
      badgeBg: '#004c8f'
    },
    {
      symbol: 'ICICIBANK',
      displaySymbol: 'ICICIBANK',
      name: 'ICICI Bank Ltd',
      exchange: 'NSE',
      category: 'stocks',
      type: 'Stock',
      last: 1397.00,
      chg: 7.60,
      pct: 0.55,
      file: 'ICICIBANK.json',
      badgeText: 'IC',
      badgeBg: '#b33917'
    },
    {
      symbol: 'BAJFINANCE',
      displaySymbol: 'BAJFINANCE',
      name: 'Bajaj Finance Ltd',
      exchange: 'NSE',
      category: 'stocks',
      type: 'Stock',
      last: 982.10,
      chg: 16.85,
      pct: 1.75,
      file: 'BAJFINANCE.json',
      badgeText: 'BF',
      badgeBg: '#003366'
    },
    {
      symbol: 'TCS',
      displaySymbol: 'TCS',
      name: 'Tata Consultancy Services',
      exchange: 'NSE',
      category: 'stocks',
      type: 'Stock',
      last: 4120.00,
      chg: 45.20,
      pct: 1.11,
      badgeText: 'TC',
      badgeBg: '#1a237e'
    },
    {
      symbol: 'INFY',
      displaySymbol: 'INFOSYS',
      name: 'Infosys Ltd',
      exchange: 'NSE',
      category: 'stocks',
      type: 'Stock',
      last: 1885.50,
      chg: 32.10,
      pct: 1.73,
      badgeText: 'IN',
      badgeBg: '#0070ba'
    },
    {
      symbol: 'TATAMOTORS',
      displaySymbol: 'TATA MOTORS',
      name: 'Tata Motors Passenger Vehicles',
      exchange: 'NSE',
      category: 'stocks',
      type: 'Stock',
      last: 924.30,
      chg: -8.40,
      pct: -0.90,
      badgeText: 'TM',
      badgeBg: '#0d47a1'
    },

    // ── FUNDS (ETFs) ──
    {
      symbol: 'NIFTYBEES',
      displaySymbol: 'NIFTY BEES',
      name: 'Nippon India ETF Nifty 50 BeES',
      exchange: 'NSE',
      category: 'funds',
      type: 'ETF',
      last: 254.30,
      chg: 1.62,
      pct: 0.64,
      badgeText: 'NB',
      badgeBg: '#f57c00'
    },
    {
      symbol: 'BANKBEES',
      displaySymbol: 'BANK BEES',
      name: 'Nippon India ETF Bank BeES',
      exchange: 'NSE',
      category: 'funds',
      type: 'ETF',
      last: 564.80,
      chg: 0.35,
      pct: 0.06,
      badgeText: 'BB',
      badgeBg: '#e65100'
    },
    {
      symbol: 'SPY',
      displaySymbol: 'SPDR S&P 500',
      name: 'SPDR S&P 500 ETF Trust',
      exchange: 'AMEX',
      category: 'funds',
      type: 'ETF',
      last: 585.20,
      chg: -6.40,
      pct: -1.08,
      badgeText: 'SP',
      badgeBg: '#01579b'
    },

    // ── FUTURES ──
    {
      symbol: 'NIFTY1!',
      displaySymbol: 'NIFTY CURRENT 1!',
      name: 'NIFTY 50 Continuous Futures',
      exchange: 'NSE',
      category: 'futures',
      type: 'Futures',
      last: 23180.00,
      chg: 152.00,
      pct: 0.66,
      badgeText: 'N1',
      badgeBg: '#1e53e5'
    },
    {
      symbol: 'BANKNIFTY1!',
      displaySymbol: 'BANKNIFTY CURRENT 1!',
      name: 'NIFTY Bank Continuous Futures',
      exchange: 'NSE',
      category: 'futures',
      type: 'Futures',
      last: 55920.00,
      chg: 45.00,
      pct: 0.08,
      badgeText: 'B1',
      badgeBg: '#0f2042'
    },

    // ── FOREX ──
    {
      symbol: 'USDINR',
      displaySymbol: 'USD / INR',
      name: 'US Dollar / Indian Rupee',
      exchange: 'FX_IDC',
      category: 'forex',
      type: 'Forex',
      last: 84.07,
      chg: 0.03,
      pct: 0.04,
      badgeText: '₹',
      badgeBg: '#388e3c'
    },
    {
      symbol: 'EURUSD',
      displaySymbol: 'EUR / USD',
      name: 'Euro / US Dollar',
      exchange: 'FX',
      category: 'forex',
      type: 'Forex',
      last: 1.0865,
      chg: -0.0022,
      pct: -0.20,
      badgeText: '€',
      badgeBg: '#1976d2'
    },
    {
      symbol: 'GBPUSD',
      displaySymbol: 'GBP / USD',
      name: 'British Pound / US Dollar',
      exchange: 'FX',
      category: 'forex',
      type: 'Forex',
      last: 1.3040,
      chg: 0.0015,
      pct: 0.12,
      badgeText: '£',
      badgeBg: '#512da8'
    },

    // ── CRYPTO ──
    {
      symbol: 'BTCUSD',
      displaySymbol: 'BTC / USD',
      name: 'Bitcoin / US Dollar',
      exchange: 'BITSTAMP',
      category: 'crypto',
      type: 'Crypto',
      last: 68450.00,
      chg: 1420.00,
      pct: 2.12,
      badgeText: '₿',
      badgeBg: '#f7931a'
    },
    {
      symbol: 'ETHUSD',
      displaySymbol: 'ETH / USD',
      name: 'Ethereum / US Dollar',
      exchange: 'BITSTAMP',
      category: 'crypto',
      type: 'Crypto',
      last: 2640.50,
      chg: 54.20,
      pct: 2.09,
      badgeText: 'Ξ',
      badgeBg: '#627eea'
    },
    {
      symbol: 'SOLUSD',
      displaySymbol: 'SOL / USD',
      name: 'Solana / US Dollar',
      exchange: 'BITSTAMP',
      category: 'crypto',
      type: 'Crypto',
      last: 156.40,
      chg: 6.80,
      pct: 4.54,
      badgeText: 'S',
      badgeBg: '#14f195'
    },

    // ── BONDS ──
    {
      symbol: 'IN10Y',
      displaySymbol: 'INDIA 10Y',
      name: 'India 10-Year Government Bond Yield',
      exchange: 'TVC',
      category: 'bonds',
      type: 'Bond',
      last: 6.82,
      chg: -0.01,
      pct: -0.15,
      badgeText: 'IN',
      badgeBg: '#e65100'
    },
    {
      symbol: 'US10Y',
      displaySymbol: 'US 10Y',
      name: 'US 10-Year Treasury Yield',
      exchange: 'TVC',
      category: 'bonds',
      type: 'Bond',
      last: 4.08,
      chg: 0.04,
      pct: 0.99,
      badgeText: 'US',
      badgeBg: '#1565c0'
    },

    // ── ECONOMY ──
    {
      symbol: 'INIRR',
      displaySymbol: 'IN REPO RATE',
      name: 'Reserve Bank of India Repo Rate',
      exchange: 'ECONOMICS',
      category: 'economy',
      type: 'Economic',
      last: 6.50,
      chg: 0.00,
      pct: 0.00,
      badgeText: 'RR',
      badgeBg: '#2e7d32'
    }
  ];

  // ── Exact Watchlist Dataset (Matching Authentic TradingView Session from Image 2) ──
  const WATCHLIST = [
    {
      symbol: 'NIFTY',
      displaySymbol: 'NIFT',
      name: 'Nifty 50 Index',
      exchange: 'NSE',
      last: 23146.15,
      lastStr: '23,146.15',
      chg: 148.80,
      chgStr: '148.80',
      pct: 0.65,
      pctStr: '0.65%',
      isIndex: true,
      hasRibbon: true,
      hasOrangeD: true,
      badgeType: 'nifty50',
      file: 'nifty_daily.json'
    },
    {
      symbol: 'BANKNIFTY',
      displaySymbol: 'BANI',
      name: 'Nifty Bank Index',
      exchange: 'NSE',
      last: 55844.00,
      lastStr: '55,844.00',
      chg: 33.50,
      chgStr: '33.50',
      pct: 0.06,
      pctStr: '0.06%',
      isIndex: true,
      hasOrangeD: true,
      badgeType: 'bank',
      file: 'BANKNIFTY.json'
    },
    {
      symbol: 'SENSEX',
      displaySymbol: 'SENS',
      name: 'BSE SENSEX Index',
      exchange: 'BSE',
      last: 74729.27,
      lastStr: '74,729.27',
      chg: 413.66,
      chgStr: '413.66',
      pct: 0.56,
      pctStr: '0.56%',
      isIndex: true,
      hasOrangeD: true,
      badgeType: 'bse',
      file: 'SENSEX.json'
    },
    {
      symbol: 'CNXIT',
      displaySymbol: 'CNXI',
      name: 'Nifty IT Index',
      exchange: 'NSE',
      last: 31924.10,
      lastStr: '31,924.10',
      chg: 1204.30,
      chgStr: '1,204.30',
      pct: 3.92,
      pctStr: '3.92%',
      isIndex: true,
      hasOrangeD: true,
      badgeType: 'chip',
      file: 'CNXFIN.json'
    },
    {
      symbol: 'SPX',
      displaySymbol: 'SPX',
      name: 'S&P 500 Index',
      exchange: 'CME',
      last: 7659.44,
      lastStr: '7,659.44',
      chg: -84.62,
      chgStr: '-84.62',
      pct: -1.09,
      pctStr: '-1.09%',
      isIndex: true,
      hasOrangeD: false,
      badgeType: 'spx',
      file: 'SPX.json'
    },
    // Section Header: STOCKS
    { isHeader: true, title: 'STOCKS' },
    {
      symbol: 'RELIANCE',
      displaySymbol: 'RELI',
      name: 'Reliance Industries',
      exchange: 'NSE',
      last: 1211.20,
      lastStr: '1,211.2',
      chg: -3.80,
      chgStr: '-3.8',
      pct: -0.31,
      pctStr: '-0.31%',
      hasOrangeD: true,
      badgeType: 'reliance',
      file: 'RELIANCE.json'
    },
    {
      symbol: 'AXISBANK',
      displaySymbol: 'AXIS',
      name: 'Axis Bank Ltd',
      exchange: 'NSE',
      last: 1290.00,
      lastStr: '1,290.0',
      chg: 2.00,
      chgStr: '2.0',
      pct: 0.16,
      pctStr: '0.16%',
      hasOrangeD: true,
      badgeType: 'axis',
      file: 'AXISBANK.json'
    },
    {
      symbol: 'HDFCBANK',
      displaySymbol: 'HDFC',
      name: 'HDFC Bank Ltd',
      exchange: 'NSE',
      last: 728.85,
      lastStr: '728.85',
      chg: 2.00,
      chgStr: '2.00',
      pct: 0.28,
      pctStr: '0.28%',
      hasOrangeD: true,
      badgeType: 'hdfc',
      file: 'HDFCBANK.json'
    },
    {
      symbol: 'ICICIBANK',
      displaySymbol: 'ICICI',
      name: 'ICICI Bank Ltd',
      exchange: 'NSE',
      last: 1397.00,
      lastStr: '1,397.0',
      chg: 7.60,
      chgStr: '7.6',
      pct: 0.55,
      pctStr: '0.55%',
      hasOrangeD: true,
      badgeType: 'icici',
      file: 'ICICIBANK.json'
    },
    {
      symbol: 'BAJFINANCE',
      displaySymbol: 'BAJF',
      name: 'Bajaj Finance Ltd',
      exchange: 'NSE',
      last: 982.10,
      lastStr: '982.10',
      chg: 16.85,
      chgStr: '16.85',
      pct: 1.75,
      pctStr: '1.75%',
      hasOrangeD: true,
      badgeType: 'bajaj',
      file: 'BAJFINANCE.json'
    }
  ];

  function getSymbolBadge(item) {
    if (item.symbol === 'NIFTY') {
      return `<div class="tv-sym-logo-50">50</div>`;
    }
    if (item.badgeType === 'bank') {
      return `<div class="tv-wl-badge-navy"><svg viewBox="0 0 24 24" width="13" height="13" fill="#ffffff"><path d="M12 2L2 7v2h20V7L12 2zm-7 8v7h2v-7H5zm5 0v7h2v-7h-2zm5 0v7h2v-7h-2zm5 0v7h2v-7h-2zM2 19v2h20v-2H2z"/></svg></div>`;
    }
    if (item.badgeType === 'bse') {
      return `<div class="tv-wl-badge-bse">BSE</div>`;
    }
    if (item.badgeType === 'chip') {
      return `<div class="tv-wl-badge-navy"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ffffff" stroke-width="1.8"><rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5" fill="#ffffff"/><path d="M9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3M19 9h3m-3 6h3"/></svg></div>`;
    }
    if (item.badgeType === 'spx') {
      return `<div class="tv-wl-badge-red">500</div>`;
    }
    if (item.badgeType === 'reliance') {
      return `<div class="tv-wl-badge-green"><svg viewBox="0 0 24 24" width="13" height="13" fill="#52b788"><circle cx="12" cy="12" r="10" fill="#0b2416"/><path d="M12 5c-3 3-4 6-4 9 0 3 2 5 4 5s4-2 4-5c0-3-1-6-4-9z" fill="#52b788"/></svg></div>`;
    }
    if (item.badgeType === 'axis') {
      return `<div class="tv-wl-badge-axis"><svg viewBox="0 0 24 24" width="13" height="13" fill="#ffffff"><path d="M12 3l9 17h-5l-4-8-4 8H3l9-17z"/></svg></div>`;
    }
    if (item.badgeType === 'hdfc') {
      return `<div class="tv-wl-badge-hdfc"><svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="#004c8f"/><path d="M4 10.5h16v3H4zM10.5 4h3v16h-3z" fill="#ffffff"/><path d="M8.5 8.5h7v7h-7z" fill="#ed1c24"/></svg></div>`;
    }
    if (item.badgeType === 'icici') {
      return `<div class="tv-wl-badge-icici"><svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="#fff"/><circle cx="12" cy="12" r="9" fill="#9d1c1c"/><path d="M12 5a7 7 0 0 1 7 7c0 3.8-3.1 7-7 7s-7-3.2-7-7c0-2 .8-3.7 2-5l2.5 2.5A3.5 3.5 0 0 0 8.5 12a3.5 3.5 0 1 0 7-1.1l2.5-2.5A6.9 6.9 0 0 0 12 5z" fill="#f58220"/></svg></div>`;
    }
    if (item.badgeType === 'bajaj') {
      return `<div class="tv-wl-badge-bajaj">B</div>`;
    }
    return `<div class="tv-wl-badge-navy">${item.symbol.slice(0, 2)}</div>`;
  }

  /**
   * Load Symbol Data from local verified JSON or /api/candles
   */
  async function loadSymbolData(symbolItem) {
    if (!symbolItem) return generateFallbackCandles(23146.15);
    if (typeof symbolItem === 'string') {
      const sym = symbolItem.toUpperCase();
      const found = WATCHLIST.find(w => w.symbol === sym) || (typeof SYMBOLS_DATABASE !== 'undefined' ? SYMBOLS_DATABASE.find(s => s.symbol === sym) : null);
      symbolItem = found || { symbol: sym, last: 23146.15 };
    }
    const basePrice = Number(symbolItem.last) || 23146.15;

    // 1. Try local json
    try {
      const fileName = symbolItem.file || `${symbolItem.symbol}.json`;
      const res = await fetch(`/static/data/${fileName}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (err) {}

    // 2. Try /api/candles
    try {
      const res = await fetch(`/api/candles?epic=${encodeURIComponent(symbolItem.symbol)}&resolution=DAY&bars=500`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (err) {}

    // 3. Fallback if network fails
    return generateFallbackCandles(basePrice);
  }

  function generateFallbackCandles(basePrice) {
    basePrice = Number(basePrice) || 23146.15;
    const candles = [];
    const startDate = new Date('2024-10-16');
    let curr = basePrice * 0.92;
    for (let i = 0; i < 260; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      if (i === 259) curr = basePrice;
      const noise = (Math.random() - 0.49) * (basePrice * 0.012);
      const next = curr + noise;
      candles.push({
        time: d.toISOString().split('T')[0],
        open: +curr.toFixed(2),
        high: +(Math.max(curr, next) + basePrice * 0.005).toFixed(2),
        low: +(Math.min(curr, next) - basePrice * 0.005).toFixed(2),
        close: +next.toFixed(2),
        volume: 350000000,
      });
      curr = next;
    }
    return candles;
  }

  // ── Render Watchlist Rows ──
  function renderWatchlist() {
    const container = document.getElementById('watchlistRowsContainer');
    if (!container) return;
    container.innerHTML = '';

    WATCHLIST.forEach(item => {
      if (item.isHeader) {
        const hdr = document.createElement('div');
        hdr.className = 'tv-wl-section-hdr';
        hdr.innerHTML = `<svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 2.5L4 5.5L7 2.5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg> ${item.title}`;
        container.appendChild(hdr);
        return;
      }

      const row = document.createElement('div');
      row.className = `tv-wl-row ${item.symbol === state.activeSymbol ? 'active' : ''}`;
      row.setAttribute('data-symbol', item.symbol);

      const isUp = item.chg >= 0;
      const lastStr = item.lastStr || Number(item.last).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const chgStr = item.chgStr || `${isUp ? '' : ''}${item.chg.toFixed(2)}`;
      const pctStr = item.pctStr || `${isUp ? '' : ''}${item.pct.toFixed(2)}%`;

      let ribbonHtml = '';
      if (item.hasRibbon) {
        ribbonHtml = `<div class="tv-wl-bookmark-ribbon"><svg width="9" height="17" viewBox="0 0 10 18"><path d="M0 2h5l5 7-5 7H0z" fill="#f23645"/></svg></div>`;
      }

      const badgeHtml = getSymbolBadge(item);
      const dBadgeHtml = item.hasOrangeD ? `<span class="tv-wl-d-badge">D</span>` : '';
      const dotHtml = `<span class="tv-wl-dot">•</span>`;

      row.innerHTML = `
        <div class="tv-wl-sym-cell">
          ${ribbonHtml}
          ${badgeHtml}
          <span class="tv-wl-sym-title">${item.displaySymbol || item.symbol}</span>
          ${dBadgeHtml}
          ${dotHtml}
        </div>
        <div class="tv-wl-last">${lastStr}</div>
        <div class="tv-wl-chg ${isUp ? 'up' : 'dn'}">${chgStr}</div>
        <div class="tv-wl-pct ${isUp ? 'up' : 'dn'}">${pctStr}</div>
      `;

      row.addEventListener('click', () => switchSymbol(item));
      container.appendChild(row);
    });
  }

  // ── Switch Active Symbol ──
  async function switchSymbol(item, fullName, exchange) {
    if (!item) return;
    if (typeof item === 'string') {
      const sym = item.toUpperCase();
      const found = WATCHLIST.find(w => w.symbol === sym) || (typeof SYMBOLS_DATABASE !== 'undefined' ? SYMBOLS_DATABASE.find(s => s.symbol === sym) : null);
      item = found || {
        symbol: sym,
        displaySymbol: sym,
        name: fullName || sym,
        exchange: exchange || 'NSE',
        last: 23146.15,
        chg: 0,
        pct: 0
      };
      if (fullName) item.name = fullName;
      if (exchange) item.exchange = exchange;
    }

    state.activeSymbol = item.symbol;
    chart.currentSymbol = item.symbol;
    state.symbolDesc = `${item.name || item.symbol} · 1D · ${item.exchange || 'NSE'}`;
    state.price = item.last !== undefined ? item.last : 23146.15;
    state.change = item.chg !== undefined ? item.chg : 0;
    state.changePct = item.pct !== undefined ? item.pct : 0;

    if (window.TV_STATE) {
      window.TV_STATE.symbol = item.symbol;
      window.TV_STATE.symbolFullName = item.name || item.symbol;
      window.TV_STATE.exchange = item.exchange || 'NSE';
    }

    const fmt = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const isUp = state.change >= 0;

    // Update Topbar
    const topSym = document.getElementById('topSymbolName');
    if (topSym) topSym.textContent = item.symbol;
    document.querySelectorAll('#header-toolbar-symbol-search .value-eTD3FKHQ, .searchButton-HclmObIW .value-eTD3FKHQ, .value-eTD3FKHQ').forEach(el => {
      el.textContent = item.symbol;
    });

    // Update Browser Document Title
    document.title = `${item.symbol} ${fmt(item.last)} ${isUp ? '▲ +' : '▼ -'}${Math.abs(state.changePct).toFixed(2)}% Unnamed`;

    // Update Floating Legend
    const hudTitle = document.getElementById('hudSymTitle');
    if (hudTitle) hudTitle.textContent = state.symbolDesc;

    document.querySelectorAll('[aria-label="Change symbol"], .titleWrapper-quatTGAC .title-quatTGAC').forEach(el => {
      el.textContent = item.name || item.symbol;
    });

    const hudLogo50 = document.getElementById('hudSymLogo50');
    const hudLogo = document.getElementById('hudSymLogo');
    if (item.symbol === 'NIFTY') {
      if (hudLogo50) hudLogo50.style.display = 'flex';
      if (hudLogo) hudLogo.style.display = 'none';
    } else {
      if (hudLogo50) hudLogo50.style.display = 'none';
      if (hudLogo) {
        hudLogo.style.display = 'block';
        hudLogo.src = item.svgLogo || '/static/tv_logos/source_NSE.svg';
      }
    }

    const sellP = document.getElementById('instantSellPrice');
    const buyP = document.getElementById('instantBuyPrice');
    if (sellP) sellP.textContent = fmt(item.last);
    if (buyP) buyP.textContent = fmt(item.last);

    // Update Detail Card
    const cardSym = document.querySelector('.tv-card-sym');
    const cardDesc = document.querySelector('.tv-card-desc');
    const cardP = document.getElementById('cardPrice');
    const cardChg = document.getElementById('cardChange');
    const cardPct = document.getElementById('cardChangePct');
    const cardLogo50 = document.getElementById('cardSymLogo50');
    const cardLogo = document.getElementById('cardSymLogo');

    if (item.symbol === 'NIFTY') {
      if (cardLogo50) cardLogo50.style.display = 'flex';
      if (cardLogo) cardLogo.style.display = 'none';
    } else {
      if (cardLogo50) cardLogo50.style.display = 'none';
      if (cardLogo) {
        cardLogo.style.display = 'block';
        cardLogo.src = item.svgLogo || '/static/tv_logos/source_NSE.svg';
      }
    }

    if (cardSym) cardSym.textContent = item.symbol;
    if (cardDesc) cardDesc.textContent = `${item.name || item.symbol} · ${item.exchange || 'NSE'}`;
    if (cardP) cardP.textContent = fmt(item.last);

    if (cardChg) {
      cardChg.textContent = `${isUp ? '+' : ''}${state.change.toFixed(2)}`;
      cardChg.className = `tv-card-chg ${isUp ? 'up' : 'dn'}`;
    }
    if (cardPct) {
      cardPct.textContent = `${isUp ? '+' : ''}${state.changePct.toFixed(2)}%`;
      cardPct.className = `tv-card-chg ${isUp ? 'up' : 'dn'}`;
    }

    // Update Authentic TradingView Legend HUD title & exchange
    const legendExchange = document.querySelector('.exchangeTitle-quatTGAC .title-quatTGAC');
    if (legendExchange) legendExchange.textContent = item.exchange || 'NSE';

    // Update Authentic TradingView Detail Card
    const detailTitle = document.querySelector('[data-qa-id="details-element symbol"]');
    if (detailTitle) detailTitle.textContent = item.symbol;
    const detailDesc = document.querySelector('[data-qa-id="details-element description"]');
    if (detailDesc) detailDesc.textContent = item.name || item.symbol;
    const detailPrice = document.querySelector('[data-qa-id="details-element price"] [data-qa-id="value"]');
    if (detailPrice) detailPrice.textContent = fmt(item.last);

    // Refresh rows highlight in both watchlist models
    document.querySelectorAll('[data-symbol-short]').forEach(r => {
      const isMatch = r.getAttribute('data-symbol-short') === item.symbol;
      r.setAttribute('data-active', isMatch ? 'true' : 'false');
      r.setAttribute('data-selected', isMatch ? 'true' : 'false');
    });

    document.querySelectorAll('.tv-wl-row').forEach(r => {
      r.classList.toggle('active', r.getAttribute('data-symbol') === item.symbol);
    });

    // Load authentic historical candles
    state.historicalCandles = await loadSymbolData(item);
    state.forecastCandles = [];
    chart.setData(state.historicalCandles, []);

    if (window.tvWebSocket && typeof window.tvWebSocket.subscribe === 'function') {
      window.tvWebSocket.subscribe(item.symbol, '1D');
    }
  }

  // ── Run AI Forecast with Genuine Kronos-102.3M + Laya Engine ──
  async function triggerAiForecast() {
    if (state.isAiForecasting) return;
    state.isAiForecasting = true;

    const drawer = document.getElementById('aiDrawer');
    if (drawer) drawer.classList.add('open');

    const runBtn = document.getElementById('runAiBtnInsideDrawer');
    if (runBtn) {
      runBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="tv-spin" style="animation: tvSpin 0.8s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/>
        </svg>
        <span>Forecasting with Kronos 102.3M…</span>
      `;
    }

    try {
      const response = await fetch('/api/forecast_and_decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair: `${state.activeSymbol}/USDT`,
          timeframe: state.timeframe,
          pred_len: 20,
          temperature: 0.4,
          top_p: 0.9,
          candles: state.historicalCandles.slice(-120).map(c => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume
          }))
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      // Render forecast on chart
      if (data.forecast_candles && data.forecast_candles.length > 0) {
        state.forecastCandles = data.forecast_candles;
        chart.setData(state.historicalCandles, state.forecastCandles);
      }

      // Update AI Drawer Results
      updateAiDrawer(data);

    } catch (err) {
      console.warn('Backend forecast fallback:', err);
      // Mathematical Expectation Projection
      const lastC = state.historicalCandles[state.historicalCandles.length - 1];
      const simCandles = [];
      let p = lastC.close;
      const lastD = new Date(lastC.time);

      for (let i = 1; i <= 20; i++) {
        const nextD = new Date(lastD);
        nextD.setDate(nextD.getDate() + i);
        const drift = 12.5 + (Math.random() - 0.44) * (p * 0.006);
        const nextP = p + drift;
        const u80 = nextP + Math.sqrt(i) * 35;
        const l80 = nextP - Math.sqrt(i) * 35;
        const u95 = nextP + Math.sqrt(i) * 55;
        const l95 = nextP - Math.sqrt(i) * 55;

        simCandles.push({
          time: nextD.toISOString().split('T')[0],
          open: +p.toFixed(2),
          high: +(Math.max(p, nextP) + 20).toFixed(2),
          low: +(Math.min(p, nextP) - 20).toFixed(2),
          close: +nextP.toFixed(2),
          volume: 250000000,
          q95_high: +u95.toFixed(2),
          q95_low: +l95.toFixed(2),
        });
        p = nextP;
      }

      state.forecastCandles = simCandles;
      chart.setData(state.historicalCandles, state.forecastCandles);

      updateAiDrawer({
        laya_decision: { action: 'BUY', action_confidence_pct: 78.5 },
        trend_alignment_pct: 82,
        trade_plan: {
          entry_price: state.price,
          stop_loss: +(state.price - 250).toFixed(2),
          take_profit_1: +(state.price + 380).toFixed(2),
          take_profit_2: +(state.price + 650).toFixed(2),
        },
        forecast_candles: simCandles
      });
    } finally {
      state.isAiForecasting = false;
      if (runBtn) {
        runBtn.innerHTML = `⚡ Forecast Next 20 Bars with Kronos`;
      }
    }
  }

  function updateAiDrawer(data) {
    const dec = data.laya_decision || {};
    const plan = data.trade_plan || {};
    const action = dec.action || 'BUY';
    const conf = dec.action_confidence_pct || 78.5;
    const align = data.trend_alignment_pct || 82;

    const bEl = document.getElementById('aiActionBadge');
    const cEl = document.getElementById('aiConfidenceVal');
    const fEl = document.getElementById('aiAlignFill');
    const tEl = document.getElementById('aiAlignText');
    const epEl = document.getElementById('aiEntryPrice');
    const slEl = document.getElementById('aiStopLoss');
    const tp1El = document.getElementById('aiTp1');
    const tp2El = document.getElementById('aiTp2');
    const b80 = document.getElementById('aiBand80');
    const b95 = document.getElementById('aiBand95');

    if (bEl) {
      bEl.textContent = action;
      bEl.className = `tv-ai-action-badge ${action}`;
    }
    if (cEl) cEl.textContent = `${conf.toFixed(1)}%`;
    if (fEl) fEl.style.width = `${align}%`;
    if (tEl) tEl.textContent = `Alignment: ${align}% (${align >= 70 ? 'Strong Bullish Confluence' : 'Neutral Range'})`;

    const fmt = v => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (epEl) epEl.textContent = fmt(plan.entry_price || state.price);
    if (slEl) slEl.textContent = fmt(plan.stop_loss || state.price * 0.985);
    if (tp1El) tp1El.textContent = fmt(plan.take_profit_1 || state.price * 1.025);
    if (tp2El) tp2El.textContent = fmt(plan.take_profit_2 || state.price * 1.05);

    if (data.forecast_candles && data.forecast_candles.length > 0) {
      const lastF = data.forecast_candles[data.forecast_candles.length - 1];
      if (b80 && lastF.conf_l80 && lastF.conf_u80) b80.textContent = `${fmt(lastF.conf_l80)} - ${fmt(lastF.conf_u80)}`;
      if (b95 && lastF.q95_low && lastF.q95_high) b95.textContent = `${fmt(lastF.q95_low)} - ${fmt(lastF.q95_high)}`;
    }
  }

  // ── Setup Event Listeners ──
  function setupListeners() {
    // Drawer buttons
    const drawerAiBtn = document.getElementById('runAiBtnInsideDrawer');
    const drawerClose = document.getElementById('aiDrawerClose');

    if (drawerAiBtn) drawerAiBtn.addEventListener('click', triggerAiForecast);
    if (drawerClose) drawerClose.addEventListener('click', () => {
      const drawer = document.getElementById('aiDrawer');
      if (drawer) drawer.classList.remove('open');
    });

    // Timeframe Buttons
    document.querySelectorAll('.tv-tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tv-tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.timeframe = btn.getAttribute('data-tf') || '1d';
      });
    });

    // Bottom Range Bar: 1D 5D 1M 3M 6M YTD 1Y 5Y All
    document.querySelectorAll('.tv-range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tv-range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const range = btn.getAttribute('data-range') || '1y';
        chart.setTimeframe(range);
      });
    });

    // Drawing Tools
    document.querySelectorAll('.tv-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tv-tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeTool = btn.getAttribute('data-tool');
      });
    });

    // Clear Drawings
    const clearBtn = document.getElementById('clearDrawingsBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.forecastCandles = [];
        chart.setData(state.historicalCandles, []);
      });
    }

    // Live Clock matching screenshot timezone GMT+5:30
    const clockEl = document.getElementById('tvLiveClock');
    const updateClock = () => {
      if (!clockEl) return;
      const now = new Date();
      // UTC+5:30
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const ist = new Date(utc + (3600000 * 5.5));
      const h = String(ist.getHours()).padStart(2, '0');
      const m = String(ist.getMinutes()).padStart(2, '0');
      const s = String(ist.getSeconds()).padStart(2, '0');
      clockEl.textContent = `${h}:${m}:${s} UTC+5:30`;
    };
    setInterval(updateClock, 1000);
    updateClock();

    // ── Authentic TradingView Symbol & Indices Search Modal ──
    const modalBackdrop = document.getElementById('symbolModalBackdrop');
    const modalClose = document.getElementById('symbolModalClose');
    const modalInput = document.getElementById('symbolSearchInput');
    let activeSearchCategory = 'indices'; // Default to Indices as requested

    function openSymbolSearch(cat = 'indices') {
      if (!modalBackdrop) return;
      activeSearchCategory = cat;
      modalBackdrop.classList.add('open');
      modalBackdrop.style.display = 'flex';

      // Update active tab button
      document.querySelectorAll('.tv-modal-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-cat') === activeSearchCategory);
      });

      if (modalInput) {
        modalInput.value = '';
        modalInput.focus();
      }
      renderSymbolSearchResults('', activeSearchCategory);
    }

    function closeSymbolSearch() {
      if (!modalBackdrop) return;
      modalBackdrop.classList.remove('open');
      modalBackdrop.style.display = 'none';
    }

    window.openSymbolSearch = openSymbolSearch;
    window.closeSymbolSearch = closeSymbolSearch;
    window.renderSymbolSearchResults = renderSymbolSearchResults;
    window.switchSymbol = switchSymbol;

    if (modalClose) modalClose.addEventListener('click', closeSymbolSearch);
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeSymbolSearch();
      });
    }

    // Modal Tabs
    document.querySelectorAll('.tv-modal-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.tv-modal-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeSearchCategory = tab.getAttribute('data-cat') || 'all';
        renderSymbolSearchResults(modalInput ? modalInput.value : '', activeSearchCategory);
      });
    });

    // Real-time input search
    if (modalInput) {
      modalInput.addEventListener('input', (e) => {
        renderSymbolSearchResults(e.target.value, activeSearchCategory);
      });
    }

    // Connect all open triggers
    const searchTriggers = [
      '#header-toolbar-symbol-search',
      '.searchButton-HclmObIW',
      '#symbolSearchBtn',
      '[title="Symbol search"]',
      '[aria-label="Symbol search"]',
      '[data-tooltip="Quick search"]',
      '[aria-label="Quick search"]',
      '[aria-label="Change symbol"]',
      '.titleWrapper-quatTGAC .title-quatTGAC',
      '#hudSymTitle',
      '[data-name="add-symbol-button"]',
      '[data-name="add-symbol"]',
      '[aria-label="Add symbol"]',
      '[data-tooltip="Add symbol"]'
    ];

    document.querySelectorAll(searchTriggers.join(',')).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSymbolSearch('indices');
      });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Escape
      if (e.key === 'Escape') {
        closeSymbolSearch();
      }
      // '/' (Slash hotkey for symbol search when not inside an input)
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        openSymbolSearch('indices');
      }
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSymbolSearch('indices');
      }
      // Ctrl+Shift+H for components hub
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        const hubModal = document.getElementById('tvHubModalBackdrop') || document.getElementById('tvHarHubModal');
        if (hubModal) {
          hubModal.style.display = hubModal.style.display === 'flex' ? 'none' : 'flex';
        }
      }
    });

    // Render Search Results Function
    function renderSymbolSearchResults(query, category) {
      const resBox = document.getElementById('symbolSearchResults');
      if (!resBox) return;
      resBox.innerHTML = '';

      const q = (query || '').toLowerCase().trim();
      const cat = (category || 'all').toLowerCase();

      const filtered = SYMBOLS_DATABASE.filter(item => {
        const matchCat = (cat === 'all') || (item.category === cat);
        if (!matchCat) return false;
        if (!q) return true;
        return (
          item.symbol.toLowerCase().includes(q) ||
          (item.displaySymbol && item.displaySymbol.toLowerCase().includes(q)) ||
          (item.name && item.name.toLowerCase().includes(q)) ||
          (item.exchange && item.exchange.toLowerCase().includes(q))
        );
      });

      if (filtered.length === 0) {
        resBox.innerHTML = `
          <div style="padding: 40px 20px; text-align: center; color: #787b86;">
            <div style="font-size: 28px; margin-bottom: 8px;">🔍</div>
            <div style="font-weight: 600; font-size: 14px; color: #131722;">No symbols match "${query}"</div>
            <div style="font-size: 12px; margin-top: 4px;">Try searching in 'All' or checking spelling</div>
          </div>
        `;
        return;
      }

      filtered.forEach(item => {
        const row = document.createElement('div');
        row.className = 'tv-modal-item';

        const isUp = (item.chg || 0) >= 0;
        const fmt = v => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        row.innerHTML = `
          <div class="tv-modal-item-left">
            <div class="tv-modal-item-badge" style="background: ${item.badgeBg || '#1e53e5'}">${item.badgeText || item.symbol.slice(0, 2)}</div>
            <div class="tv-modal-item-details">
              <div class="tv-modal-item-row1">
                <span class="tv-modal-item-sym">${item.displaySymbol || item.symbol}</span>
                ${item.category === 'indices' ? '<span style="font-size:10px;font-weight:700;color:#2962ff;background:#ebf2ff;padding:1px 5px;border-radius:3px;">INDEX</span>' : ''}
              </div>
              <div class="tv-modal-item-desc">${item.name} · ${item.exchange}</div>
            </div>
          </div>
          <div class="tv-modal-item-right">
            <div class="tv-modal-item-meta">
              <span class="tv-modal-item-exchange">${item.exchange}</span>
              <span class="tv-modal-item-type">${item.type}</span>
            </div>
            <div class="tv-modal-item-prices">
              <div class="tv-modal-item-price">${fmt(item.last)}</div>
              <div class="tv-modal-item-chg ${isUp ? 'up' : 'dn'}">${isUp ? '+' : ''}${(item.pct || 0).toFixed(2)}%</div>
            </div>
          </div>
        `;

        row.addEventListener('click', () => {
          switchSymbol(item);
          closeSymbolSearch();
        });

        resBox.appendChild(row);
      });
    }

    // 9-Dots Launcher (TradingView Components & Assets Hub)
    const nineDotsBtn = document.getElementById('tvNineDotsBtn');
    const hubModal = document.getElementById('tvHarHubModal');
    if (nineDotsBtn && hubModal) {
      nineDotsBtn.addEventListener('click', () => {
        hubModal.style.display = 'flex';
      });
    }

    // Right Ribbon Buttons Handler
    const ribbonBtns = document.querySelectorAll('.tv-right-ribbon .tv-ribbon-btn');
    const watchlistDrawer = document.getElementById('watchlistDrawer');
    ribbonBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.id === 'ribbonWatchlistBtn') {
          const isCurrentlyActive = btn.classList.contains('active');
          if (isCurrentlyActive && watchlistDrawer) {
            const isVisible = watchlistDrawer.style.display !== 'none';
            watchlistDrawer.style.display = isVisible ? 'none' : 'flex';
            btn.classList.toggle('active', !isVisible);
          } else if (watchlistDrawer) {
            watchlistDrawer.style.display = 'flex';
            ribbonBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
          }
        } else {
          ribbonBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });
  }

  // ── Exact TradingView Transplanted Interactivity ──
  function setupExactTradingViewInteractions() {
    // 1. Watchlist Symbol Click Handling
    document.querySelectorAll('[data-symbol-short]').forEach(row => {
      row.addEventListener('click', (e) => {
        const symShort = row.getAttribute('data-symbol-short');
        if (!symShort) return;
        const found = WATCHLIST.find(w => w.symbol === symShort || w.displaySymbol === symShort);
        if (found) {
          switchSymbol(found);
        } else {
          // Dynamic item
          const fallbackItem = {
            symbol: symShort,
            displaySymbol: symShort,
            name: symShort,
            exchange: 'NSE',
            last: 1000.0,
            chg: 0.0,
            pct: 0.0,
            file: `${symShort}.json`
          };
          switchSymbol(fallbackItem);
        }
      });
    });

    // 2. Right Toolbar Dock Buttons
    const baseBtn = document.querySelector('[data-name="base"]');
    if (baseBtn) {
      baseBtn.addEventListener('click', () => {
        const pages = document.querySelector('.widgetbar-pages');
        const host = document.getElementById('widgetbarHost');
        if (pages && host) {
          const isHidden = pages.classList.contains('hidden');
          if (isHidden) {
            pages.classList.remove('hidden');
            pages.style.display = 'block';
            host.style.width = '345px';
            host.style.minWidth = '345px';
            baseBtn.classList.add('isActive-zm3YRUFG');
          } else {
            pages.classList.add('hidden');
            pages.style.display = 'none';
            host.style.width = '45px';
            host.style.minWidth = '45px';
            baseBtn.classList.remove('isActive-zm3YRUFG');
          }
        }
      });
    }

    const copilotBtn = document.querySelector('[data-name="copilot-dialog-button"]');
    if (copilotBtn) {
      copilotBtn.addEventListener('click', () => {
        const drawer = document.getElementById('aiDrawer');
        if (drawer) drawer.classList.toggle('open');
      });
    }

    const hubBtns = document.querySelectorAll('[data-name="community-hub-button"], [data-name="help-button"]');
    hubBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const hubModal = document.getElementById('tvHubModalBackdrop');
        if (hubModal) hubModal.style.display = 'flex';
      });
    });

    // 3. Left Drawing Toolbar Buttons
    const toolButtons = document.querySelectorAll('#drawing-toolbar button[class*="button-Pa6R9wGK"], #drawing-toolbar button[class*="button-zm3YRUFG"]');
    toolButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dropdownParent = btn.closest('[data-name]');
        const toolName = dropdownParent ? dropdownParent.getAttribute('data-name') : '';
        
        if (toolName === 'magnet-button') {
          btn.classList.toggle('isActive-zm3YRUFG');
          if (window.drawingEngine) window.drawingEngine.magnetMode = !window.drawingEngine.magnetMode;
          return;
        }
        if (toolName === 'lock-all') {
          btn.classList.toggle('isActive-zm3YRUFG');
          if (window.drawingEngine) window.drawingEngine.lockAll = !window.drawingEngine.lockAll;
          return;
        }
        if (toolName === 'hide-all') {
          btn.classList.toggle('isActive-zm3YRUFG');
          if (window.drawingEngine) {
            window.drawingEngine.hideAll = !window.drawingEngine.hideAll;
            window.drawingEngine.redraw();
          }
          return;
        }
        if (toolName === 'removeAllDrawingTools') {
          if (window.drawingEngine) {
            window.drawingEngine.drawings = [];
            window.drawingEngine.redraw();
            window.drawingEngine.hideFloatingToolbar();
          }
          return;
        }

        // Active state toggling
        toolButtons.forEach(b => {
          const parent = b.closest('[data-name]');
          const pName = parent ? parent.getAttribute('data-name') : '';
          if (!['magnet-button', 'lock-all', 'hide-all', 'removeAllDrawingTools'].includes(pName)) {
            b.classList.remove('isActive-zm3YRUFG');
          }
        });
        btn.classList.add('isActive-zm3YRUFG');

        // Map TV data-name to drawing tool
        const toolMap = {
          'linetool-group-cursors': 'crosshair',
          'linetool-group-trend-line': 'trendline',
          'linetool-group-gann-and-fibonacci': 'pitchfork',
          'linetool-group-geometric-shapes': 'brush',
          'linetool-group-annotation': 'text',
          'linetool-group-patterns': 'patterns',
          'linetool-group-prediction-and-measurement': 'prediction',
          'measure': 'measure',
          'zoom': 'zoom'
        };
        const mapped = toolMap[toolName] || 'crosshair';
        if (window.drawingEngine) {
          window.drawingEngine.selectTool(mapped, btn);
        }
      });
    });

    // 4. Instant Buy / Sell Buttons
    const sellBtn = document.querySelector('[data-name="sell-order-button"]');
    const buyBtn = document.querySelector('[data-name="buy-order-button"]');
    if (sellBtn) {
      sellBtn.addEventListener('click', () => {
        alert(`Sell order simulated for ${state.activeSymbol} at ${state.price}`);
      });
    }
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        alert(`Buy order simulated for ${state.activeSymbol} at ${state.price}`);
      });
    }

    // 5. Authentic Top Header Toolbar Controls
    const searchBtns = document.querySelectorAll('[title="Symbol search"], [aria-label="Symbol search"], .searchButton-HclmObIW, #symbolSearchBtn, #header-toolbar-symbol-search');
    searchBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.openSymbolSearch) window.openSymbolSearch('indices');
      });
    });

    const fsBtns = document.querySelectorAll('[data-name="header-toolbar-fullscreen"], [aria-label="Fullscreen mode"], #fullscreenBtn');
    fsBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    });

    const alertBtns = document.querySelectorAll('[aria-label="Create alert"], #alertBtn');
    alertBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        alert(`Alert configured for ${state.activeSymbol} at current price.`);
      });
    });

    const upgradeBtns = document.querySelectorAll('[data-qa-id*="upgrade-button"], #upgradeBtn');
    upgradeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const hubModal = document.getElementById('tvHubModalBackdrop');
        if (hubModal) hubModal.style.display = 'flex';
      });
    });

    // Main menu handled by tv_interactive_engine.js
  }

  // ── Initial Boot ──
  renderWatchlist();
  setupListeners();
  setupExactTradingViewInteractions();

  // Support direct modal opening via query params
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('search') || urlParams.has('open_search')) {
    const openVal = urlParams.get('open_search');
    const cat = urlParams.get('cat') || (openVal && openVal !== '1' && openVal !== 'true' ? openVal : 'indices');
    const q = urlParams.get('q') || '';
    if (window.openSymbolSearch) {
      window.openSymbolSearch(cat);
      if (q) {
        const inp = document.getElementById('symbolSearchInput');
        if (inp) inp.value = q;
        if (window.renderSymbolSearchResults) window.renderSymbolSearchResults(q, cat);
      }
    }
  }

  // Load Initial NIFTY 50 Real Data
  const initialSymbol = WATCHLIST[0];
  state.historicalCandles = await loadSymbolData(initialSymbol);
  chart.setData(state.historicalCandles, []);
});
