/**
 * TradingView Parity Multi-Widget Dock & Terminal Controller
 * ---------------------------------------------------------------------------
 * Features:
 *   - Rail: 45px with authentic TradingView glyphs
 *   - Multi-Widget Pages:
 *       0 Watchlist & Symbol Details (Market Overview table + Quote/Range + News Card)
 *       1 Screener (TradingView Indian Equities Screener Widget)
 *       2 Heatmap (TradingView Stock / ETF Heatmap Widget)
 *       3 News (TradingView Timeline Live Market Feed)
 *       4 Economic Calendar (TradingView Events Widget)
 *       5 Technical Analysis (TradingView Technical Gauge & Oscillators)
 *   - Auto-resizing of #chart-workspace when dock is opened or collapsed.
 *   - Full interactivity: clicking any symbol switches the main chart canvas immediately.
 */
(function (window, document) {
  'use strict';

  var S3 = 'https://s3.tradingview.com/external-embedding/embed-widget-';
  var LS_OPEN = 'tvDockOpen';
  var LS_TAB = 'tvDockTab';
  var DOCK_W = 420;

  var SYMBOL_DATA = {
    'BSE:SENSEX': { name: 'SENSEX', desc: 'S&P BSE SENSEX 30 Index', ex: 'BSE Index', price: 73246.03, chg: -352.64, chgP: -0.48, high: 73762.98, low: 73179.41, vol: '13.58M', avgVol: '31.52M' },
    'NSE:NIFTY': { name: 'NIFTY', desc: 'Nifty 50 Benchmark Index', ex: 'NSE Index', price: 23146.15, chg: 148.80, chgP: 0.65, high: 23215.40, low: 23040.80, vol: '391.56M', avgVol: '312.52M' },
    'NSE:BANKNIFTY': { name: 'BANKNIFTY', desc: 'Nifty Bank Index', ex: 'NSE Index', price: 55844.00, chg: 33.50, chgP: 0.06, high: 56120.00, low: 55710.00, vol: '184.20M', avgVol: '195.40M' },
    'NSE:CNXIT': { name: 'CNXIT', desc: 'Nifty IT Index', ex: 'NSE Index', price: 31924.10, chg: 1204.30, chgP: 3.92, high: 32050.00, low: 31600.00, vol: '42.10M', avgVol: '38.50M' },
    'TVC:SPX': { name: 'SPX', desc: 'S&P 500 Index', ex: 'US Index', price: 5815.20, chg: -14.30, chgP: -0.25, high: 5840.10, low: 5802.40, vol: '2.14B', avgVol: '2.30B' },
    'BSE:RELIANCE': { name: 'RELIANCE', desc: 'Reliance Industries Ltd', ex: 'BSE', price: 1211.20, chg: -3.80, chgP: -0.31, high: 1224.00, low: 1208.50, vol: '8.45M', avgVol: '9.20M' },
    'BSE:AXISBANK': { name: 'AXISBANK', desc: 'Axis Bank Ltd', ex: 'BSE', price: 1290.00, chg: 2.00, chgP: 0.16, high: 1298.50, low: 1282.00, vol: '5.12M', avgVol: '5.40M' },
    'BSE:HDFCBANK': { name: 'HDFCBANK', desc: 'HDFC Bank Ltd', ex: 'BSE', price: 728.85, chg: 2.00, chgP: 0.28, high: 734.00, low: 725.10, vol: '16.80M', avgVol: '18.10M' },
    'BSE:ICICIBANK': { name: 'ICICIBANK', desc: 'ICICI Bank Ltd', ex: 'BSE', price: 1397.00, chg: 7.60, chgP: 0.55, high: 1406.00, low: 1388.00, vol: '11.30M', avgVol: '12.00M' },
    'BSE:BAJFINANCE': { name: 'BAJFINANCE', desc: 'Bajaj Finance Ltd', ex: 'BSE', price: 982.10, chg: 16.85, chgP: 1.75, high: 991.00, low: 974.00, vol: '4.65M', avgVol: '4.20M' },
    'BSE:TCS': { name: 'TCS', desc: 'Tata Consultancy Services Ltd', ex: 'BSE', price: 2536.00, chg: 8.20, chgP: 0.32, high: 2555.00, low: 2520.00, vol: '3.10M', avgVol: '3.40M' },
    'BSE:INFY': { name: 'INFY', desc: 'Infosys Ltd', ex: 'BSE', price: 1165.00, chg: 10.50, chgP: 0.91, high: 1175.00, low: 1152.00, vol: '7.80M', avgVol: '8.10M' }
  };

  /* Authentic TradingView Glyphs */
  var GLYPHS = {
    overview: { viewBox: '0 0 28 28', d: ['M22.2 5.01A2 2 0 0 1 24 7v14a2 2 0 0 1-1.8 1.99L22 23h-9V10H6v4H5V7c0-1.1.9-2 2-2h15zM11 21h-1v-3.3L5.7 22l-.7-.73L9.3 17H6v-1h5zm3 1h4v-6h-4zm5 0h3a1 1 0 0 0 1-1v-5h-4zm-5-7h4v-5h-4zm5 0h4v-5h-4zM7 6a1 1 0 0 0-1 1v2h7V6zm7 3h9V7a1 1 0 0 0-1-1h-8z'] },
    screener: { viewBox: '0 0 44 44', d: ['M22 8a14 14 0 1 0 0 28 14 14 0 0 0 0-28ZM9 22a13 13 0 0 1 22.03-9.35L27.5 16.2a8 8 0 1 0 .68.73l3.55-3.55A13 13 0 1 1 9 22Zm17.79-5.1a7 7 0 1 0 .68.74l-3.62 3.6A2 2 0 0 1 22 24a2 2 0 1 1 1.25-3.56l3.54-3.54Z'] },
    heatmap: { viewBox: '0 0 28 28', d: ['M4 5h9v9H4V5zm11 0h9v5h-9V5zm0 7h9v11h-9V12zM4 16h9v7H4v-7z'] },
    news: { viewBox: '0 0 44 44', d: ['M12 10c-.335 0-.669.008-1 .023v1.002c.331-.017.665-.025 1-.025 11.046 0 20 8.954 20 20 0 .335-.008.669-.025 1h1.002c.015-.331.023-.665.023-1 0-11.598-9.402-21-21-21Z', 'M27 31c0 .336-.011.67-.033 1h-1.002c.023-.33.035-.664.035-1 0-7.732-6.268-14-14-14-.336 0-.67.012-1 .035v-1.002c.33-.022.664-.033 1-.033 8.284 0 15 6.716 15 15Z', 'M21 31c0 .338-.019.672-.055 1h-1.007A8 8 0 0 0 11 23.062v-1.007A9 9 0 0 1 21 31Z', 'M15 30a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-1 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z'] },
    events: { viewBox: '0 0 44 44', d: ['M15 11h2v4h-2v-4Zm-1 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1h8v-1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1h1a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3h1v-1Zm4 2h8v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2h1a2 2 0 0 1 2 2v4H11v-4c0-1.1.9-2 2-2h1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2Zm-7 7v11c0 1.1.9 2 2 2h18a2 2 0 0 0 2-2V20H11Zm18-9h-2v4h2v-4Z'] },
    technicals: { viewBox: '0 0 28 28', d: ['M14 4a10 10 0 0 0-10 10c0 3.2 1.5 6 3.8 7.8l.8-.7A9 9 0 0 1 5 14a9 9 0 1 1 18 0c0 2.8-1.3 5.4-3.6 7.1l.8.7A10 10 0 0 0 14 4zm-.5 5v5.3l3.6 2.1.5-.9-3.1-1.8V9h-1z'] },
    chevronRight: { viewBox: '0 0 28 28', d: ['M9.29 6.71 10 6l8 8-8 8-.71-.71L16.59 14 9.29 6.71z'] },
    chevronLeft: { viewBox: '0 0 28 28', d: ['M16.29 6.71 15.59 6l-8 8 8 8 .71-.71L9.01 14l7.28-7.29z'] }
  };

  function iconSvg(g) {
    var paths = g.d.map(function (d) { return '<path d="' + d + '" fill="currentColor"/>'; }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + g.viewBox + '" fill="currentColor" aria-hidden="true">' + paths + '</svg>';
  }

  var TABS = [
    { key: 'overview', title: 'Watchlist & Details', type: 'custom_hybrid' },
    { key: 'screener', title: 'Screener', type: 'widget', widget: 'screener' },
    { key: 'heatmap', title: 'Stock Heatmap', type: 'widget', widget: 'stock-heatmap' },
    { key: 'news', title: 'News Feed', type: 'widget', widget: 'timeline' },
    { key: 'events', title: 'Economic Calendar', type: 'widget', widget: 'events' },
    { key: 'technicals', title: 'Technical Analysis', type: 'widget', widget: 'technical-analysis' }
  ];

  var state = {
    dock: null, pages: null, topbarTitle: null,
    mounted: {},
    activeSymbol: 'BSE:SENSEX',
    open: (function () { try { return localStorage.getItem(LS_OPEN) !== '0'; } catch (e) { return true; } })(),
    tab: (function () { try { var t = parseInt(localStorage.getItem(LS_TAB), 10); return isFinite(t) && t >= 0 && t < TABS.length ? t : 0; } catch (e) { return 0; } })()
  };

  function persistOpen() { try { localStorage.setItem(LS_OPEN, state.open ? '1' : '0'); } catch (e) {} }
  function persistTab() { try { localStorage.setItem(LS_TAB, String(state.tab)); } catch (e) {} }

  /* ------------------------------------------------------------------------
   * Tab 0: Watchlist & Symbol Details (TradingView Parity matching user image)
   * ---------------------------------------------------------------------- */
  function renderWatchlistDetails(page) {
    page.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'tv-hybrid-sidebar';

    // Top: Watchlist table
    var wlSection = document.createElement('div');
    wlSection.className = 'tv-wl-section';
    wlSection.innerHTML = [
      '<div class="tv-wl-header">',
      '  <div class="tv-wl-title"><span>Watchlist</span><svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5"/></svg></div>',
      '  <div class="tv-wl-actions">',
      '    <button class="tv-wl-btn" title="Add symbol">+</button>',
      '    <button class="tv-wl-btn" title="Sort by change"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M6 12h12m-9 6h6"/></svg></button>',
      '    <button class="tv-wl-btn" title="More options">&hellip;</button>',
      '  </div>',
      '</div>',
      '<div class="tv-wl-table-head">',
      '  <div class="col-sym">Symbol</div>',
      '  <div class="col-last">Last</div>',
      '  <div class="col-chg">Chg</div>',
      '  <div class="col-chgp">Chg%</div>',
      '</div>',
      '<div class="tv-wl-table-body" id="tv-wl-rows"></div>'
    ].join('\n');

    // Bottom: Symbol Details & News snippet (exact match to user image!)
    var detSection = document.createElement('div');
    detSection.className = 'tv-detail-section';
    detSection.id = 'tv-detail-box';

    wrap.appendChild(wlSection);
    wrap.appendChild(detSection);
    page.appendChild(wrap);

    renderWatchlistRows();
    updateSymbolDetails(state.activeSymbol);
  }

  function renderWatchlistRows() {
    var container = document.getElementById('tv-wl-rows');
    if (!container) return;
    container.innerHTML = '';

    var indices = ['NSE:NIFTY', 'NSE:BANKNIFTY', 'BSE:SENSEX', 'NSE:CNXIT', 'TVC:SPX'];
    var stocks = ['BSE:RELIANCE', 'BSE:AXISBANK', 'BSE:HDFCBANK', 'BSE:ICICIBANK', 'BSE:BAJFINANCE', 'BSE:TCS', 'BSE:INFY'];

    function buildRow(sym) {
      var d = SYMBOL_DATA[sym] || { name: sym, price: 1000, chg: 0, chgP: 0 };
      var isUp = d.chg >= 0;
      var colorClass = isUp ? 'tv-up' : 'tv-down';
      var sign = isUp ? '+' : '';
      var activeClass = (sym === state.activeSymbol) ? ' selected' : '';

      var row = document.createElement('div');
      row.className = 'tv-wl-row' + activeClass;
      row.setAttribute('data-symbol', sym);
      row.innerHTML = [
        '<div class="col-sym"><span class="sym-name">' + d.name + '</span><span class="sym-flag">D</span></div>',
        '<div class="col-last">' + d.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</div>',
        '<div class="col-chg ' + colorClass + '">' + sign + d.chg.toFixed(2) + '</div>',
        '<div class="col-chgp ' + colorClass + '">' + sign + d.chgP.toFixed(2) + '%</div>'
      ].join('');

      row.addEventListener('click', function () {
        selectSymbol(sym);
      });
      return row;
    }

    indices.forEach(function (sym) { container.appendChild(buildRow(sym)); });

    // Section header
    var sec = document.createElement('div');
    sec.className = 'tv-wl-sec-header';
    sec.innerHTML = '<span>&#9662; STOCKS</span>';
    container.appendChild(sec);

    stocks.forEach(function (sym) { container.appendChild(buildRow(sym)); });
  }

  function updateSymbolDetails(sym) {
    var box = document.getElementById('tv-detail-box');
    if (!box) return;
    var d = SYMBOL_DATA[sym] || { name: sym, desc: sym, ex: 'BSE', price: 73246.03, chg: -352.64, chgP: -0.48, high: 73762.98, low: 73179.41, vol: '13.58M', avgVol: '31.52M' };
    var isUp = d.chg >= 0;
    var sign = isUp ? '+' : '';
    var color = isUp ? '#089981' : '#f23645';

    box.innerHTML = [
      '<div class="tv-det-header">',
      '  <div class="tv-det-avatar">' + (d.name.length > 2 ? d.name.slice(0, 2) : d.name) + '</div>',
      '  <div class="tv-det-title-group">',
      '    <div class="tv-det-sym">' + d.name + '</div>',
      '    <div class="tv-det-desc">' + d.desc + ' &middot; ' + d.ex + '</div>',
      '  </div>',
      '  <div class="tv-det-icons">',
      '    <button title="Layout"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></button>',
      '    <button title="More">&hellip;</button>',
      '  </div>',
      '</div>',
      '<div class="tv-det-price-row">',
      '  <div class="tv-det-price">' + d.price.toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' <span class="unit">INR</span></div>',
      '  <div class="tv-det-change" style="color:' + color + ';">' + sign + d.chg.toFixed(2) + ' ' + sign + d.chgP.toFixed(2) + '%</div>',
      '</div>',
      '<div class="tv-det-status">Market closed &middot; Last update Oct 28, 15:30 IST</div>',
      '<div class="tv-det-bars">',
      '  <div class="tv-det-bar-item">',
      '    <div class="lbl"><span>Day\'s Range</span><span>' + d.low.toLocaleString('en-IN') + ' &mdash; ' + d.high.toLocaleString('en-IN') + '</span></div>',
      '    <div class="bar"><div class="fill" style="width:65%;"></div></div>',
      '  </div>',
      '  <div class="tv-det-bar-item">',
      '    <div class="lbl"><span>Volume</span><span>' + d.vol + ' (Avg 30D: ' + d.avgVol + ')</span></div>',
      '    <div class="bar"><div class="fill" style="width:45%;background:#2962ff;"></div></div>',
      '  </div>',
      '</div>',
      '<!-- Authentic News Snippet Card from TradingView reference image -->',
      '<div class="tv-det-news-card">',
      '  <div class="tag">News &middot; 6 minutes ago</div>',
      '  <div class="head">Weak domestic returns fuel India\'s overseas retail investing boom</div>',
      '  <div class="more">More events &rsaquo;</div>',
      '</div>'
    ].join('\n');
  }

  function selectSymbol(sym) {
    state.activeSymbol = sym;
    var d = SYMBOL_DATA[sym] || { name: sym };
    if (window.changeSymbol) {
      window.changeSymbol(sym, d.name);
    }
    renderWatchlistRows();
    updateSymbolDetails(sym);
  }

  /* ------------------------------------------------------------------------
   * Generic Embed Widget Mounting (Screener, Heatmap, News, Calendar, Technicals)
   * ---------------------------------------------------------------------- */
  function mountGenericWidget(page, widget) {
    page.innerHTML = '';
    var holder = document.createElement('div');
    holder.className = 'tradingview-widget-container';
    holder.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:#ffffff;';
    var inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.cssText = 'width:100%;height:100%;';
    holder.appendChild(inner);
    page.appendChild(holder);

    var cfg = {};
    if (widget === 'screener') {
      cfg = { width: '100%', height: '100%', defaultColumn: 'overview', defaultScreen: 'most_capitalized', market: 'india', showToolbar: true, colorTheme: 'light', locale: 'en' };
    } else if (widget === 'stock-heatmap') {
      cfg = { width: '100%', height: '100%', dataSource: 'SENSEX', blockSize: 'market_cap_calc', blockColor: 'change', colorTheme: 'light', locale: 'en', symbolUrl: '' };
    } else if (widget === 'timeline') {
      cfg = { feedMode: 'market', market: 'index', width: '100%', height: '100%', colorTheme: 'light', isTransparent: false, displayMode: 'regular', locale: 'en' };
    } else if (widget === 'events') {
      cfg = { width: '100%', height: '100%', colorTheme: 'light', isTransparent: false, locale: 'en', importanceFilter: '0,1', countryFilter: 'in,us,eu' };
    } else if (widget === 'technical-analysis') {
      cfg = { interval: '1D', width: '100%', height: '100%', isTransparent: false, symbol: state.activeSymbol, showIntervalTabs: true, colorTheme: 'light', locale: 'en' };
    }

    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = S3 + widget + '.js';
    s.textContent = JSON.stringify(cfg);
    holder.appendChild(s);
  }

  function mountFor(idx) {
    var tabInfo = TABS[idx];
    if (!tabInfo) return;
    var page = state.pages.children[idx];
    if (!page) return;

    if (tabInfo.type === 'custom_hybrid') {
      renderWatchlistDetails(page);
    } else {
      if (state.mounted[idx]) return;
      state.mounted[idx] = true;
      mountGenericWidget(page, tabInfo.widget);
    }
  }

  /* ------------------------------------------------------------------------
   * Dock UI Construction & Styles
   * ---------------------------------------------------------------------- */
  function injectCss() {
    var css = [
      '#tv-dock { position: fixed; top: 38px; right: 0; bottom: 30px; width: ' + DOCK_W + 'px; display: flex;',
      '  background: #ffffff; border-left: 1px solid #e0e3eb;',
      '  font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif; z-index: 30; }',
      '#tv-dock.hidden { display: none; }',
      'body.tv-dock-closed #chart-workspace { width: 100vw !important; }',
      'body:not(.tv-dock-closed) #chart-workspace { width: calc(100vw - ' + DOCK_W + 'px) !important; }',
      '#tv-dock-rail { width: 45px; flex: none; border-left: 1px solid #e0e3eb; order: 2;',
      '  display: flex; flex-direction: column; align-items: center; padding: 6px 0; gap: 4px; background: #ffffff; }',
      '.tv-dock-tab { width: 34px; height: 34px; border: 0; border-radius: 6px; background: transparent; color: #131722;',
      '  cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: .72; padding: 0; transition: all 0.1s ease; }',
      '.tv-dock-tab:hover { background: #f0f3fa; opacity: 1; }',
      '.tv-dock-tab.active { background: #131722; color: #ffffff !important; opacity: 1; }',
      '.tv-dock-tab svg { width: 20px; height: 20px; display: block; }',
      '#tv-dock-collapse { margin-top: auto; }',
      '#tv-dock-reopen { position: fixed; top: 44px; right: 8px; width: 28px; height: 28px; z-index: 29; border: 1px solid #e0e3eb;',
      '  border-radius: 4px; background: #f0f3fa; color: #131722; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }',
      '#tv-dock-main { flex: 1; min-width: 0; display: flex; flex-direction: column; position: relative; order: 1; overflow: hidden; }',
      '#tv-dock-topbar { height: 38px; flex: none; display: flex; align-items: center; justify-content: space-between;',
      '  padding: 0 12px; border-bottom: 1px solid #e0e3eb; color: #131722; font-size: 13px; font-weight: 700; background: #ffffff; }',
      '#tv-dock-pages { position: relative; flex: 1; overflow: hidden; }',
      '.tv-dock-page { position: absolute; inset: 0; display: none; }',
      '.tv-dock-page.active { display: block; }',
      
      '/* Watchlist Table Styles */',
      '.tv-hybrid-sidebar { display: flex; flex-direction: column; width: 100%; height: 100%; background: #ffffff; }',
      '.tv-wl-section { height: 50%; display: flex; flex-direction: column; border-bottom: 1px solid #e0e3eb; }',
      '.tv-wl-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; }',
      '.tv-wl-title { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; color: #131722; cursor: pointer; }',
      '.tv-wl-actions { display: flex; align-items: center; gap: 6px; }',
      '.tv-wl-btn { background: transparent; border: none; font-size: 16px; color: #787b86; cursor: pointer; padding: 2px 5px; border-radius: 4px; }',
      '.tv-wl-btn:hover { background: #f0f3fa; color: #131722; }',
      '.tv-wl-table-head { display: flex; padding: 6px 12px; font-size: 11px; font-weight: 600; color: #787b86; border-bottom: 1px solid #f0f3fa; }',
      '.tv-wl-table-body { flex: 1; overflow-y: auto; overflow-x: hidden; }',
      '.tv-wl-row { display: flex; align-items: center; padding: 6px 12px; font-size: 12px; color: #131722; cursor: pointer; transition: background 0.1s ease; border-left: 3px solid transparent; }',
      '.tv-wl-row:hover { background: #f8f9fd; }',
      '.tv-wl-row.selected { background: #edf2fe; border-left-color: #2962ff; font-weight: 600; }',
      '.col-sym { flex: 1.4; display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.sym-name { font-weight: 600; }',
      '.sym-flag { font-size: 9px; padding: 1px 3px; background: #f0f3fa; color: #787b86; border-radius: 2px; }',
      '.col-last { flex: 1; text-align: right; font-variant-numeric: tabular-nums; }',
      '.col-chg { flex: 0.9; text-align: right; font-variant-numeric: tabular-nums; }',
      '.col-chgp { flex: 1; text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }',
      '.tv-up { color: #089981 !important; }',
      '.tv-down { color: #f23645 !important; }',
      '.tv-wl-sec-header { padding: 8px 12px 4px; font-size: 11px; font-weight: 700; color: #787b86; background: #fafbfc; border-top: 1px solid #f0f3fa; }',

      '/* Symbol Details & News Card */',
      '.tv-detail-section { height: 50%; overflow-y: auto; padding: 12px 14px; background: #ffffff; display: flex; flex-direction: column; gap: 10px; }',
      '.tv-det-header { display: flex; align-items: center; gap: 8px; }',
      '.tv-det-avatar { width: 28px; height: 28px; border-radius: 50%; background: #2962ff; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex: none; }',
      '.tv-det-title-group { flex: 1; min-width: 0; }',
      '.tv-det-sym { font-size: 14px; font-weight: 700; color: #131722; }',
      '.tv-det-desc { font-size: 11px; color: #787b86; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.tv-det-icons { display: flex; gap: 4px; }',
      '.tv-det-icons button { background: none; border: none; color: #787b86; cursor: pointer; padding: 3px; border-radius: 4px; }',
      '.tv-det-price-row { display: flex; align-items: baseline; gap: 10px; }',
      '.tv-det-price { font-size: 20px; font-weight: 700; color: #131722; }',
      '.tv-det-price .unit { font-size: 11px; color: #787b86; font-weight: 400; }',
      '.tv-det-change { font-size: 13px; font-weight: 700; }',
      '.tv-det-status { font-size: 11px; color: #787b86; margin-top: -6px; }',
      '.tv-det-bars { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }',
      '.tv-det-bar-item .lbl { display: flex; justify-content: space-between; font-size: 11px; color: #787b86; margin-bottom: 3px; }',
      '.tv-det-bar-item .bar { height: 4px; background: #e0e3eb; border-radius: 2px; overflow: hidden; }',
      '.tv-det-bar-item .fill { height: 100%; background: #089981; border-radius: 2px; }',
      '.tv-det-news-card { background: #f3f0fc; border-radius: 6px; padding: 10px 12px; margin-top: 6px; display: flex; flex-direction: column; gap: 4px; cursor: pointer; transition: background 0.15s ease; }',
      '.tv-det-news-card:hover { background: #eae4fa; }',
      '.tv-det-news-card .tag { font-size: 10px; font-weight: 600; color: #6b46c1; }',
      '.tv-det-news-card .head { font-size: 11.5px; font-weight: 600; color: #131722; line-height: 1.35; }',
      '.tv-det-news-card .more { font-size: 10px; color: #787b86; align-self: flex-end; margin-top: 2px; }'
    ].join('\n');

    var st = document.createElement('style');
    st.id = 'tv-dock-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function buildDock() {
    if (document.getElementById('tv-dock')) return;

    injectCss();

    var dock = el('div', { id: 'tv-dock' });

    var rail = el('div', { id: 'tv-dock-rail' });
    TABS.forEach(function (t, i) {
      var b = el('button', { class: 'tv-dock-tab', type: 'button', title: t.title, 'aria-label': t.title, 'data-dock-tab': i });
      b.innerHTML = iconSvg(GLYPHS[t.key]);
      rail.appendChild(b);
    });
    var collapse = el('button', { id: 'tv-dock-collapse', class: 'tv-dock-tab', type: 'button', title: 'Collapse dock', 'aria-label': 'Collapse dock' });
    collapse.innerHTML = iconSvg(GLYPHS.chevronRight);
    rail.appendChild(collapse);

    var main = el('div', { id: 'tv-dock-main' });
    var topbar = el('div', { id: 'tv-dock-topbar' });
    var title = el('span');
    title.textContent = TABS[state.tab].title;
    topbar.appendChild(title);

    var pages = el('div', { id: 'tv-dock-pages' });
    TABS.forEach(function (t, i) {
      var p = el('div', { class: 'tv-dock-page' + (i === state.tab ? ' active' : '') });
      pages.appendChild(p);
    });

    main.appendChild(topbar);
    main.appendChild(pages);
    dock.appendChild(main);
    dock.appendChild(rail);
    document.body.appendChild(dock);

    var reopen = el('button', { id: 'tv-dock-reopen', type: 'button', title: 'Open dock', 'aria-label': 'Open dock' });
    reopen.innerHTML = iconSvg(GLYPHS.chevronLeft);
    reopen.style.display = state.open ? 'none' : 'flex';
    document.body.appendChild(reopen);

    state.dock = dock;
    state.pages = pages;
    state.topbarTitle = title;

    rail.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || b.id === 'tv-dock-collapse') return;
      var idx = parseInt(b.getAttribute('data-dock-tab'), 10);
      if (!isFinite(idx)) return;
      setActiveTab(idx);
      mountFor(idx);
    });
    collapse.addEventListener('click', setDockOpen.bind(null, false));
    reopen.addEventListener('click', setDockOpen.bind(null, true));

    applyOpen();
    setActiveTab(state.tab);
    mountFor(state.tab);
  }

  function setActiveTab(idx) {
    state.tab = idx;
    persistTab();
    var tabs = state.dock.querySelectorAll('.tv-dock-tab:not(#tv-dock-collapse)');
    for (var i = 0; i < tabs.length; i++) {
      var isActive = i === idx;
      tabs[i].classList.toggle('active', isActive);
      tabs[i].setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
    var kids = state.pages.children;
    for (var j = 0; j < kids.length; j++) kids[j].classList.toggle('active', j === idx);
    state.topbarTitle.textContent = TABS[idx].title;
  }

  function applyOpen() {
    if (state.open) {
      state.dock.classList.remove('hidden');
      document.body.classList.add('tv-dock-open');
      document.body.classList.remove('tv-dock-closed');
      var r = document.getElementById('tv-dock-reopen');
      if (r) r.style.display = 'none';
    } else {
      state.dock.classList.add('hidden');
      document.body.classList.remove('tv-dock-open');
      document.body.classList.add('tv-dock-closed');
      var r = document.getElementById('tv-dock-reopen');
      if (r) r.style.display = 'flex';
    }
  }

  function setDockOpen(v) {
    state.open = v;
    persistOpen();
    applyOpen();
    if (v) mountFor(state.tab);
  }

  function boot() { buildDock(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.tvDock = {
    open: setDockOpen,
    setActiveTab: function (i) { if (isFinite(i) && i >= 0 && i < TABS.length) { setActiveTab(i); mountFor(i); } },
    updateActiveSymbol: function (sym) {
      state.activeSymbol = sym;
      renderWatchlistRows();
      updateSymbolDetails(sym);
    }
  };
})(window, document);
