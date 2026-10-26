/**
 * TradingView Embed Widgets Layer (right dock)
 * ---------------------------------------------------------------------------
 * Mounts authentic TradingView embed widgets inside the right dock pages so
 * every panel ships with TradingView's own working UI:
 *
 *   Dock tab 0  ->  Watchlist widget            (real TV watchlist UI/groups)
 *   Dock tab 4  ->  Screener widget             (market: "india")
 *   Dock tab 6  ->  Economic Calendar widget    (India focus events)
 *
 * The chart canvas itself stays on KlineCharts. Dock tabs 1,2,3,5,7..11 keep
 * the existing scripted panels (alerts, object tree, copilot, pine, ...).
 *
 * Loaded config is grouped from static/data/user_symbols_list.json (the same
 * list that feeds the terminal watchlist), with a hard-coded fallback so the
 * panel still works offline.
 */
(function (window) {
  'use strict';

  const S3 = 'https://s3.tradingview.com/external-embedding/embed-widget-';

  const DEFAULT_WATCHLIST = [
    'NSE:NIFTY', 'NSE:BANKNIFTY', 'BSE:SENSEX', 'NSE:CNXIT', 'TVC:SPX',
    '###Stocks',
    'NSE:RELIANCE', 'NSE:AXISBANK', 'NSE:HDFCBANK', 'NSE:ICICIBANK', 'NSE:BAJFINANCE',
    '###Futures',
    'NSE:NIFTY1!', 'NSE:BANKNIFTY1!', 'NSE:RELIANCE1!', 'NSE:INFY1!',
    '###Forex',
    'FX_IDC:USDINR', 'FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY',
    '###Crypto',
    'BITSTAMP:BTCUSD', 'BITSTAMP:ETHUSD', 'BITSTAMP:XRPUSD', 'BITSTAMP:LTCUSD'
  ];

  const state = {
    mounted: {},   // pageIdx -> true once a widget holder was injected
    fallbackTried: {}
  };

  // ---------------------------------------------------------------------------
  // Config builders
  // ---------------------------------------------------------------------------
  function buildWatchlistGroups(raw) {
    const groups = [];
    let cur = null;
    for (const s of raw) {
      if (!s) continue;
      if (/^###/.test(s)) {
        cur = { name: s.slice(3), originalName: s.slice(3), symbols: [] };
        groups.push(cur);
      } else {
        if (!cur) {
          cur = { name: 'Watchlist', originalName: 'Watchlist', symbols: [] };
          groups.push(cur);
        }
        const display = s.indexOf(':') > -1 ? s.split(':')[1] : s;
        cur.symbols.push({ name: s, displayName: display });
      }
    }
    return groups;
  }

  function buildTabsFromGroups(raw) {
    return buildWatchlistGroups(raw).map((g) => ({
      title: g.name,
      symbols: g.symbols.map((s) => ({ s: s.name, d: s.displayName }))
    }));
  }

  function watchlistWidgetConfig(groups) {
    return {
      colorTheme: 'light',
      isTransparent: false,
      largeChartUrl: '',
      locale: 'en',
      width: '100%',
      height: '100%',
      showSymbolLogo: false,
      symbolsGroups: groups
    };
  }

  function marketOverviewConfig(tabs) {
    return {
      colorTheme: 'light',
      dateRange: '12M',
      showChart: false,
      locale: 'en',
      isTransparent: false,
      showSymbolLogo: false,
      width: '100%',
      height: '100%',
      tabs: tabs
    };
  }

  function screenerConfig() {
    return {
      width: '100%',
      height: '100%',
      defaultColumn: 'overview',
      defaultScreen: 'most_capitalized',
      market: 'india',
      showToolbar: true,
      isTransparent: false,
      colorTheme: 'light',
      locale: 'en'
    };
  }

  function eventsConfig() {
    return {
      width: '100%',
      height: '100%',
      colorTheme: 'light',
      isTransparent: false,
      locale: 'en',
      importanceFilter: '0,1',
      countryFilter: 'in,us,eu'
    };
  }

  // ---------------------------------------------------------------------------
  // Mount machinery
  // ---------------------------------------------------------------------------
  function mountWidget(page, widgetName, config) {
    // page = .widgetbar-page element
    page.innerHTML = '';

    const holder = document.createElement('div');
    holder.className = 'tradingview-widget-container tvwidget-holder';
    holder.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:#ffffff;';

    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.cssText = 'width:100%;height:100%;';
    holder.appendChild(inner);

    const s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = S3 + widgetName + '.js?v=1';
    s.textContent = JSON.stringify(config);
    holder.appendChild(s);

    page.appendChild(holder);
    return holder;
  }

  function hasLoadedIframe(holder) {
    if (!holder || !holder.isConnected) return false;
    const iframe = holder.querySelector('iframe');
    return !!(iframe && iframe.src && iframe.src.indexOf('tradingview.com') > -1 &&
      iframe.getBoundingClientRect().height > 8);
  }

  function watchlistFallback(page) {
    state.fallbackTried[0] = true;
    console.warn('[TV Widgets] Watchlist widget did not load — installing Market Overview fallback');
    mountWidget(page, 'market-overview', marketOverviewConfig(buildTabsFromGroups(state.symbols)));
  }

  // ---------------------------------------------------------------------------
  // Dock page hooks
  // ---------------------------------------------------------------------------
  function mountFor(pageIdx, pagesContainer) {
    if (state.mounted[pageIdx]) return;
    const page = pagesContainer.querySelectorAll('.widgetbar-page')[pageIdx];
    if (!page) return;

    if (pageIdx === 0) {
      state.mounted[0] = true;
      const holder = mountWidget(page, 'watchlist', watchlistWidgetConfig(buildWatchlistGroups(state.symbols)));
      // Confirm the embed actually rendered; else swap to the documented widget
      let tries = 0;
      const t = setInterval(() => {
        if (hasLoadedIframe(holder)) { clearInterval(t); return; }
        if (++tries >= 12) { clearInterval(t); if (!state.fallbackTried[0]) watchlistFallback(page); }
      }, 500);
    } else if (pageIdx === 4) {
      state.mounted[4] = true;
      mountWidget(page, 'screener', screenerConfig());
    } else if (pageIdx === 6) {
      state.mounted[6] = true;
      mountWidget(page, 'events', eventsConfig());
    }
  }

  function wireActivation() {
    if (state.booted) return;
    state.booted = true;
    const tabsContainer = document.querySelector('.widgetbar-tabs');
    const pagesContainer = document.querySelector('.widgetbar-pagescontent');
    if (!tabsContainer || !pagesContainer) {
      // Retry until tv_features_full's initRightPages has created the pages
      state.booted = false;
      setTimeout(wireActivation, 300);
      return;
    }

    // Capture phase: tv_features_full's own tab handlers call stopPropagation(),
    // which would swallow a bubble-phase container listener.
    tabsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const buttons = Array.from(tabsContainer.querySelectorAll('button'));
      const idx = buttons.indexOf(btn);
      if (idx < 0) return;
      // tv_features_full switches the page inside its own handler; mount lazily
      // right after the switch, and only the first time a tab is opened.
      setTimeout(() => mountFor(idx, pagesContainer), 60);
    }, true);

    // Default dock page (0) is the Watchlist — mount straight away
    mountFor(0, pagesContainer);
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  function boot() {
    state.symbols = DEFAULT_WATCHLIST.slice();
    // Wire immediately so panel mounting never depends on a network round-trip
    wireActivation();
    // Keep the shared watchlist in sync with server data if it ever changes
    if (window.fetch) {
      fetch('/static/data/user_symbols_list.json')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.symbols) && data.symbols.length &&
            JSON.stringify(data.symbols) !== JSON.stringify(state.symbols)) {
            state.symbols = data.symbols.slice();
            const pages = document.querySelector('.widgetbar-pagescontent');
            if (pages) {
              state.mounted[0] = false;
              mountFor(0, pages);
            }
          }
        })
        .catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.tvWidgets = {
    mountFor,
    buildWatchlistGroups,
    buildTabsFromGroups,
    state: state
  };
})(window);
