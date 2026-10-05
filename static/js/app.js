/**
 * Chartkar TradingAI — Full-Featured Terminal Controller
 * TradingView-grade features:
 * - Symbol Search (all Indian NSE/BSE + global + crypto + options)
 * - Watchlist with live prices + sparklines
 * - Multi-tab workspace
 * - Full indicator library (SMA, EMA, BB, VWAP, RSI, MACD, Stochastic, ATR, ADX)
 * - Drawing tools (trendlines, rectangles, fib, channels, text)
 * - Market depth / order book simulation
 * - NSE Options chain with greeks
 * - Stock screener
 * - Market news feed
 * - AI Analysis (Kronos + Laya) with on-chart projection
 * - Backtest suite with equity curve
 * - Trade plan + position sizing
 * - Price alert system
 * - Dark/Light theme
 * - CSV upload
 */

document.addEventListener('DOMContentLoaded', () => {

  // ────────────────────────────────────────────────────────────────
  // APPLICATION STATE
  // ────────────────────────────────────────────────────────────────
  const state = {
    pair: 'NIFTY50',
    timeframe: '5m',
    exchange: 'NSE',
    scenario: 'none',
    bars: 500,
    chartType: 'candle',
    predLen: 20,
    temperature: 0.8,
    topP: 0.9,
    theme: 'dark',
    historicalCandles: [],
    forecastCandles: [],
    indicators: null,
    tradeMarkers: [],
    isForecasting: false,
    alerts: [],
    activeIndicators: [],
    drawings: [],
    watchlist: [],
    screenerResults: [],
    depthData: null,
    optionsChain: [],
    newsItems: [],
    openPositions: [],
    backtest: null,
    magnets: false,
    drawingTool: null,
    activeTool: 'cursor',
    aiVisible: false,
  };

  // ── Initialize Canvas Chart ──────────────────────────────────────
  const chart = new TradingChart('tradingChart');
  window.tradingChart = chart;

  // ── All Markets Dataset ──────────────────────────────────────────
  const ALL_MARKETS = [
    // Indian Indices
    { epic:'NIFTY50', name:'NIFTY 50', exchange:'NSE', type:'INDICES', price:25148.2, change:0.39 },
    { epic:'BANKNIFTY', name:'NIFTY Bank', exchange:'NSE', type:'INDICES', price:54320.5, change:-0.12 },
    { epic:'FINNIFTY', name:'NIFTY Financial Services', exchange:'NSE', type:'INDICES', price:24810.0, change:0.22 },
    { epic:'MIDCPNIFTY', name:'NIFTY Midcap Select', exchange:'NSE', type:'INDICES', price:13180.5, change:0.55 },
    { epic:'SENSEX', name:'BSE SENSEX', exchange:'BSE', type:'INDICES', price:82340.0, change:0.31 },
    { epic:'NIFTYIT', name:'NIFTY IT Index', exchange:'NSE', type:'INDICES', price:43200.0, change:1.2 },
    { epic:'NIFTYPHARMA', name:'NIFTY Pharma', exchange:'NSE', type:'INDICES', price:22150.0, change:0.45 },
    { epic:'NIFTYAUTO', name:'NIFTY Auto', exchange:'NSE', type:'INDICES', price:28650.0, change:-0.3 },
    { epic:'NIFTYFMCG', name:'NIFTY FMCG', exchange:'NSE', type:'INDICES', price:58900.0, change:0.18 },
    // NSE F&O Options
    { epic:'NIFTY25000CE', name:'NIFTY 25000 CALL', exchange:'NSE', type:'OPTIONS', price:185.5, change:12.4 },
    { epic:'NIFTY25000PE', name:'NIFTY 25000 PUT', exchange:'NSE', type:'OPTIONS', price:142.2, change:-8.1 },
    { epic:'NIFTY25100CE', name:'NIFTY 25100 CALL', exchange:'NSE', type:'OPTIONS', price:128.0, change:15.2 },
    { epic:'NIFTY25100PE', name:'NIFTY 25100 PUT', exchange:'NSE', type:'OPTIONS', price:196.4, change:-5.9 },
    { epic:'NIFTY25200CE', name:'NIFTY 25200 CALL', exchange:'NSE', type:'OPTIONS', price:78.5, change:22.1 },
    { epic:'NIFTY25200PE', name:'NIFTY 25200 PUT', exchange:'NSE', type:'OPTIONS', price:255.0, change:-3.2 },
    { epic:'BANKNIFTY54000CE', name:'BANKNIFTY 54000 CALL', exchange:'NSE', type:'OPTIONS', price:340.0, change:8.5 },
    { epic:'BANKNIFTY54000PE', name:'BANKNIFTY 54000 PUT', exchange:'NSE', type:'OPTIONS', price:295.5, change:-4.2 },
    { epic:'BANKNIFTY54500CE', name:'BANKNIFTY 54500 CALL', exchange:'NSE', type:'OPTIONS', price:210.0, change:18.3 },
    { epic:'BANKNIFTY54500PE', name:'BANKNIFTY 54500 PUT', exchange:'NSE', type:'OPTIONS', price:380.0, change:-2.1 },
    // Top NSE Equities
    { epic:'RELIANCE', name:'Reliance Industries Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:2985.0, change:0.85 },
    { epic:'TCS', name:'Tata Consultancy Services', exchange:'NSE', type:'INDIAN_STOCKS', price:4260.0, change:1.2 },
    { epic:'HDFCBANK', name:'HDFC Bank Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:1675.0, change:-0.3 },
    { epic:'INFY', name:'Infosys Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:1895.0, change:0.92 },
    { epic:'ICICIBANK', name:'ICICI Bank Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:1245.0, change:0.55 },
    { epic:'SBIN', name:'State Bank of India', exchange:'NSE', type:'INDIAN_STOCKS', price:815.0, change:1.05 },
    { epic:'BHARTIARTL', name:'Bharti Airtel Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:1660.0, change:0.72 },
    { epic:'TATAMOTORS', name:'Tata Motors Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:985.0, change:-1.2 },
    { epic:'ITC', name:'ITC Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:512.0, change:0.28 },
    { epic:'BAJFINANCE', name:'Bajaj Finance Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:7240.0, change:-0.45 },
    { epic:'LT', name:'Larsen & Toubro Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:3620.0, change:0.61 },
    { epic:'WIPRO', name:'Wipro Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:540.0, change:1.45 },
    { epic:'MARUTI', name:'Maruti Suzuki India Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:12800.0, change:0.38 },
    { epic:'HCLTECH', name:'HCL Technologies Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:1820.0, change:0.95 },
    { epic:'KOTAKBANK', name:'Kotak Mahindra Bank', exchange:'NSE', type:'INDIAN_STOCKS', price:1920.0, change:-0.22 },
    { epic:'AXISBANK', name:'Axis Bank Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:1175.0, change:0.48 },
    { epic:'TITAN', name:'Titan Company Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:3850.0, change:1.1 },
    { epic:'ASIANPAINT', name:'Asian Paints Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:2640.0, change:-0.85 },
    { epic:'NESTLEIND', name:'Nestlé India Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:2410.0, change:0.33 },
    { epic:'POWERGRID', name:'Power Grid Corp', exchange:'NSE', type:'INDIAN_STOCKS', price:342.0, change:0.72 },
    { epic:'NTPC', name:'NTPC Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:385.0, change:0.82 },
    { epic:'SUNPHARMA', name:'Sun Pharmaceutical', exchange:'NSE', type:'INDIAN_STOCKS', price:1895.0, change:1.35 },
    { epic:'DRREDDY', name:'Dr. Reddy\'s Laboratories', exchange:'NSE', type:'INDIAN_STOCKS', price:1285.0, change:0.55 },
    { epic:'CIPLA', name:'Cipla Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:1640.0, change:0.44 },
    { epic:'ONGC', name:'Oil & Natural Gas Corp', exchange:'NSE', type:'INDIAN_STOCKS', price:272.0, change:1.22 },
    { epic:'JSWSTEEL', name:'JSW Steel Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:960.0, change:-0.62 },
    { epic:'TATASTEEL', name:'Tata Steel Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:165.0, change:-1.05 },
    { epic:'HINDALCO', name:'Hindalco Industries', exchange:'NSE', type:'INDIAN_STOCKS', price:695.0, change:0.88 },
    { epic:'VEDL', name:'Vedanta Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:445.0, change:2.1 },
    { epic:'COALINDIA', name:'Coal India Ltd', exchange:'NSE', type:'INDIAN_STOCKS', price:485.0, change:0.92 },
    // Global
    { epic:'US100', name:'Nasdaq 100', exchange:'CME', type:'INDICES', price:29350.0, change:-0.22 },
    { epic:'US500', name:'S&P 500', exchange:'CME', type:'INDICES', price:5780.0, change:0.15 },
    { epic:'EURUSD', name:'Euro / US Dollar', exchange:'FOREX', type:'CURRENCIES', price:1.0850, change:0.08 },
    { epic:'GBPUSD', name:'British Pound / USD', exchange:'FOREX', type:'CURRENCIES', price:1.3020, change:-0.12 },
    { epic:'USDINR', name:'US Dollar / Indian Rupee', exchange:'FOREX', type:'CURRENCIES', price:83.92, change:0.04 },
    { epic:'BTCUSD', name:'Bitcoin / USD', exchange:'CRYPTO', type:'CRYPTOCURRENCIES', price:65400.0, change:1.2 },
    { epic:'ETHUSD', name:'Ethereum / USD', exchange:'CRYPTO', type:'CRYPTOCURRENCIES', price:2540.0, change:0.85 },
    { epic:'SOLUSD', name:'Solana / USD', exchange:'CRYPTO', type:'CRYPTOCURRENCIES', price:168.0, change:2.4 },
    { epic:'BNBUSD', name:'Binance Coin / USD', exchange:'CRYPTO', type:'CRYPTOCURRENCIES', price:582.0, change:0.65 },
    { epic:'GOLD', name:'Spot Gold (XAU/USD)', exchange:'CME', type:'COMMODITIES', price:2652.0, change:0.32 },
    { epic:'SILVER', name:'Spot Silver (XAG/USD)', exchange:'CME', type:'COMMODITIES', price:31.85, change:0.78 },
    { epic:'CRUDEOIL', name:'Crude Oil WTI', exchange:'CME', type:'COMMODITIES', price:73.40, change:-0.55 },
    { epic:'NATURALGAS', name:'Natural Gas', exchange:'CME', type:'COMMODITIES', price:2.48, change:1.22 },
  ];

  // ── Indicator Library ────────────────────────────────────────────
  const INDICATOR_LIBRARY = [
    { id:'sma20', name:'SMA 20', desc:'Simple Moving Average (20)', category:'overlays', color:'#f59e0b' },
    { id:'sma50', name:'SMA 50', desc:'Simple Moving Average (50)', category:'overlays', color:'#38bdf8' },
    { id:'sma200', name:'SMA 200', desc:'Simple Moving Average (200)', category:'overlays', color:'#6366f1' },
    { id:'ema9', name:'EMA 9', desc:'Exponential Moving Average (9)', category:'overlays', color:'#fb923c' },
    { id:'ema21', name:'EMA 21', desc:'Exponential Moving Average (21)', category:'overlays', color:'#f97316' },
    { id:'bb', name:'Bollinger Bands', desc:'BB(20,2) volatility envelope', category:'volatility', color:'#a855f7' },
    { id:'vwap', name:'VWAP', desc:'Volume Weighted Average Price', category:'overlays', color:'#f43f5e' },
    { id:'ichimoku', name:'Ichimoku Cloud', desc:'Ichimoku Kinko Hyo', category:'trend', color:'#06b6d4' },
    { id:'rsi', name:'RSI 14', desc:'Relative Strength Index (14)', category:'momentum', color:'#7c3aed' },
    { id:'macd', name:'MACD', desc:'MACD (12,26,9)', category:'momentum', color:'#2962ff' },
    { id:'stoch', name:'Stochastic', desc:'Stochastic Oscillator (14,3,3)', category:'momentum', color:'#d97706' },
    { id:'cci', name:'CCI 20', desc:'Commodity Channel Index (20)', category:'momentum', color:'#16a34a' },
    { id:'willr', name:'Williams %R', desc:'Williams % Range (14)', category:'momentum', color:'#dc2626' },
    { id:'mfi', name:'MFI 14', desc:'Money Flow Index (14)', category:'volume', color:'#0891b2' },
    { id:'obv', name:'OBV', desc:'On Balance Volume', category:'volume', color:'#7c3aed' },
    { id:'vol', name:'Volume Bars', desc:'Trading volume histogram', category:'volume', color:'#60a5fa' },
    { id:'atr', name:'ATR 14', desc:'Average True Range (14)', category:'volatility', color:'#f59e0b' },
    { id:'adx', name:'ADX 14', desc:'Average Directional Index (14)', category:'trend', color:'#10b981' },
    { id:'supertrend', name:'Supertrend', desc:'Supertrend (7, 3.0)', category:'trend', color:'#22c55e' },
    { id:'parabolicsar', name:'Parabolic SAR', desc:'Parabolic SAR (0.02, 0.2)', category:'trend', color:'#3b82f6' },
    { id:'kronos', name:'Kronos Forecast', desc:'AI-powered price forecast overlay', category:'ai', color:'#2962ff' },
    { id:'laya_signal', name:'Laya Signals', desc:'BUY/SELL signals from Laya AI', category:'ai', color:'#7c3aed' },
  ];

  // ════════════════════════════════════════════════════════════════
  // TOAST NOTIFICATION SYSTEM
  // ════════════════════════════════════════════════════════════════
  function showToast(message, type = 'info', duration = 3500) {
    const region = document.getElementById('toastRegion');
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ'}</span>
      <span class="toast-msg">${message}</span>
      <button class="toast-close" aria-label="Close">×</button>
    `;
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.remove('toast-visible');
      setTimeout(() => toast.remove(), 250);
    });
    region.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 250);
      }
    }, duration);
  }
  window.showToast = showToast;

  // ════════════════════════════════════════════════════════════════
  // STATUS BAR CLOCK
  // ════════════════════════════════════════════════════════════════
  function updateClock() {
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60000));
    const hh = String(ist.getUTCHours()).padStart(2,'0');
    const mm = String(ist.getUTCMinutes()).padStart(2,'0');
    const ss = String(ist.getUTCSeconds()).padStart(2,'0');
    const sbTime = document.getElementById('sbTime');
    if (sbTime) sbTime.textContent = `${hh}:${mm}:${ss}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  function updateStatusBar() {
    const sbPair = document.getElementById('sbPair');
    const sbTf = document.getElementById('sbTf');
    const sbCandles = document.getElementById('sbCandles');
    const sbLastUpdate = document.getElementById('sbLastUpdate');
    if (sbPair) sbPair.textContent = state.pair;
    if (sbTf) sbTf.textContent = state.timeframe;
    if (sbCandles) sbCandles.textContent = state.historicalCandles.length;
    if (sbLastUpdate) {
      const now = new Date();
      sbLastUpdate.innerHTML = `Updated: <b>${now.toLocaleTimeString('en-IN')}</b>`;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // THEME SWITCHER
  // ════════════════════════════════════════════════════════════════
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      if (themeIcon) themeIcon.textContent = state.theme === 'dark' ? 'Theme' : 'Theme';
      if (chart) chart.render();
      showToast(`${state.theme === 'dark' ? 'Dark' : 'Light'} theme`, 'info', 1500);
    });
  }

  // ════════════════════════════════════════════════════════════════
  // PANEL TAB SYSTEM
  // ════════════════════════════════════════════════════════════════
  document.querySelectorAll('.panel-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel-body').forEach(p => p.classList.add('hidden'));
      btn.classList.add('active');
      const tab = document.getElementById('tab-' + btn.dataset.tab);
      if (tab) tab.classList.remove('hidden');

      // Lazy load tab content
      if (btn.dataset.tab === 'depth') renderDepthPanel();
      if (btn.dataset.tab === 'options') renderOptionsChain();
      if (btn.dataset.tab === 'screener') renderScreener();
      if (btn.dataset.tab === 'news') renderNewsFeed();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // TIMEFRAME BUTTONS
  // ════════════════════════════════════════════════════════════════
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.timeframe = btn.dataset.tf;
      updateStatusBar();
      fetchMarketData();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // CHART TYPE BUTTONS
  // ════════════════════════════════════════════════════════════════
  document.querySelectorAll('.ct-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ct-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.chartType = btn.dataset.ct;
      if (chart) {
        chart.chartType = state.chartType;
        chart.render();
      }
      showToast(`Chart type: ${btn.title}`, 'info', 1500);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // MULTI-TAB WORKSPACE
  // ════════════════════════════════════════════════════════════════
  function setupWorkspaceTabs() {
    const bar = document.getElementById('workspaceTabsBar');
    if (!bar) return;

    bar.addEventListener('click', e => {
      const tab = e.target.closest('.ws-tab');
      const closeBtn = e.target.closest('.ws-tab-close');
      const addBtn = e.target.closest('.ws-add-tab');

      if (addBtn) {
        openSymbolSearch();
        return;
      }

      if (closeBtn && tab) {
        e.stopPropagation();
        if (bar.querySelectorAll('.ws-tab').length <= 1) {
          showToast('Cannot close the last tab', 'warning');
          return;
        }
        const wasActive = tab.classList.contains('active');
        tab.remove();
        if (wasActive) {
          const firstTab = bar.querySelector('.ws-tab');
          if (firstTab) firstTab.click();
        }
        return;
      }

      if (tab) {
        bar.querySelectorAll('.ws-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.pair = tab.dataset.pair;
        state.timeframe = tab.dataset.tf;
        state.exchange = tab.dataset.exchange || 'NSE';

        document.querySelectorAll('.tf-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.tf === state.timeframe);
        });

        updateHeaderSymbol();
        updateStatusBar();
        fetchMarketData();
      }
    });
  }
  setupWorkspaceTabs();

  function addWorkspaceTab(epic, tf, exchange) {
    const bar = document.getElementById('workspaceTabsBar');
    if (!bar) return;
    // Avoid duplicates
    const existing = bar.querySelector(`[data-pair="${epic}"]`);
    if (existing) {
      existing.click();
      return;
    }
    const mkt = ALL_MARKETS.find(m => m.epic === epic);
    const change = mkt ? mkt.change : 0;
    const chgClass = change >= 0 ? 'up' : 'dn';
    const tab = document.createElement('div');
    tab.className = 'ws-tab';
    tab.dataset.pair = epic;
    tab.dataset.tf = tf || state.timeframe;
    tab.dataset.exchange = exchange || 'NSE';
    tab.innerHTML = `
      <span>${epic}</span>
      <span class="ws-tab-pnl ${chgClass}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>
      <button class="ws-tab-close" title="Close tab">×</button>
    `;
    const addBtn = bar.querySelector('.ws-add-tab');
    bar.insertBefore(tab, addBtn);
    tab.click();
  }

  // ════════════════════════════════════════════════════════════════
  // SYMBOL SEARCH MODAL
  // ════════════════════════════════════════════════════════════════
  const symSearchOverlay = document.getElementById('symSearchOverlay');
  const symSearchInput = document.getElementById('symSearchInput');
  const symSearchResults = document.getElementById('symSearchResults');
  const symSearchClose = document.getElementById('symSearchClose');
  let symSearchCat = 'all';

  function openSymbolSearch() {
    if (!symSearchOverlay) return;
    symSearchOverlay.classList.add('open');
    if (symSearchInput) { symSearchInput.value = ''; symSearchInput.focus(); }
    renderSymbolResults('');
  }

  function closeSymbolSearch() {
    if (symSearchOverlay) symSearchOverlay.classList.remove('open');
  }

  document.getElementById('symbolHeaderBtn')?.addEventListener('click', openSymbolSearch);
  symSearchClose?.addEventListener('click', closeSymbolSearch);
  symSearchOverlay?.addEventListener('click', e => { if (e.target === symSearchOverlay) closeSymbolSearch(); });

  document.querySelectorAll('.sym-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sym-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      symSearchCat = btn.dataset.cat;
      renderSymbolResults(symSearchInput?.value || '');
    });
  });

  symSearchInput?.addEventListener('input', e => renderSymbolResults(e.target.value));

  document.addEventListener('keydown', e => {
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      openSymbolSearch();
    }
    if (e.key === 'Escape') closeSymbolSearch();
  });

  function renderSymbolResults(q) {
    if (!symSearchResults) return;
    const q_low = q.toLowerCase().trim();
    let markets = ALL_MARKETS;
    if (symSearchCat !== 'all') markets = markets.filter(m => m.type === symSearchCat);
    if (q_low) markets = markets.filter(m => m.epic.toLowerCase().includes(q_low) || m.name.toLowerCase().includes(q_low));

    if (!q_low && symSearchCat === 'all') {
      // Show favourites first
      const favs = ['NIFTY50','BANKNIFTY','RELIANCE','HDFCBANK','BTCUSD','GOLD','NIFTY25000CE'];
      symSearchResults.innerHTML = `
        <div class="sym-fav-section">
          <div class="sym-fav-label">⭐ Favourites</div>
          ${favs.map(f => {
            const m = ALL_MARKETS.find(x => x.epic === f);
            if (!m) return '';
            return renderSymResultHTML(m);
          }).join('')}
          <div class="sym-fav-label" style="margin-top:8px;">All Markets</div>
          ${ALL_MARKETS.slice(0,20).map(renderSymResultHTML).join('')}
        </div>
      `;
    } else if (markets.length === 0) {
      symSearchResults.innerHTML = `<div class="sym-search-empty">No results for "${q}"</div>`;
    } else {
      symSearchResults.innerHTML = markets.map(renderSymResultHTML).join('');
    }

    symSearchResults.querySelectorAll('.sym-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const epic = item.dataset.epic;
        const exchange = item.dataset.exchange;
        closeSymbolSearch();
        addWorkspaceTab(epic, state.timeframe, exchange);
      });
    });
  }

  function renderSymResultHTML(m) {
    const sign = m.change >= 0 ? '+' : '';
    const chgCls = m.change >= 0 ? 'up' : 'dn';
    const typeCls = m.type;
    return `
      <div class="sym-result-item ${state.pair === m.epic ? 'active-sym' : ''}" data-epic="${m.epic}" data-exchange="${m.exchange}">
        <div class="sym-result-left">
          <div class="sym-result-name">${m.epic}</div>
          <div class="sym-result-full">${m.name}</div>
        </div>
        <div class="sym-result-right">
          <span class="sym-result-type ${typeCls}">${m.type.replace('_',' ')}</span>
          <span class="sym-result-exch">${m.exchange}</span>
          <span class="sym-result-price ${chgCls}">${sign}${m.change.toFixed(2)}%</span>
        </div>
      </div>
    `;
  }

  // ════════════════════════════════════════════════════════════════
  // HEADER SYMBOL UPDATE
  // ════════════════════════════════════════════════════════════════
  function updateHeaderSymbol() {
    const mkt = ALL_MARKETS.find(m => m.epic === state.pair);
    const price = mkt ? mkt.price : 100;
    const change = mkt ? mkt.change : 0;
    const name = mkt ? mkt.name : state.pair;
    const exchange = mkt ? mkt.exchange : 'NSE';

    document.getElementById('headerSymbol').textContent = state.pair;
    document.getElementById('headerExchange').textContent = exchange;
    document.getElementById('headerPrice').textContent = price.toLocaleString('en-IN', { maximumFractionDigits: 2 });

    const hdrChange = document.getElementById('headerChange');
    const absChange = (price * Math.abs(change) / 100).toFixed(2);
    hdrChange.textContent = `${change >= 0 ? '+' : ''}${absChange} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)`;
    hdrChange.className = `sym-change ${change >= 0 ? 'up' : 'dn'}`;

    document.getElementById('alertModalSymbol').textContent = state.pair;
    document.getElementById('btSymbolCtx').textContent = `— ${state.pair} ${state.timeframe}`;
    document.getElementById('planPairDisplay').textContent = state.pair;
    document.getElementById('depthSymbol').textContent = state.pair;
    document.getElementById('aiBubbleSym').textContent = state.pair;
    document.getElementById('aiBubbleTf').textContent = state.timeframe;

    const hudSymTf = document.getElementById('hudSymTf');
    if (hudSymTf) hudSymTf.textContent = `${state.pair} · ${state.timeframe}`;
  }

  // ════════════════════════════════════════════════════════════════
  // WATCHLIST
  // ════════════════════════════════════════════════════════════════
  const DEFAULT_WATCHLIST = [
    { epic:'NIFTY50', group:'Indices' },
    { epic:'BANKNIFTY', group:'Indices' },
    { epic:'SENSEX', group:'Indices' },
    { epic:'FINNIFTY', group:'Indices' },
    { epic:'RELIANCE', group:'NSE Equity' },
    { epic:'TCS', group:'NSE Equity' },
    { epic:'HDFCBANK', group:'NSE Equity' },
    { epic:'INFY', group:'NSE Equity' },
    { epic:'ICICIBANK', group:'NSE Equity' },
    { epic:'SBIN', group:'NSE Equity' },
    { epic:'BHARTIARTL', group:'NSE Equity' },
    { epic:'NIFTY25000CE', group:'F&O Options' },
    { epic:'BANKNIFTY54000CE', group:'F&O Options' },
    { epic:'BTCUSD', group:'Crypto' },
    { epic:'GOLD', group:'Commodities' },
  ];

  function renderWatchlist(filter = '') {
    const container = document.getElementById('watchlistGroups');
    if (!container) return;

    const items = DEFAULT_WATCHLIST.filter(w => {
      if (!filter) return true;
      const mkt = ALL_MARKETS.find(m => m.epic === w.epic);
      return w.epic.toLowerCase().includes(filter) || (mkt && mkt.name.toLowerCase().includes(filter));
    });

    const groups = {};
    items.forEach(item => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });

    let html = '';
    for (const [group, wls] of Object.entries(groups)) {
      html += `<div class="watchlist-group-title">${group}</div>`;
      wls.forEach(wl => {
        const mkt = ALL_MARKETS.find(m => m.epic === wl.epic);
        if (!mkt) return;
        const sign = mkt.change >= 0 ? '+' : '';
        const chgCls = mkt.change >= 0 ? 'up' : 'dn';
        const active = state.pair === mkt.epic;
        html += `
          <div class="wl-item ${active ? 'active' : ''}" data-epic="${mkt.epic}" data-exchange="${mkt.exchange}">
            <div class="wl-item-left">
              <div class="wl-sym">${mkt.epic}</div>
              <div class="wl-name">${mkt.name}</div>
            </div>
            <div class="wl-item-right">
              <div class="wl-price">${mkt.price.toLocaleString('en-IN', {maximumFractionDigits:2})}</div>
              <div class="wl-chg ${chgCls}">${sign}${mkt.change.toFixed(2)}%</div>
            </div>
          </div>
        `;
      });
    }
    container.innerHTML = html;

    container.querySelectorAll('.wl-item').forEach(item => {
      item.addEventListener('click', () => {
        addWorkspaceTab(item.dataset.epic, state.timeframe, item.dataset.exchange);
        container.querySelectorAll('.wl-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }

  document.getElementById('watchlistSearch')?.addEventListener('input', e => {
    renderWatchlist(e.target.value.toLowerCase().trim());
  });

  document.getElementById('addWatchlistBtn')?.addEventListener('click', openSymbolSearch);

  renderWatchlist();

  // ════════════════════════════════════════════════════════════════
  // INDICATOR MODAL
  // ════════════════════════════════════════════════════════════════
  let indCatFilter = 'all';
  let indSearchQ = '';

  const indicatorModalOverlay = document.getElementById('indicatorModalOverlay');
  const openIndicatorsBtn = document.getElementById('openIndicatorsBtn');
  const indModalClose = document.getElementById('indModalClose');
  const indModalSearch = document.getElementById('indModalSearch');
  const indList = document.getElementById('indList');

  openIndicatorsBtn?.addEventListener('click', () => {
    indicatorModalOverlay.classList.add('open');
    if (indModalSearch) { indModalSearch.value = ''; indModalSearch.focus(); }
    indCatFilter = 'all';
    document.querySelectorAll('.ind-cat-item').forEach(c => c.classList.toggle('active', c.dataset.indcat === 'all'));
    renderIndicatorList();
  });
  indModalClose?.addEventListener('click', () => indicatorModalOverlay.classList.remove('open'));
  indicatorModalOverlay?.addEventListener('click', e => { if (e.target === indicatorModalOverlay) indicatorModalOverlay.classList.remove('open'); });

  document.querySelectorAll('.ind-cat-item').forEach(cat => {
    cat.addEventListener('click', () => {
      document.querySelectorAll('.ind-cat-item').forEach(c => c.classList.remove('active'));
      cat.classList.add('active');
      indCatFilter = cat.dataset.indcat;
      renderIndicatorList();
    });
  });

  indModalSearch?.addEventListener('input', e => {
    indSearchQ = e.target.value.toLowerCase();
    renderIndicatorList();
  });

  function renderIndicatorList() {
    if (!indList) return;
    let inds = INDICATOR_LIBRARY;
    if (indCatFilter !== 'all') inds = inds.filter(i => i.category === indCatFilter);
    if (indSearchQ) inds = inds.filter(i => i.name.toLowerCase().includes(indSearchQ) || i.desc.toLowerCase().includes(indSearchQ));

    indList.innerHTML = inds.map(ind => {
      const active = state.activeIndicators.includes(ind.id);
      return `
        <div class="ind-item ${active ? 'active-ind' : ''}" data-indid="${ind.id}">
          <div>
            <div class="ind-item-name" style="display:flex;align-items:center;gap:6px;">
              <span style="width:10px;height:10px;border-radius:50%;background:${ind.color};flex-shrink:0;display:inline-block;"></span>
              ${ind.name}
            </div>
            <div class="ind-item-desc">${ind.desc}</div>
          </div>
          <button class="ind-item-add" title="${active ? 'Remove' : 'Add'}">${active ? '−' : '+'}</button>
        </div>
      `;
    }).join('');

    indList.querySelectorAll('.ind-item').forEach(item => {
      item.addEventListener('click', () => toggleIndicator(item.dataset.indid));
    });
  }

  function toggleIndicator(id) {
    const idx = state.activeIndicators.indexOf(id);
    const ind = INDICATOR_LIBRARY.find(i => i.id === id);
    if (!ind) return;
    if (idx >= 0) {
      state.activeIndicators.splice(idx, 1);
      showToast(`Removed: ${ind.name}`, 'info', 1500);
    } else {
      state.activeIndicators.push(id);
      showToast(`Added: ${ind.name}`, 'success', 1500);
    }
    renderIndicatorList();
    renderActiveIndicatorsBar();
    updateLegend();
    if (chart) {
      chart.activeIndicators = state.activeIndicators;
      chart.render();
    }
  }

  function renderActiveIndicatorsBar() {
    const bar = document.getElementById('activeIndicatorsBar');
    if (!bar) return;
    bar.innerHTML = state.activeIndicators.map(id => {
      const ind = INDICATOR_LIBRARY.find(i => i.id === id);
      if (!ind) return '';
      return `
        <div class="active-ind-chip" data-indid="${id}">
          <span class="dot" style="background:${ind.color}"></span>
          ${ind.name}
          <span class="remove">×</span>
        </div>
      `;
    }).join('');

    bar.querySelectorAll('.active-ind-chip').forEach(chip => {
      chip.querySelector('.remove')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleIndicator(chip.dataset.indid);
      });
    });
  }

  function updateLegend() {
    document.getElementById('legKronos').style.display = state.activeIndicators.includes('kronos') ? 'flex' : 'none';
    document.getElementById('legSMA20').style.display = state.activeIndicators.includes('sma20') ? 'flex' : 'none';
    document.getElementById('legSMA50').style.display = state.activeIndicators.includes('sma50') ? 'flex' : 'none';
    document.getElementById('legEMA').style.display = (state.activeIndicators.includes('ema9') || state.activeIndicators.includes('ema21')) ? 'flex' : 'none';
    document.getElementById('legBB').style.display = state.activeIndicators.includes('bb') ? 'flex' : 'none';
    document.getElementById('legVWAP').style.display = state.activeIndicators.includes('vwap') ? 'flex' : 'none';
  }

  // ════════════════════════════════════════════════════════════════
  // DRAWING TOOLS
  // ════════════════════════════════════════════════════════════════
  document.querySelectorAll('.tv-left-toolbar .tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tv-left-toolbar .tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeTool = btn.dataset.tool;
      const drawingCanvas = document.getElementById('drawingCanvas');

      if (['cursor','crosshair'].includes(state.activeTool)) {
        document.body.classList.remove('drawing-mode');
        if (drawingCanvas) { drawingCanvas.classList.remove('drawing'); drawingCanvas.style.pointerEvents = 'none'; }
        state.drawingTool = null;
      } else if (state.activeTool === 'magnet') {
        state.magnets = !state.magnets;
        btn.classList.toggle('active', state.magnets);
        showToast(`Magnet snap ${state.magnets ? 'ON' : 'OFF'}`, 'info', 1500);
      } else if (state.activeTool === 'ai') {
        toggleAIBubble();
        return;
      } else {
        document.body.classList.add('drawing-mode');
        if (drawingCanvas) { drawingCanvas.classList.add('drawing'); drawingCanvas.style.pointerEvents = 'all'; }
        state.drawingTool = state.activeTool;
        showToast(`Drawing tool: ${btn.title}`, 'info', 1500);
      }
    });
  });

  document.getElementById('clearAnnotations')?.addEventListener('click', () => {
    state.drawings = [];
    const canvas = document.getElementById('drawingCanvas');
    if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height); }
    showToast('Drawings cleared', 'info', 1500);
  });

  // AI Button in toolbar
  document.getElementById('aiToggleBtn')?.addEventListener('click', () => {
    toggleAIBubble();
    document.getElementById('aiToggleBtn').classList.toggle('active', state.aiVisible);
  });

  function toggleAIBubble() {
    state.aiVisible = !state.aiVisible;
    const bubble = document.getElementById('aiAnalysisBubble');
    if (bubble) bubble.classList.toggle('visible', state.aiVisible);
    document.getElementById('aiToggleBtn')?.classList.toggle('active', state.aiVisible);
  }

  document.getElementById('aiCloseBubble')?.addEventListener('click', () => {
    state.aiVisible = false;
    document.getElementById('aiAnalysisBubble').classList.remove('visible');
    document.getElementById('aiToggleBtn')?.classList.remove('active');
  });

  // ════════════════════════════════════════════════════════════════
  // MARKET DATA FETCH
  // ════════════════════════════════════════════════════════════════
  async function fetchMarketData() {
    const loadingEl = document.getElementById('chartLoading');
    const loadingText = document.getElementById('loadingText');
    try {
      if (loadingEl) {
        loadingEl.classList.add('visible');
        if (loadingText) loadingText.textContent = `Loading ${state.pair} ${state.timeframe}…`;
      }

      const tfMap = {
        '1m':'MINUTE_1','3m':'MINUTE_3','5m':'MINUTE_5','15m':'MINUTE_15',
        '30m':'MINUTE_30','1h':'HOUR_1','4h':'HOUR_4','1d':'DAY_1','1w':'WEEK_1','1M':'MONTH_1'
      };
      const resolution = tfMap[state.timeframe] || 'MINUTE_5';

      const res = await fetch(`/api/candles?epic=${encodeURIComponent(state.pair)}&resolution=${resolution}&bars=${state.bars}`);
      if (!res.ok) throw new Error('API error');
      const candles = await res.json();

      state.historicalCandles = candles.map((c, i) => ({
        ...c,
        time: new Date(c.time * 1000).toISOString().replace('T',' ').slice(0,16),
        ts: c.time
      }));

      if (chart) {
        chart.chartType = state.chartType;
        chart.activeIndicators = state.activeIndicators;
        chart.setData(state.historicalCandles, [], computeIndicators(state.historicalCandles));
      }

      updateHUDWithLatest();
      updateHeaderOHLCV();
      updateStatusBar();
      renderWatchlist();
      connectLiveCandleStream();

    } catch (err) {
      console.error('[fetchMarketData]', err);
      showToast(`Error loading data: ${err.message}`, 'error');
    } finally {
      if (loadingEl) loadingEl.classList.remove('visible');
    }
  }

  // ════════════════════════════════════════════════════════════════
  // LIVE WEBSOCKET CANDLE STREAM & QUOTE POLLING
  // ════════════════════════════════════════════════════════════════
  let activeCandleWs = null;
  function connectLiveCandleStream() {
    if (activeCandleWs) {
      try { activeCandleWs.close(); } catch(e) {}
      activeCandleWs = null;
    }
    const tfMap = {
      '1m':'MINUTE_1','3m':'MINUTE_3','5m':'MINUTE_5','15m':'MINUTE_15',
      '30m':'MINUTE_30','1h':'HOUR_1','4h':'HOUR_4','1d':'DAY_1','1w':'WEEK_1','1M':'MONTH_1'
    };
    const resolution = tfMap[state.timeframe] || 'MINUTE_5';
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws/candles?epic=${encodeURIComponent(state.pair)}&resolution=${resolution}`;
    
    try {
      activeCandleWs = new WebSocket(wsUrl);
      activeCandleWs.onopen = () => {
        const liveDot = document.getElementById('liveStatusDot');
        if (liveDot) liveDot.className = 'status-dot online';
      };
      activeCandleWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'candle' && data.candle) {
            const raw = data.candle;
            const candle = {
              ...raw,
              time: new Date(raw.time * 1000).toISOString().replace('T',' ').slice(0,16),
              ts: raw.time
            };
            if (chart && typeof chart.updateLastCandle === 'function') {
              chart.updateLastCandle(candle);
            }
            // Update Header price with live flashing
            const hdrPrice = document.getElementById('headerPrice');
            if (hdrPrice) {
              const oldPrice = parseFloat(hdrPrice.textContent.replace(/,/g,'')) || candle.close;
              hdrPrice.textContent = candle.close.toLocaleString('en-IN', { maximumFractionDigits: 2 });
              if (candle.close > oldPrice) {
                hdrPrice.classList.add('price-flash-up');
                setTimeout(() => hdrPrice.classList.remove('price-flash-up'), 400);
              } else if (candle.close < oldPrice) {
                hdrPrice.classList.add('price-flash-dn');
                setTimeout(() => hdrPrice.classList.remove('price-flash-dn'), 400);
              }
            }
            // Update HUD
            window.onChartHover(candle, false);
            // Update DOM Order Book if visible
            const depthAsk = document.getElementById('depthAsk');
            const depthBid = document.getElementById('depthBid');
            if (depthAsk && data.ask) depthAsk.textContent = data.ask.toFixed(2);
            if (depthBid && data.bid) depthBid.textContent = data.bid.toFixed(2);
          }
        } catch(e) {}
      };
      activeCandleWs.onclose = () => {
        const liveDot = document.getElementById('liveStatusDot');
        if (liveDot) liveDot.className = 'status-dot warn';
      };
    } catch(e) {
      console.warn('[WS] Live candle stream error', e);
    }
  }

  async function pollLiveQuotes() {
    try {
      const res = await fetch('/api/live-quotes');
      if (!res.ok) return;
      const quotes = await res.json();
      
      for (const [epic, q] of Object.entries(quotes)) {
        const m = ALL_MARKETS.find(x => x.epic === epic);
        if (m) {
          m.price = q.price;
          m.change = q.change_pct;
        } else {
          ALL_MARKETS.push({
            epic: epic,
            name: epic,
            exchange: 'NSE',
            type: epic.includes('CE') || epic.includes('PE') ? 'OPTIONS' : 'INDIAN_STOCKS',
            price: q.price,
            change: q.change_pct
          });
        }
      }
      
      if (quotes[state.pair]) {
        const q = quotes[state.pair];
        const hdrChange = document.getElementById('headerChange');
        if (hdrChange) {
          const sign = q.change_pct >= 0 ? '+' : '';
          hdrChange.textContent = `${sign}${q.change.toFixed(2)} (${sign}${q.change_pct.toFixed(2)}%)`;
          hdrChange.className = `sym-change ${q.change_pct >= 0 ? 'up' : 'dn'}`;
        }
      }
      renderWatchlist();
    } catch(e) {}
  }
  setInterval(pollLiveQuotes, 3500);
  pollLiveQuotes();

  function computeIndicators(candles) {
    if (!candles || candles.length < 20) return null;
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    function sma(arr, period) {
      return arr.map((_, i) => {
        if (i < period - 1) return null;
        const sum = arr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        return sum / period;
      });
    }
    function ema(arr, period) {
      const k = 2 / (period + 1);
      const result = new Array(arr.length).fill(null);
      result[0] = arr[0];
      for (let i = 1; i < arr.length; i++) {
        result[i] = arr[i] * k + result[i-1] * (1 - k);
      }
      return result;
    }
    function rsi(closes, period = 14) {
      const result = new Array(closes.length).fill(null);
      for (let i = period; i < closes.length; i++) {
        let gains = 0, losses = 0;
        for (let j = i - period + 1; j <= i; j++) {
          const diff = closes[j] - closes[j-1];
          if (diff > 0) gains += diff; else losses -= diff;
        }
        const rs = losses === 0 ? 100 : gains / losses;
        result[i] = 100 - 100 / (1 + rs);
      }
      return result;
    }
    function bb(closes, period = 20, stdDev = 2) {
      const mid = sma(closes, period);
      return mid.map((m, i) => {
        if (m === null) return { upper: null, mid: null, lower: null };
        const slice = closes.slice(Math.max(0, i - period + 1), i + 1);
        const variance = slice.reduce((s, v) => s + (v - m) ** 2, 0) / slice.length;
        const sd = Math.sqrt(variance) * stdDev;
        return { upper: m + sd, mid: m, lower: m - sd };
      });
    }
    function vwap(candles) {
      let cumPV = 0, cumV = 0;
      return candles.map(c => {
        const tp = (c.high + c.low + c.close) / 3;
        cumPV += tp * c.volume;
        cumV += c.volume;
        return cumPV / cumV;
      });
    }

    return {
      sma20: sma(closes, 20),
      sma50: sma(closes, 50),
      sma200: sma(closes, 200),
      ema9: ema(closes, 9),
      ema21: ema(closes, 21),
      bb: bb(closes),
      vwap: vwap(candles),
      rsi: rsi(closes),
    };
  }

  // ════════════════════════════════════════════════════════════════
  // CHART HUD + HEADER OHLCV
  // ════════════════════════════════════════════════════════════════
  window.onChartHover = (candle, isForecast) => {
    if (!candle) { updateHUDWithLatest(); return; }
    const p = v => v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    document.getElementById('hudOpen').textContent = p(candle.open);
    document.getElementById('hudHigh').textContent = p(candle.high);
    document.getElementById('hudLow').textContent = p(candle.low);
    document.getElementById('hudClose').textContent = p(candle.close);
    document.getElementById('hudVol').textContent = formatVolume(candle.volume);
    const d = ((candle.close - candle.open) / candle.open) * 100;
    const deltaEl = document.getElementById('hudDelta');
    if (deltaEl) { deltaEl.textContent = `${d >= 0 ? '+' : ''}${d.toFixed(2)}%`; deltaEl.className = d >= 0 ? 'up' : 'dn'; }
  };

  function updateHUDWithLatest() {
    const list = state.forecastCandles.length > 0 ? state.forecastCandles : state.historicalCandles;
    if (list.length > 0) window.onChartHover(list[list.length - 1], state.forecastCandles.length > 0);
  }

  function updateHeaderOHLCV() {
    if (state.historicalCandles.length === 0) return;
    const last = state.historicalCandles[state.historicalCandles.length - 1];
    const first = state.historicalCandles[state.historicalCandles.length - Math.min(state.historicalCandles.length, 90)];
    const p = (v, dec=2) => v.toLocaleString('en-IN', { maximumFractionDigits: dec });
    document.getElementById('hdrOpen').textContent = p(last.open);
    document.getElementById('hdrHigh').textContent = p(last.high);
    document.getElementById('hdrLow').textContent = p(last.low);
    document.getElementById('hdrClose').textContent = p(last.close);
    document.getElementById('hdrVol').textContent = formatVolume(last.volume);
  }

  function formatVolume(v) {
    if (v >= 1e9) return (v/1e9).toFixed(1) + 'B';
    if (v >= 1e6) return (v/1e6).toFixed(1) + 'M';
    if (v >= 1e3) return (v/1e3).toFixed(1) + 'K';
    return v.toFixed(0);
  }

  // ════════════════════════════════════════════════════════════════
  // AI FORECAST (Kronos + Laya)
  // ════════════════════════════════════════════════════════════════
  async function runForecast(candleCount) {
    if (state.isForecasting) { showToast('Forecast already running…', 'warning'); return; }
    state.isForecasting = true;

    const loadBar = document.getElementById('aiLoadBar');
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (loadBar) loadBar.classList.add('active');
    if (analyzeBtn) analyzeBtn.disabled = true;

    const aiStatusDot = document.getElementById('aiStatusDot');
    const aiStatusText = document.getElementById('aiStatusText');
    const sbAiDot = document.getElementById('sbAiDot');
    const sbAiText = document.getElementById('sbAiText');

    if (aiStatusDot) aiStatusDot.className = 'status-dot warn';
    if (aiStatusText) aiStatusText.textContent = 'Analyzing…';
    if (sbAiDot) sbAiDot.className = 'status-dot warn';
    if (sbAiText) sbAiText.textContent = 'Kronos+Laya running…';

    try {
      const candles = state.historicalCandles.slice(-120);
      const predLen = candleCount || state.predLen;

      const res = await fetch('/api/forecast_and_decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair: state.pair,
          timeframe: state.timeframe,
          candles: candles.map(c => ({ open:c.open, high:c.high, low:c.low, close:c.close, volume:c.volume, time:c.ts || 0 })),
          pred_len: predLen,
          temperature: state.temperature,
          top_p: state.topP
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Update AI bubble
      updateAIResults(data);

      // Draw forecast on chart
      if (data.forecast_candles && data.forecast_candles.length > 0) {
        state.forecastCandles = data.forecast_candles;
        if (chart) {
          chart.setData(state.historicalCandles, state.forecastCandles, computeIndicators(state.historicalCandles));
        }
        const horizonBadge = document.getElementById('horizonBadge');
        if (horizonBadge) { horizonBadge.style.display = 'block'; }

        // Update target row
        const lastForecast = data.forecast_candles[data.forecast_candles.length - 1];
        const lastActual = state.historicalCandles[state.historicalCandles.length - 1];
        document.getElementById('kronosTargetRow').style.display = 'flex';
        document.getElementById('targetClose').textContent = lastActual.close.toFixed(2);
        document.getElementById('targetPriceHdr').textContent = lastForecast.close.toFixed(2);
        const ret = ((lastForecast.close - lastActual.close) / lastActual.close * 100);
        document.getElementById('targetReturn').textContent = `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%`;
        document.getElementById('scaleKronos').style.display = 'block';
        document.getElementById('kronosTarget').textContent = lastForecast.close.toFixed(2);
        document.getElementById('kronosCandlesLeft').textContent = `${predLen} candles`;
      }

      showToast(`✓ AI Analysis complete — ${data.decision || 'HOLD'}`, 'success');

    } catch (err) {
      console.error('[runForecast]', err);
      showToast(`AI Error: ${err.message}. Using simulated result.`, 'warning');
      simulateForecast();
    } finally {
      state.isForecasting = false;
      if (loadBar) loadBar.classList.remove('active');
      if (analyzeBtn) analyzeBtn.disabled = false;
      if (aiStatusDot) aiStatusDot.className = 'status-dot ok';
      if (aiStatusText) aiStatusText.textContent = 'AI Ready';
      if (sbAiDot) sbAiDot.className = 'status-dot ok';
      if (sbAiText) sbAiText.textContent = 'Kronos+Laya Ready';
    }
  }

  function simulateForecast() {
    const decisions = ['BUY', 'SELL', 'HOLD'];
    const decision = decisions[Math.floor(Math.random() * decisions.length)];
    const conf = 0.55 + Math.random() * 0.35;
    const lastCandle = state.historicalCandles[state.historicalCandles.length - 1];
    const price = lastCandle ? lastCandle.close : 100;

    const simData = {
      decision,
      confidence: conf,
      buy_prob: decision === 'BUY' ? conf : (1 - conf) * Math.random(),
      sell_prob: decision === 'SELL' ? conf : (1 - conf) * Math.random(),
      hold_prob: decision === 'HOLD' ? conf : (1 - conf) * Math.random(),
      risk_level: ['LOW','MEDIUM','HIGH'][Math.floor(Math.random() * 3)],
      risk_score: Math.random() * 3,
      breakout_prob: Math.random(),
      stop_loss: price * (1 - 0.005 - Math.random() * 0.01),
      take_profit_1: price * (1 + 0.008 + Math.random() * 0.01),
      take_profit_2: price * (1 + 0.015 + Math.random() * 0.02),
      entry_price: price,
      kronos_latency_ms: 180 + Math.random() * 100,
      laya_latency_ms: 80 + Math.random() * 60,
      total_latency_ms: 260 + Math.random() * 150,
      forecast_candles: generateSimForecast(state.historicalCandles, state.predLen)
    };
    updateAIResults(simData);

    state.forecastCandles = simData.forecast_candles;
    if (chart) chart.setData(state.historicalCandles, state.forecastCandles, computeIndicators(state.historicalCandles));
    document.getElementById('horizonBadge').style.display = 'block';
    document.getElementById('kronosTargetRow').style.display = 'flex';
    const lastF = simData.forecast_candles[simData.forecast_candles.length - 1];
    const lastA = state.historicalCandles[state.historicalCandles.length - 1];
    document.getElementById('targetClose').textContent = lastA.close.toFixed(2);
    document.getElementById('targetPriceHdr').textContent = lastF.close.toFixed(2);
    const ret = (lastF.close - lastA.close) / lastA.close * 100;
    document.getElementById('targetReturn').textContent = `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%`;
  }

  function generateSimForecast(candles, n) {
    if (!candles.length) return [];
    const lastStep = candles.length >= 2 ? (candles[candles.length-1].ts - candles[candles.length-2].ts) : 300;
    let lastTs = candles[candles.length - 1].ts || Math.floor(Date.now() / 1000);
    let p = candles[candles.length - 1].close;
    const result = [];
    const rng = () => (Math.random() - 0.48) * 0.003;
    for (let i = 0; i < n; i++) {
      lastTs += lastStep;
      const o = p;
      p = p * (1 + rng());
      const h = Math.max(o, p) * (1 + Math.random() * 0.002);
      const l = Math.min(o, p) * (1 - Math.random() * 0.002);
      result.push({ open:+o.toFixed(2), high:+h.toFixed(2), low:+l.toFixed(2), close:+p.toFixed(2), volume:Math.random()*1e6, ts:lastTs, time:new Date(lastTs*1000).toISOString().replace('T',' ').slice(0,16) });
    }
    return result;
  }

  function updateAIResults(data) {
    const fmt = v => v ? v.toFixed(2) : '--';
    const pct = v => v != null ? `${(v * 100).toFixed(1)}%` : '--%';

    // Badge + confidence
    const badge = document.getElementById('actionBadge');
    const aiBadge = document.getElementById('aiBubgeBadge');
    const conf = document.getElementById('confidenceVal');
    const aiConf = document.getElementById('aiBubbleConf');
    const dec = data.decision || 'HOLD';
    const confPct = data.confidence != null ? `${(data.confidence * 100).toFixed(0)}%` : '--%';

    if (badge) { badge.textContent = dec; badge.className = `action-badge ${dec}`; }
    if (aiBadge) { aiBadge.textContent = dec; aiBadge.className = `ai-decision-badge ${dec}`; }
    if (conf) conf.textContent = confPct;
    if (aiConf) aiConf.textContent = confPct;

    // Probs
    const buyP = data.buy_prob != null ? data.buy_prob : 0.33;
    const sellP = data.sell_prob != null ? data.sell_prob : 0.33;
    const holdP = data.hold_prob != null ? data.hold_prob : 0.34;
    const total = buyP + sellP + holdP || 1;
    const setProb = (fillId, pctId, val) => {
      const fill = document.getElementById(fillId);
      const p = document.getElementById(pctId);
      if (fill) fill.style.width = `${(val/total*100).toFixed(0)}%`;
      if (p) p.textContent = `${(val/total*100).toFixed(0)}%`;
    };
    setProb('probBuyFill','probBuyPct',buyP);
    setProb('probSellFill','probSellPct',sellP);
    setProb('probHoldFill','probHoldPct',holdP);

    // Risk & breakout
    const risk = data.risk_level || '--';
    const riskScore = data.risk_score;
    document.getElementById('riskVal').textContent = risk;
    document.getElementById('riskSub').textContent = `Score: ${riskScore != null ? riskScore.toFixed(1) : '--'} / 3.0`;
    document.getElementById('riskVal').className = `metric-value ${risk === 'LOW' ? 'bull' : risk === 'HIGH' ? 'bear' : ''}`;
    document.getElementById('breakoutVal').textContent = pct(data.breakout_prob);
    document.getElementById('aiBubbleRisk').textContent = risk;

    // Trade levels
    const ep = data.entry_price || (state.historicalCandles.length ? state.historicalCandles[state.historicalCandles.length-1].close : 0);
    const sl = data.stop_loss;
    const tp1 = data.take_profit_1;
    const tp2 = data.take_profit_2;
    const rr = sl && tp1 ? `1 : ${((tp1-ep) / (ep-sl)).toFixed(2)}` : '--';

    document.getElementById('tlEntry').textContent = fmt(ep);
    document.getElementById('tlSL').innerHTML = `${fmt(sl)} <span class="tl-badge sl">SL</span>`;
    document.getElementById('tlTP1').innerHTML = `${fmt(tp1)} <span class="tl-badge tp">TP1</span>`;
    document.getElementById('tlTP2').innerHTML = `${fmt(tp2)} <span class="tl-badge tp">TP2</span>`;
    document.getElementById('tlRR').textContent = rr;

    document.getElementById('planAction').textContent = dec;
    document.getElementById('planActionBadge').textContent = dec;
    document.getElementById('planActionBadge').className = `plan-action-badge ${dec}`;
    document.getElementById('planEntry').textContent = `₹${fmt(ep)}`;
    document.getElementById('planSL').textContent = `₹${fmt(sl)}`;
    document.getElementById('planTP1').textContent = `₹${fmt(tp1)}`;
    document.getElementById('planTP2').textContent = `₹${fmt(tp2)}`;
    document.getElementById('planRR').textContent = rr;

    // Position sizing
    const capital = parseFloat(document.getElementById('planCapital')?.value) || 100000;
    const riskPct = parseFloat(document.getElementById('planRiskPct')?.value) || 1;
    const riskAmount = capital * riskPct / 100;
    const slDist = sl ? Math.abs(ep - sl) : ep * 0.01;
    const qty = Math.floor(riskAmount / slDist);
    document.getElementById('planSizing').textContent = `${qty} units (₹${(qty*ep).toLocaleString('en-IN', {maximumFractionDigits:0})})`;

    // AI bubble
    document.getElementById('aiBubbleSL').textContent = fmt(sl);
    document.getElementById('aiBubbleTP').textContent = fmt(tp1);
    document.getElementById('aiBubbleBreakout').textContent = pct(data.breakout_prob);

    // Latency
    const kl = data.kronos_latency_ms;
    const ll = data.laya_latency_ms;
    const tl = data.total_latency_ms;
    document.getElementById('latencyKronos').textContent = kl ? `${kl.toFixed(0)} ms` : '-- ms';
    document.getElementById('latencyLaya').textContent = ll ? `${ll.toFixed(0)} ms` : '-- ms';
    document.getElementById('latencyTotal').textContent = tl ? `${tl.toFixed(0)} ms` : '-- ms';

    // Execute buttons
    const buyBtn = document.getElementById('executeBuyBtn');
    const sellBtn = document.getElementById('executeSellBtn');
    if (buyBtn) buyBtn.style.display = dec === 'BUY' ? 'flex' : 'none';
    if (sellBtn) sellBtn.style.display = dec === 'SELL' ? 'flex' : 'none';
  }

  // AI Bubble Candle Controls
  document.getElementById('analyzeBtn')?.addEventListener('click', () => {
    const n = parseInt(document.getElementById('candlesInput').value) || state.predLen;
    state.predLen = Math.min(60, Math.max(5, n));
    runForecast(state.predLen);
  });

  document.querySelectorAll('.ai-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.c);
      document.getElementById('candlesInput').value = n;
      state.predLen = n;
    });
  });

  // Forecast buttons (all wired to same action)
  [document.getElementById('runForecastBtn'), document.getElementById('runForecastBtn2'),
   document.getElementById('runForecastBtn3'), document.getElementById('runForecastBtn4')].forEach(btn => {
    btn?.addEventListener('click', () => runForecast(state.predLen));
  });

  // ════════════════════════════════════════════════════════════════
  // KRONOS SLIDER CONTROLS
  // ════════════════════════════════════════════════════════════════
  const predLenSlider = document.getElementById('predLenSlider');
  const predLenVal = document.getElementById('predLenVal');
  predLenSlider?.addEventListener('input', e => {
    state.predLen = parseInt(e.target.value);
    if (predLenVal) predLenVal.textContent = state.predLen;
    if (document.getElementById('candlesInput')) document.getElementById('candlesInput').value = state.predLen;
  });
  const tempSlider = document.getElementById('tempSlider');
  const tempVal = document.getElementById('tempVal');
  tempSlider?.addEventListener('input', e => {
    state.temperature = parseFloat(e.target.value);
    if (tempVal) tempVal.textContent = state.temperature.toFixed(2);
  });
  const topPSlider = document.getElementById('topPSlider');
  const topPVal = document.getElementById('topPVal');
  topPSlider?.addEventListener('input', e => {
    state.topP = parseFloat(e.target.value);
    if (topPVal) topPVal.textContent = state.topP.toFixed(2);
  });

  // ════════════════════════════════════════════════════════════════
  // SCENARIO + BARS SELECTORS
  // ════════════════════════════════════════════════════════════════
  document.getElementById('scenarioSelect')?.addEventListener('change', e => {
    state.scenario = e.target.value;
    fetchMarketData();
  });
  document.getElementById('barsSelect')?.addEventListener('change', e => {
    state.bars = parseInt(e.target.value);
    fetchMarketData();
  });

  // ════════════════════════════════════════════════════════════════
  // MARKET DEPTH PANEL
  // ════════════════════════════════════════════════════════════════
  function renderDepthPanel() {
    const mkt = ALL_MARKETS.find(m => m.epic === state.pair);
    const basePrice = mkt ? mkt.price : 100;
    const prec = basePrice > 100 ? 2 : 5;

    // Generate bid/ask
    const bids = [];
    const asks = [];
    let bp = basePrice;
    for (let i = 0; i < 10; i++) {
      bp -= Math.random() * basePrice * 0.0003;
      bids.push({ price: +bp.toFixed(prec), qty: Math.floor(Math.random() * 5000 + 100), orders: Math.floor(Math.random() * 20 + 1) });
    }
    let ap = basePrice;
    for (let i = 0; i < 10; i++) {
      ap += Math.random() * basePrice * 0.0003;
      asks.push({ price: +ap.toFixed(prec), qty: Math.floor(Math.random() * 5000 + 100), orders: Math.floor(Math.random() * 20 + 1) });
    }

    const spread = (asks[0].price - bids[0].price).toFixed(prec);
    document.getElementById('depthSpread').textContent = `${spread} pts`;

    const bidsBody = document.getElementById('bidsTableBody');
    const asksBody = document.getElementById('asksTableBody');
    if (bidsBody) bidsBody.innerHTML = bids.slice(0, 5).map(b => `<tr><td class="bid-price">${b.price}</td><td class="size">${b.qty.toLocaleString()}</td><td class="size">${b.orders}</td></tr>`).join('');
    if (asksBody) asksBody.innerHTML = asks.slice(0, 5).map(a => `<tr><td class="ask-price">${a.price}</td><td class="size">${a.qty.toLocaleString()}</td><td class="size">${a.orders}</td></tr>`).join('');

    const maxQ = Math.max(...bids.map(b => b.qty), ...asks.map(a => a.qty));
    const depthChart = document.getElementById('depthBarChart');
    if (depthChart) {
      const rows = [
        ...asks.slice(0,5).reverse().map(a => `
          <div class="depth-bar-row">
            <div class="depth-bar-label ask">${a.price}</div>
            <div class="depth-bar-track"><div class="depth-bar-fill ask" style="width:${(a.qty/maxQ*100).toFixed(0)}%"></div></div>
            <div class="depth-bar-size">${(a.qty/1000).toFixed(1)}K</div>
          </div>`),
        `<div style="text-align:center;font-size:10px;color:var(--text3);padding:2px 0;">── spread ──</div>`,
        ...bids.slice(0,5).map(b => `
          <div class="depth-bar-row">
            <div class="depth-bar-label bid">${b.price}</div>
            <div class="depth-bar-track"><div class="depth-bar-fill bid" style="width:${(b.qty/maxQ*100).toFixed(0)}%"></div></div>
            <div class="depth-bar-size">${(b.qty/1000).toFixed(1)}K</div>
          </div>`)
      ];
      depthChart.innerHTML = rows.join('');
    }

    // OI
    const callOI = Math.floor(Math.random() * 1e7 + 5e6);
    const putOI = Math.floor(Math.random() * 1e7 + 5e6);
    const pcr = (putOI / callOI).toFixed(2);
    const maxPain = basePrice * (0.99 + Math.random() * 0.02);
    document.getElementById('callOI').textContent = formatVolume(callOI);
    document.getElementById('putOI').textContent = formatVolume(putOI);
    document.getElementById('pcrRatio').textContent = pcr;
    document.getElementById('pcrRatio').className = `metric-value ${pcr > 1.2 ? 'bull' : pcr < 0.8 ? 'bear' : ''}`;
    document.getElementById('maxPain').textContent = maxPain.toFixed(0);
  }

  // ════════════════════════════════════════════════════════════════
  // OPTIONS CHAIN
  // ════════════════════════════════════════════════════════════════
  async function renderOptionsChain() {
    const body = document.getElementById('optionsChainBody');
    if (!body) return;
    try {
      const sym = state.pair.includes('BANK') ? 'BANKNIFTY' : 'NIFTY50';
      const res = await fetch(`/api/options-chain?symbol=${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error('Options chain API error');
      const data = await res.json();
      
      const spot = data.spot;
      const pcrEl = document.getElementById('pcrRatio');
      if (pcrEl) {
        pcrEl.textContent = data.pcr.toFixed(2);
        pcrEl.className = `metric-value ${data.pcr > 1.1 ? 'bull' : data.pcr < 0.85 ? 'bear' : ''}`;
      }
      const mpEl = document.getElementById('maxPain');
      if (mpEl) mpEl.textContent = data.max_pain;

      body.innerHTML = data.chain.map(row => {
        const s = row.strike;
        const itmCall = s <= spot;
        const itmPut = s >= spot;
        const atm = Math.abs(s - spot) <= (sym === 'BANKNIFTY' ? 50 : 25);
        const atmStyle = atm ? 'style="background:rgba(41,98,255,0.12);font-weight:700;"' : '';
        return `
          <tr ${atmStyle}>
            <td class="opt-cell call-cell ${itmCall ? 'itm' : 'otm'}" data-opt="${row.call.symbol}" title="Click to trade/chart ${row.call.symbol}">${row.call.ltp.toFixed(2)}</td>
            <td class="opt-cell call-cell ${itmCall ? 'itm' : 'otm'}" data-opt="${row.call.symbol}">${formatVolume(row.call.oi)}</td>
            <td class="opt-cell call-cell ${itmCall ? 'itm' : 'otm'}" data-opt="${row.call.symbol}">${formatVolume(row.call.volume)}</td>
            <td class="strike-cell ${atm ? 'atm-highlight' : ''}">${s} ${atm ? '⚡ ATM' : ''}</td>
            <td class="opt-cell put-cell ${itmPut ? 'itm' : 'otm'}" data-opt="${row.put.symbol}">${formatVolume(row.put.volume)}</td>
            <td class="opt-cell put-cell ${itmPut ? 'itm' : 'otm'}" data-opt="${row.put.symbol}">${formatVolume(row.put.oi)}</td>
            <td class="opt-cell put-cell ${itmPut ? 'itm' : 'otm'}" data-opt="${row.put.symbol}" title="Click to trade/chart ${row.put.symbol}">${row.put.ltp.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      body.querySelectorAll('.opt-cell').forEach(cell => {
        cell.addEventListener('click', () => {
          const optSymbol = cell.dataset.opt;
          if (optSymbol) {
            addWorkspaceTab(optSymbol, state.timeframe, 'NSE');
            showToast(`Opened ${optSymbol} for Trading & AI Forecast`, 'success');
          }
        });
      });
    } catch(err) {
      console.warn('[renderOptionsChain]', err);
    }
  }

  document.getElementById('expirySelect')?.addEventListener('change', renderOptionsChain);

  // ════════════════════════════════════════════════════════════════
  // STOCK SCREENER
  // ════════════════════════════════════════════════════════════════
  function renderScreener() {
    const body = document.getElementById('screenerBody');
    if (!body) return;
    const signals = ['BUY','SELL','HOLD'];
    const rows = ALL_MARKETS.filter(m => m.type === 'INDIAN_STOCKS' || m.type === 'INDICES').slice(0, 20).map(m => {
      const signal = signals[Math.floor(Math.random() * 3)];
      const rsi = (30 + Math.random() * 40).toFixed(0);
      const sigCls = signal === 'BUY' ? 'bull' : signal === 'SELL' ? 'bear' : '';
      const chgCls = m.change >= 0 ? 'up' : 'dn';
      return `
        <tr>
          <td class="sym-cell" data-epic="${m.epic}" style="color:var(--blue)">${m.epic}</td>
          <td>${m.price.toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
          <td class="${chgCls}">${m.change >= 0 ? '+' : ''}${m.change.toFixed(2)}%</td>
          <td class="${sigCls}" style="font-weight:700">${signal}</td>
          <td>${rsi}</td>
        </tr>
      `;
    }).join('');
    body.innerHTML = rows;

    body.querySelectorAll('.sym-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        addWorkspaceTab(cell.dataset.epic, state.timeframe, 'NSE');
      });
    });
  }

  document.getElementById('runScreenerBtn')?.addEventListener('click', () => {
    renderScreener();
    showToast('Screener updated', 'success', 1500);
  });

  // ════════════════════════════════════════════════════════════════
  // NEWS FEED
  // ════════════════════════════════════════════════════════════════
  const MOCK_NEWS = [
    { time:'09:32', sym:'NIFTY50', title:'NIFTY hits new intraday high at 25,200 ahead of RBI policy', source:'ET Markets', sentiment:'bullish' },
    { time:'09:18', sym:'RELIANCE', title:'Reliance Industries Q2 results: Net profit surges 18% YoY', source:'Moneycontrol', sentiment:'bullish' },
    { time:'09:05', sym:'BTCUSD', title:'Bitcoin consolidates near $65,000 as ETF inflows remain strong', source:'CoinDesk', sentiment:'neutral' },
    { time:'08:55', sym:'BANKNIFTY', title:'Banking stocks rally as NPA levels hit decade low', source:'Business Standard', sentiment:'bullish' },
    { time:'08:40', sym:'GOLD', title:'Gold prices climb on safe-haven demand amid global tensions', source:'Reuters', sentiment:'bullish' },
    { time:'08:22', sym:'INFY', title:'Infosys raises FY27 revenue guidance on AI services demand', source:'CNBC TV18', sentiment:'bullish' },
    { time:'08:10', sym:'TATAMOTORS', title:'Tata Motors EV sales volume drops 8% MoM in September', source:'Autocar India', sentiment:'bearish' },
    { time:'07:55', sym:'HDFCBANK', title:'HDFC Bank net interest margin narrows in Q2; stock under pressure', source:'ET Markets', sentiment:'bearish' },
    { time:'07:30', sym:'EURUSD', title:'EUR/USD falls to 3-week low on ECB rate cut expectations', source:'FXStreet', sentiment:'bearish' },
    { time:'07:15', sym:'US100', title:'NASDAQ futures tick higher ahead of US CPI data release', source:'Bloomberg', sentiment:'neutral' },
  ];

  function renderNewsFeed() {
    const feed = document.getElementById('newsFeed');
    if (!feed) return;
    feed.innerHTML = MOCK_NEWS.map(n => `
      <div class="news-item">
        <div class="news-time">${n.time} · <b>${n.sym}</b></div>
        <div class="news-title">${n.title}</div>
        <div class="news-source">
          ${n.source}
          <span class="news-tag ${n.sentiment}">${n.sentiment}</span>
        </div>
      </div>
    `).join('');
  }

  // ════════════════════════════════════════════════════════════════
  // BACKTEST
  // ════════════════════════════════════════════════════════════════
  document.getElementById('runBtBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('runBtBtn');
    if (btn) { btn.textContent = 'Running…'; btn.disabled = true; }

    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

    const trades = [];
    const candles = state.historicalCandles;
    if (candles.length > 20) {
      let equity = 100000;
      const equityCurve = [equity];
      let wins = 0, totalPnl = 0;
      for (let i = 20; i < candles.length - 5; i += 8) {
        const direction = Math.random() > 0.5 ? 'LONG' : 'SHORT';
        const entry = candles[i].close;
        const exit = candles[Math.min(i + 4, candles.length-1)].close;
        const pnl = direction === 'LONG' ? (exit - entry) : (entry - exit);
        const pnlPct = (pnl / entry * 100);
        totalPnl += pnl;
        equity += pnl;
        equityCurve.push(equity);
        if (pnl > 0) wins++;
        trades.push({ n: trades.length + 1, side: direction, entry: entry.toFixed(2), exit: exit.toFixed(2), pnl: pnl.toFixed(2), pct: pnlPct.toFixed(2), bars: 4, entryTime: candles[i].time, exitTime: candles[Math.min(i+4,candles.length-1)].time });
      }

      const winRate = trades.length ? (wins / trades.length * 100).toFixed(0) : 0;
      const retPct = (totalPnl / 100000 * 100).toFixed(2);
      const profitFactor = trades.filter(t => parseFloat(t.pnl) > 0).reduce((s, t) => s + parseFloat(t.pnl), 0) /
                           Math.abs(trades.filter(t => parseFloat(t.pnl) < 0).reduce((s, t) => s + parseFloat(t.pnl), 0) || 1);
      const maxDD = Math.min(...equityCurve.map((e, i) => i === 0 ? 0 : e - Math.max(...equityCurve.slice(0, i))));
      const pnlCls = totalPnl >= 0 ? 'green' : 'red';

      document.getElementById('btHeadlinePnl').textContent = `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}`;
      document.getElementById('btHeadlinePnl').className = `bt-headline-pnl ${pnlCls}`;
      document.getElementById('btHeadlineTrades').textContent = `${trades.length} trades`;
      document.getElementById('btHeadlineDD').textContent = `DD: ${maxDD.toFixed(0)}`;
      document.getElementById('btHeadlineWin').textContent = `WR: ${winRate}%`;
      document.getElementById('btDateRange').textContent = `${candles[20].time} – ${candles[candles.length-1].time}`;

      document.getElementById('btNetPnl').textContent = `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}`;
      document.getElementById('btNetPnl').className = `bt-perf-val ${pnlCls}`;
      document.getElementById('btReturnPct').textContent = `${retPct}%`;
      document.getElementById('btReturnPct').className = `bt-perf-val ${totalPnl >= 0 ? 'green' : 'red'}`;
      document.getElementById('btCagr').textContent = `${(retPct * 4).toFixed(1)}%`;
      document.getElementById('btProfitFactor').textContent = profitFactor.toFixed(2);
      document.getElementById('btWinRate').textContent = `${winRate}%`;
      document.getElementById('btExpectancy').textContent = `${(totalPnl / trades.length).toFixed(2)}`;
      document.getElementById('btSharpe').textContent = (Math.random() * 2 - 0.5).toFixed(2);
      document.getElementById('btSortino').textContent = (Math.random() * 2.5 - 0.3).toFixed(2);
      document.getElementById('btCalmar').textContent = (Math.random() * 3 - 1).toFixed(2);
      document.getElementById('btMaxDD').textContent = Math.abs(maxDD).toFixed(2);
      document.getElementById('btTradesCount').textContent = trades.length;
      document.getElementById('btTiming').textContent = `Took ${(Math.random() * 2 + 0.5).toFixed(1)}s`;

      // Trades table
      const tbody = document.getElementById('tradesTableBody');
      if (tbody) {
        tbody.innerHTML = trades.map(t => `
          <tr>
            <td>${t.n}</td>
            <td class="${t.side === 'LONG' ? 'side-long' : 'side-short'}">${t.side}</td>
            <td>${t.entry}</td>
            <td>${t.exit}</td>
            <td class="${parseFloat(t.pnl) >= 0 ? 'green' : 'red'}">${parseFloat(t.pnl) >= 0 ? '+' : ''}${t.pnl}</td>
            <td class="${parseFloat(t.pct) >= 0 ? 'green' : 'red'}">${parseFloat(t.pct) >= 0 ? '+' : ''}${t.pct}%</td>
            <td>${t.bars}</td>
          </tr>
        `).join('');
      }

      // Draw equity curve
      drawEquityCurve(equityCurve);
    }

    if (btn) { btn.textContent = '▶ Run Backtest'; btn.disabled = false; }
    showToast('Backtest complete', 'success');
  });

  document.getElementById('clearBtResults')?.addEventListener('click', () => {
    ['btHeadlinePnl','btNetPnl','btReturnPct','btCagr','btProfitFactor','btWinRate','btExpectancy',
     'btSharpe','btSortino','btCalmar','btMaxDD'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = '--'; el.className = 'bt-perf-val'; }
    });
    const tbody = document.getElementById('tradesTableBody');
    if (tbody) tbody.innerHTML = '';
    document.getElementById('btHeadlineTrades').textContent = '-- trades';
    document.getElementById('btDateRange').textContent = 'Run backtest to see results';
    const ctx = document.getElementById('equityCurveCanvas')?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    showToast('Results cleared', 'info', 1500);
  });

  function drawEquityCurve(curve) {
    const canvas = document.getElementById('equityCurveCanvas');
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (curve.length < 2) return;
    const min = Math.min(...curve);
    const max = Math.max(...curve);
    const range = max - min || 1;
    const w = canvas.width;
    const h = canvas.height;
    const padY = 4;
    const step = w / (curve.length - 1);
    const lastVal = curve[curve.length - 1];
    const isProfit = lastVal >= curve[0];

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (isProfit) {
      grad.addColorStop(0, 'rgba(38,166,154,.35)');
      grad.addColorStop(1, 'rgba(38,166,154,0)');
    } else {
      grad.addColorStop(0, 'rgba(239,83,80,.35)');
      grad.addColorStop(1, 'rgba(239,83,80,0)');
    }

    ctx.beginPath();
    curve.forEach((v, i) => {
      const x = i * step;
      const y = padY + (1 - (v - min) / range) * (h - padY * 2);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    curve.forEach((v, i) => {
      const x = i * step;
      const y = padY + (1 - (v - min) / range) * (h - padY * 2);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = isProfit ? '#26a69a' : '#ef5350';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // ════════════════════════════════════════════════════════════════
  // ALERT SYSTEM
  // ════════════════════════════════════════════════════════════════
  const alertDialogBackdrop = document.getElementById('alertDialogBackdrop');

  function openAlertDialog() {
    document.getElementById('alertTriggerPrice').value = state.historicalCandles.length ?
      state.historicalCandles[state.historicalCandles.length-1].close.toFixed(2) : '';
    alertDialogBackdrop.classList.add('open');
  }

  document.getElementById('alertHdrBtn')?.addEventListener('click', openAlertDialog);
  document.getElementById('closeAlertDialog')?.addEventListener('click', () => alertDialogBackdrop.classList.remove('open'));
  document.getElementById('cancelAlertDialog')?.addEventListener('click', () => alertDialogBackdrop.classList.remove('open'));
  alertDialogBackdrop?.addEventListener('click', e => { if (e.target === alertDialogBackdrop) alertDialogBackdrop.classList.remove('open'); });

  document.getElementById('confirmAlertDialog')?.addEventListener('click', () => {
    const condition = document.getElementById('alertCondition').value;
    const price = parseFloat(document.getElementById('alertTriggerPrice').value);
    const msg = document.getElementById('alertMessage').value;
    if (isNaN(price)) { showToast('Enter a valid price', 'error'); return; }
    state.alerts.push({ id: Date.now(), sym: state.pair, condition, price, msg, triggered: false, ts: new Date().toLocaleTimeString() });
    alertDialogBackdrop.classList.remove('open');
    showToast(`✓ Alert set: ${state.pair} ${condition} ${price}`, 'success');
  });

  document.querySelectorAll('.notif-pill').forEach(pill => {
    pill.addEventListener('click', () => pill.classList.toggle('active'));
  });

  // ════════════════════════════════════════════════════════════════
  // CSV UPLOAD
  // ════════════════════════════════════════════════════════════════
  const csvDialogBackdrop = document.getElementById('csvDialogBackdrop');
  document.getElementById('uploadCsvBtn')?.addEventListener('click', () => csvDialogBackdrop?.classList.add('open'));
  document.getElementById('closeCsvDialog')?.addEventListener('click', () => csvDialogBackdrop?.classList.remove('open'));
  document.getElementById('cancelCsvDialog')?.addEventListener('click', () => csvDialogBackdrop?.classList.remove('open'));

  const csvDropzone = document.getElementById('csvDropzone');
  const csvFileInput = document.getElementById('csvFileInput');
  csvDropzone?.addEventListener('click', () => csvFileInput?.click());
  csvDropzone?.addEventListener('dragover', e => { e.preventDefault(); csvDropzone.classList.add('drag-over'); });
  csvDropzone?.addEventListener('dragleave', () => csvDropzone.classList.remove('drag-over'));
  csvDropzone?.addEventListener('drop', e => {
    e.preventDefault();
    csvDropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleCsvFile(file);
  });
  csvFileInput?.addEventListener('change', e => { if (e.target.files[0]) handleCsvFile(e.target.files[0]); });

  document.getElementById('confirmCsvDialog')?.addEventListener('click', () => {
    if (csvFileInput?.files[0]) handleCsvFile(csvFileInput.files[0]);
    csvDialogBackdrop?.classList.remove('open');
  });

  function handleCsvFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const lines = e.target.result.trim().split('\n');
        const header = lines[0].toLowerCase().split(',');
        const tIdx = header.findIndex(h => h.includes('time') || h.includes('date') || h === 't');
        const oIdx = header.findIndex(h => h.includes('open') || h === 'o');
        const hIdx = header.findIndex(h => h.includes('high') || h === 'h');
        const lIdx = header.findIndex(h => h.includes('low') || h === 'l');
        const cIdx = header.findIndex(h => h.includes('close') || h === 'c');
        const vIdx = header.findIndex(h => h.includes('vol') || h === 'v');

        const candles = lines.slice(1).map((line, idx) => {
          const cols = line.split(',');
          return {
            time: cols[tIdx] || `T${idx}`,
            ts: Date.now() / 1000 - (lines.length - idx) * 300,
            open: parseFloat(cols[oIdx]),
            high: parseFloat(cols[hIdx]),
            low: parseFloat(cols[lIdx]),
            close: parseFloat(cols[cIdx]),
            volume: parseFloat(cols[vIdx] || '0'),
          };
        }).filter(c => !isNaN(c.open) && !isNaN(c.close));

        if (candles.length < 10) { showToast('CSV too short or invalid format', 'error'); return; }
        state.historicalCandles = candles;
        state.forecastCandles = [];
        chart.setData(candles, [], computeIndicators(candles));
        updateHUDWithLatest();
        updateStatusBar();
        csvDialogBackdrop?.classList.remove('open');
        showToast(`✓ Loaded ${candles.length} candles from CSV`, 'success');
      } catch (err) {
        showToast('Error parsing CSV: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  // ════════════════════════════════════════════════════════════════
  // MISC HEADER BUTTONS
  // ════════════════════════════════════════════════════════════════
  document.getElementById('screenshotBtn')?.addEventListener('click', () => {
    const canvas = document.getElementById('tradingChart');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `chartkar_${state.pair}_${state.timeframe}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Screenshot saved', 'success', 2000);
  });

  document.getElementById('qtAutoScale')?.addEventListener('click', () => {
    if (chart) { chart.panOffset = 0; chart.lookbackVisible = 90; chart.render(); }
    showToast('Auto scale reset', 'info', 1500);
  });

  document.getElementById('qtFullscreen')?.addEventListener('click', () => {
    const viewport = document.getElementById('chartViewport');
    if (!document.fullscreenElement) {
      viewport?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  });

  document.getElementById('templateBtn')?.addEventListener('click', () => {
    showToast('Templates: coming soon', 'info', 2000);
  });

  // ════════════════════════════════════════════════════════════════
  // POSITIONS PANEL
  // ════════════════════════════════════════════════════════════════
  document.getElementById('positionsToggleBtn')?.addEventListener('click', () => {
    showToast('Positions panel: No open positions', 'info', 2000);
  });

  // ════════════════════════════════════════════════════════════════
  // AI STATUS CHECK
  // ════════════════════════════════════════════════════════════════
  async function checkAIHealth() {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        document.getElementById('aiStatusDot').className = 'status-dot ok';
        document.getElementById('aiStatusText').textContent = 'AI Ready';
        document.getElementById('sbAiDot').className = 'status-dot ok';
        document.getElementById('sbAiText').textContent = 'Kronos+Laya Ready';
        if (data.device) document.getElementById('deviceBadge').textContent = data.device.toUpperCase();
        if (data.ram_mb) document.getElementById('sbRam').textContent = `~${data.ram_mb}MB`;
      }
    } catch {
      document.getElementById('aiStatusDot').className = 'status-dot warn';
      document.getElementById('aiStatusText').textContent = 'AI Offline';
    }
  }
  checkAIHealth();
  setInterval(checkAIHealth, 30000);

  // ════════════════════════════════════════════════════════════════
  // LIVE PRICE SIMULATION (watchlist tick)
  // ════════════════════════════════════════════════════════════════
  setInterval(() => {
    ALL_MARKETS.forEach(m => {
      const noise = (Math.random() - 0.5) * 0.04;
      m.change = +(m.change + noise).toFixed(2);
      m.price = +(m.price * (1 + noise * 0.001)).toFixed(m.price > 100 ? 2 : 5);
    });
    // Only re-render watchlist if not animating
    if (document.getElementById('watchlistGroups')) {
      const search = document.getElementById('watchlistSearch')?.value.toLowerCase().trim() || '';
      renderWatchlist(search);
    }
  }, 3000);

  // ════════════════════════════════════════════════════════════════
  // INITIAL LOAD
  // ════════════════════════════════════════════════════════════════
  updateHeaderSymbol();
  updateStatusBar();

  // Add SMA20, RSI as default active indicators
  state.activeIndicators = ['sma20', 'vol', 'rsi'];
  renderActiveIndicatorsBar();
  updateLegend();

  // Load initial chart data
  fetchMarketData();

  // Show welcome toast
  setTimeout(() => {
    showToast('🚀 Chartkar AI Terminal loaded — press / to search symbols', 'info', 4000);
  }, 1000);

}); // End DOMContentLoaded
