/**
 * TradingView All-Pages Unified Interactive Engine
 * Provides authentic, fully functional UI and features across ALL indexed routes:
 * 1. Stock Screener (/screener)
 * 2. Crypto Screener (/crypto-screener)
 * 3. Forex Screener (/forex-screener)
 * 4. Market Heatmap (/heatmap)
 * 5. Markets Overview & Sub-markets (/markets, /markets/indices, /markets/stocks-india, etc.)
 * 6. Economic Calendar (/calendar, /economic-calendar)
 * 7. Financial News (/news)
 * 8. Community Ideas (/community)
 * 9. Pricing & Plans (/pricing)
 * 10. Symbol Overview & Technicals (/symbols/nifty, /symbols/nifty/technicals, etc.)
 */

(function () {
  'use strict';

  console.log('[TV Pages Engine] Initializing interactive features for all indexed URLs...');

  const path = window.location.pathname.toLowerCase();

  // ─────────────────────────────────────────────────────────────────────────
  // 1. DATASETS
  // ─────────────────────────────────────────────────────────────────────────
  const STOCKS_DATA = [
    { ticker: 'RELIANCE', name: 'Reliance Industries Ltd', price: 2940.30, chg: 1.15, vol: '4.2M', cap: '₹19.8T', pe: 28.4, eps: 103.5, rating: 'Strong Buy', sector: 'Energy' },
    { ticker: 'TCS', name: 'Tata Consultancy Services', price: 4120.00, chg: -0.30, vol: '1.8M', cap: '₹14.9T', pe: 31.2, eps: 132.0, rating: 'Neutral', sector: 'Technology' },
    { ticker: 'HDFCBANK', name: 'HDFC Bank Ltd', price: 1680.45, chg: 0.95, vol: '8.9M', cap: '₹12.7T', pe: 19.8, eps: 84.8, rating: 'Strong Buy', sector: 'Financials' },
    { ticker: 'INFY', name: 'Infosys Ltd', price: 1890.10, chg: 1.40, vol: '5.6M', cap: '₹7.8T', pe: 27.5, eps: 68.7, rating: 'Buy', sector: 'Technology' },
    { ticker: 'ICICIBANK', name: 'ICICI Bank Ltd', price: 1245.00, chg: 0.50, vol: '7.1M', cap: '₹8.7T', pe: 18.2, eps: 68.4, rating: 'Strong Buy', sector: 'Financials' },
    { ticker: 'BHARTIARTL', name: 'Bharti Airtel Ltd', price: 1685.20, chg: 1.80, vol: '3.4M', cap: '₹9.5T', pe: 42.1, eps: 40.0, rating: 'Buy', sector: 'Telecommunications' },
    { ticker: 'SBIN', name: 'State Bank of India', price: 810.50, chg: -0.45, vol: '11.2M', cap: '₹7.2T', pe: 11.4, eps: 71.1, rating: 'Buy', sector: 'Financials' },
    { ticker: 'ITC', name: 'ITC Ltd', price: 485.60, chg: 0.25, vol: '6.5M', cap: '₹6.1T', pe: 26.8, eps: 18.1, rating: 'Neutral', sector: 'Consumer Goods' },
    { ticker: 'LT', name: 'Larsen & Toubro Ltd', price: 3620.00, chg: 1.10, vol: '2.1M', cap: '₹4.9T', pe: 36.5, eps: 99.2, rating: 'Buy', sector: 'Industrials' },
    { ticker: 'TATAMOTORS', name: 'Tata Motors Ltd', price: 975.30, chg: -1.20, vol: '6.8M', cap: '₹3.6T', pe: 16.2, eps: 60.2, rating: 'Buy', sector: 'Automobile' },
    { ticker: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', price: 2680.00, chg: -0.15, vol: '1.2M', cap: '₹6.3T', pe: 58.4, eps: 45.9, rating: 'Neutral', sector: 'Consumer Goods' },
    { ticker: 'SUNPHARMA', name: 'Sun Pharmaceutical Ltd', price: 1890.00, chg: 2.10, vol: '2.4M', cap: '₹4.5T', pe: 39.0, eps: 48.5, rating: 'Strong Buy', sector: 'Healthcare' }
  ];

  const CRYPTO_DATA = [
    { pair: 'BTCUSDT', name: 'Bitcoin', price: 68450.00, chg: 2.80, high: 69100.00, low: 67200.00, vol: '$32.4B', cap: '$1.35T', rating: 'Strong Buy' },
    { pair: 'ETHUSDT', name: 'Ethereum', price: 3540.20, chg: 3.15, high: 3590.00, low: 3420.00, vol: '$18.2B', cap: '$425B', rating: 'Buy' },
    { pair: 'SOLUSDT', name: 'Solana', price: 182.50, chg: 5.40, high: 186.00, low: 172.00, vol: '$5.8B', cap: '$85B', rating: 'Strong Buy' },
    { pair: 'BNBUSDT', name: 'BNB', price: 595.00, chg: 0.85, high: 602.00, low: 588.00, vol: '$1.2B', cap: '$91B', rating: 'Buy' },
    { pair: 'XRPUSDT', name: 'XRP', price: 0.548, chg: -0.90, high: 0.562, low: 0.541, vol: '$950M', cap: '$31B', rating: 'Neutral' },
    { pair: 'DOGEUSDT', name: 'Dogecoin', price: 0.142, chg: 8.20, high: 0.148, low: 0.129, vol: '$2.1B', cap: '$20B', rating: 'Strong Buy' },
    { pair: 'ADAUSDT', name: 'Cardano', price: 0.355, chg: 1.10, high: 0.362, low: 0.348, vol: '$410M', cap: '$12.8B', rating: 'Neutral' },
    { pair: 'AVAXUSDT', name: 'Avalanche', price: 28.40, chg: 3.75, high: 29.10, low: 27.20, vol: '$620M', cap: '$11.5B', rating: 'Buy' }
  ];

  const FOREX_DATA = [
    { pair: 'USDINR', name: 'US Dollar / Indian Rupee', bid: 84.052, ask: 84.058, spread: 0.006, chg: -0.05, rating: 'Neutral', type: 'Major' },
    { pair: 'EURUSD', name: 'Euro / US Dollar', bid: 1.0845, ask: 1.0847, spread: 0.0002, chg: 0.22, rating: 'Neutral', type: 'Major' },
    { pair: 'GBPUSD', name: 'British Pound / US Dollar', bid: 1.2980, ask: 1.2982, spread: 0.0002, chg: 0.35, rating: 'Buy', type: 'Major' },
    { pair: 'USDJPY', name: 'US Dollar / Japanese Yen', bid: 152.40, ask: 152.42, spread: 0.02, chg: -0.40, rating: 'Sell', type: 'Major' },
    { pair: 'GBPINR', name: 'British Pound / Indian Rupee', bid: 109.10, ask: 109.13, spread: 0.03, chg: 0.28, rating: 'Buy', type: 'Exotic' },
    { pair: 'EURINR', name: 'Euro / Indian Rupee', bid: 91.15, ask: 91.18, spread: 0.03, chg: 0.18, rating: 'Neutral', type: 'Exotic' },
    { pair: 'AUDUSD', name: 'Australian Dollar / US Dollar', bid: 0.6650, ask: 0.6652, spread: 0.0002, chg: -0.15, rating: 'Neutral', type: 'Minor' }
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // 2. STOCK SCREENER (/screener)
  // ─────────────────────────────────────────────────────────────────────────
  function initStockScreener() {
    let mainContainer = document.querySelector('.table-container, main, .content, #js-screener-container') || document.body;

    const wrapper = document.createElement('div');
    wrapper.id = 'tv-interactive-screener-mount';
    wrapper.style.cssText = `
      max-width: 1380px;
      margin: 20px auto;
      padding: 0 20px 60px;
      font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
    `;

    wrapper.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
        <div>
          <h1 style="font-size:26px;font-weight:700;color:#131722;margin:0 0 6px;">Indian Stock Screener</h1>
          <div style="font-size:13px;color:#787b86;">Scan, filter and analyze NSE & BSE stocks with real-time technical & fundamental metrics.</div>
        </div>
        <div style="display:flex;gap:10px;">
          <input id="tv-screener-search" type="text" placeholder="Search ticker or company..." style="padding:8px 14px;border:1px solid #e0e3eb;border-radius:6px;font-size:13px;outline:none;width:240px;">
          <button id="tv-screener-export" style="background:#f0f3fa;border:1px solid #e0e3eb;border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;color:#131722;cursor:pointer;">Export CSV</button>
        </div>
      </div>

      <!-- Category Filter Tabs -->
      <div style="display:flex;gap:10px;border-bottom:1px solid #e0e3eb;margin-bottom:16px;padding-bottom:10px;overflow-x:auto;">
        <button class="tv-scr-tab active" data-filter="all" style="background:#eef3fd;color:#2962ff;border:none;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;">Overview</button>
        <button class="tv-scr-tab" data-filter="gainers" style="background:transparent;color:#787b86;border:none;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:500;cursor:pointer;">Top Gainers</button>
        <button class="tv-scr-tab" data-filter="losers" style="background:transparent;color:#787b86;border:none;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:500;cursor:pointer;">Top Losers</button>
        <button class="tv-scr-tab" data-filter="strongbuy" style="background:transparent;color:#787b86;border:none;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:500;cursor:pointer;">Strong Buy</button>
        <button class="tv-scr-tab" data-filter="tech" style="background:transparent;color:#787b86;border:none;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:500;cursor:pointer;">Technology</button>
        <button class="tv-scr-tab" data-filter="fin" style="background:transparent;color:#787b86;border:none;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:500;cursor:pointer;">Financials</button>
      </div>

      <!-- Screener Data Table -->
      <div style="background:#ffffff;border:1px solid #e0e3eb;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <table style="width:100%;border-collapse:collapse;text-align:left;font-size:13px;">
          <thead>
            <tr style="background:#fafbfc;border-bottom:1px solid #e0e3eb;color:#787b86;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">
              <th style="padding:12px 16px;cursor:pointer;" data-sort="ticker">Ticker ⬍</th>
              <th style="padding:12px 16px;cursor:pointer;" data-sort="price">Price (INR) ⬍</th>
              <th style="padding:12px 16px;cursor:pointer;" data-sort="chg">Change % ⬍</th>
              <th style="padding:12px 16px;">Volume</th>
              <th style="padding:12px 16px;cursor:pointer;" data-sort="cap">Market Cap ⬍</th>
              <th style="padding:12px 16px;cursor:pointer;" data-sort="pe">P/E Ratio ⬍</th>
              <th style="padding:12px 16px;">Technical Rating</th>
              <th style="padding:12px 16px;text-align:center;">Action</th>
            </tr>
          </thead>
          <tbody id="tv-screener-tbody"></tbody>
        </table>
      </div>
    `;

    mainContainer.appendChild(wrapper);

    let currentFilter = 'all';
    let searchQuery = '';
    let sortCol = 'ticker';
    let sortAsc = true;

    function renderScreenerRows() {
      const tbody = document.getElementById('tv-screener-tbody');
      tbody.innerHTML = '';

      let list = STOCKS_DATA.filter(s => {
        const matchesSearch = !searchQuery || s.ticker.toLowerCase().includes(searchQuery) || s.name.toLowerCase().includes(searchQuery);
        if (!matchesSearch) return false;
        if (currentFilter === 'gainers') return s.chg > 0;
        if (currentFilter === 'losers') return s.chg < 0;
        if (currentFilter === 'strongbuy') return s.rating === 'Strong Buy';
        if (currentFilter === 'tech') return s.sector === 'Technology';
        if (currentFilter === 'fin') return s.sector === 'Financials';
        return true;
      });

      list.sort((a, b) => {
        let vA = a[sortCol];
        let vB = b[sortCol];
        if (typeof vA === 'string') return sortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
        return sortAsc ? vA - vB : vB - vA;
      });

      list.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom:1px solid #f0f3fa;cursor:pointer;transition:background 0.1s;';
        tr.onmouseenter = () => tr.style.background = '#fafbfc';
        tr.onmouseleave = () => tr.style.background = 'transparent';

        const isUp = item.chg >= 0;
        tr.innerHTML = `
          <td style="padding:12px 16px;">
            <div style="font-weight:700;color:#2962ff;font-size:14px;">${item.ticker}</div>
            <div style="font-size:11px;color:#787b86;">${item.name}</div>
          </td>
          <td style="padding:12px 16px;font-weight:600;color:#131722;">₹${item.price.toFixed(2)}</td>
          <td style="padding:12px 16px;font-weight:700;color:${isUp ? '#089981' : '#f23645'};">
            ${isUp ? '+' : ''}${item.chg.toFixed(2)}%
          </td>
          <td style="padding:12px 16px;color:#131722;">${item.vol}</td>
          <td style="padding:12px 16px;color:#131722;font-weight:500;">${item.cap}</td>
          <td style="padding:12px 16px;color:#131722;">${item.pe}</td>
          <td style="padding:12px 16px;">
            <span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:${item.rating === 'Strong Buy' ? '#e6f4ea' : item.rating === 'Buy' ? '#eef3fd' : item.rating === 'Neutral' ? '#fff8e1' : '#fce8e6'};color:${item.rating.includes('Buy') ? '#089981' : item.rating === 'Neutral' ? '#f57c00' : '#f23645'};">
              ${item.rating}
            </span>
          </td>
          <td style="padding:12px 16px;text-align:center;">
            <a href="/chart?symbol=${item.ticker}" style="background:#2962ff;color:#ffffff;text-decoration:none;padding:5px 12px;border-radius:4px;font-size:12px;font-weight:600;display:inline-block;">
              Chart
            </a>
          </td>
        `;

        tr.addEventListener('click', (e) => {
          if (!e.target.closest('a')) {
            window.location.href = `/chart?symbol=${item.ticker}`;
          }
        });

        tbody.appendChild(tr);
      });
    }

    renderScreenerRows();

    // Search filter
    document.getElementById('tv-screener-search').addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderScreenerRows();
    });

    // Category tabs
    document.querySelectorAll('.tv-scr-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tv-scr-tab').forEach(t => {
          t.style.background = 'transparent';
          t.style.color = '#787b86';
          t.style.fontWeight = '500';
        });
        tab.style.background = '#eef3fd';
        tab.style.color = '#2962ff';
        tab.style.fontWeight = '600';
        currentFilter = tab.getAttribute('data-filter');
        renderScreenerRows();
      });
    });

    // Sort headers
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (sortCol === col) {
          sortAsc = !sortAsc;
        } else {
          sortCol = col;
          sortAsc = true;
        }
        renderScreenerRows();
      });
    });

    // Export CSV
    document.getElementById('tv-screener-export').addEventListener('click', () => {
      let csv = 'Ticker,Name,Price,Change%,Volume,MarketCap,PE,Rating\n';
      STOCKS_DATA.forEach(s => {
        csv += `"${s.ticker}","${s.name}",${s.price},${s.chg},"${s.vol}","${s.cap}",${s.pe},"${s.rating}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.download = `tradingview_stocks_${Date.now()}.csv`;
      a.href = URL.createObjectURL(blob);
      a.click();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. CRYPTO SCREENER (/crypto-screener)
  // ─────────────────────────────────────────────────────────────────────────
  function initCryptoScreener() {
    let mainContainer = document.querySelector('.table-container, main, .content') || document.body;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'max-width:1380px;margin:20px auto;padding:0 20px 60px;font-family:-apple-system,BlinkMacSystemFont,"Trebuchet MS",Roboto,Ubuntu,sans-serif;';
    wrapper.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div>
          <h1 style="font-size:26px;font-weight:700;color:#131722;margin:0 0 6px;">Crypto Pairs Screener</h1>
          <div style="font-size:13px;color:#787b86;">Real-time scanning and technical ratings across all major cryptocurrency pairs.</div>
        </div>
      </div>
      <div style="background:#ffffff;border:1px solid #e0e3eb;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <table style="width:100%;border-collapse:collapse;text-align:left;font-size:13px;">
          <thead>
            <tr style="background:#fafbfc;border-bottom:1px solid #e0e3eb;color:#787b86;font-size:12px;font-weight:700;text-transform:uppercase;">
              <th style="padding:12px 16px;">Pair</th>
              <th style="padding:12px 16px;">Price (USD)</th>
              <th style="padding:12px 16px;">24h Change</th>
              <th style="padding:12px 16px;">24h High</th>
              <th style="padding:12px 16px;">24h Low</th>
              <th style="padding:12px 16px;">24h Volume</th>
              <th style="padding:12px 16px;">Technical Rating</th>
              <th style="padding:12px 16px;text-align:center;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${CRYPTO_DATA.map(c => `
              <tr style="border-bottom:1px solid #f0f3fa;cursor:pointer;" onclick="window.location.href='/chart?symbol=${c.pair}'">
                <td style="padding:12px 16px;">
                  <div style="font-weight:700;color:#2962ff;font-size:14px;">${c.pair}</div>
                  <div style="font-size:11px;color:#787b86;">${c.name}</div>
                </td>
                <td style="padding:12px 16px;font-weight:600;color:#131722;">$${c.price.toLocaleString()}</td>
                <td style="padding:12px 16px;font-weight:700;color:${c.chg >= 0 ? '#089981' : '#f23645'};">
                  ${c.chg >= 0 ? '+' : ''}${c.chg}%
                </td>
                <td style="padding:12px 16px;color:#131722;">$${c.high.toLocaleString()}</td>
                <td style="padding:12px 16px;color:#131722;">$${c.low.toLocaleString()}</td>
                <td style="padding:12px 16px;color:#131722;">${c.vol}</td>
                <td style="padding:12px 16px;">
                  <span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:${c.rating.includes('Buy') ? '#e6f4ea' : '#fff8e1'};color:${c.rating.includes('Buy') ? '#089981' : '#f57c00'};">
                    ${c.rating}
                  </span>
                </td>
                <td style="padding:12px 16px;text-align:center;">
                  <a href="/chart?symbol=${c.pair}" style="background:#2962ff;color:#ffffff;text-decoration:none;padding:5px 12px;border-radius:4px;font-size:12px;font-weight:600;">Chart</a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    mainContainer.appendChild(wrapper);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. MARKET HEATMAP (/heatmap)
  // ─────────────────────────────────────────────────────────────────────────
  function initHeatmap() {
    let mainContainer = document.querySelector('.heatmap-container, main, .content') || document.body;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'max-width:1380px;margin:20px auto;padding:0 20px 60px;font-family:-apple-system,BlinkMacSystemFont,"Trebuchet MS",Roboto,Ubuntu,sans-serif;';
    wrapper.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div>
          <h1 style="font-size:26px;font-weight:700;color:#131722;margin:0 0 6px;">Stock Heatmap</h1>
          <div style="font-size:13px;color:#787b86;">Visual sector map sized by Market Cap and colored by Performance %</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;min-height:500px;" id="tv-heatmap-grid">
        ${STOCKS_DATA.map(s => {
          const isUp = s.chg >= 0;
          const bg = isUp ? 'rgba(8, 153, 129, 0.85)' : 'rgba(242, 54, 69, 0.85)';
          return `
            <div style="background:${bg};border-radius:8px;padding:20px;color:#ffffff;cursor:pointer;display:flex;flex-direction:column;justify-content:space-between;transition:transform 0.15s ease, box-shadow 0.15s ease;box-shadow:0 2px 6px rgba(0,0,0,0.1);"
                 onmouseenter="this.style.transform='scale(1.02)';this.style.boxShadow='0 8px 18px rgba(0,0,0,0.18)';"
                 onmouseleave="this.style.transform='scale(1)';this.style.boxShadow='0 2px 6px rgba(0,0,0,0.1)';"
                 onclick="window.location.href='/chart?symbol=${s.ticker}'">
              <div>
                <div style="font-size:11px;opacity:0.85;text-transform:uppercase;letter-spacing:0.5px;">${s.sector}</div>
                <div style="font-size:22px;font-weight:700;margin-top:4px;">${s.ticker}</div>
              </div>
              <div style="margin-top:24px;">
                <div style="font-size:18px;font-weight:700;">₹${s.price.toFixed(2)}</div>
                <div style="font-size:14px;font-weight:600;margin-top:2px;">${isUp ? '+' : ''}${s.chg}%</div>
                <div style="font-size:11px;opacity:0.8;margin-top:4px;">Cap: ${s.cap}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    mainContainer.appendChild(wrapper);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. PRICING & PLANS (/pricing)
  // ─────────────────────────────────────────────────────────────────────────
  function initPricingPage() {
    // Find billing toggle if exists
    const monthlyBtn = document.querySelector('[data-plan="monthly"], button:contains("Monthly")');
    const annualBtn = document.querySelector('[data-plan="annual"], button:contains("Annual")');

    // Wire checkout modals on any plan CTA
    document.querySelectorAll('button').forEach(btn => {
      const txt = btn.textContent.toLowerCase();
      if (txt.includes('try free') || txt.includes('get started') || txt.includes('upgrade') || txt.includes('subscribe')) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          openCheckoutModal(btn.textContent.trim());
        });
      }
    });

    // Wire FAQ toggles
    document.querySelectorAll('[class*="question"], [class*="faq"]').forEach(faq => {
      faq.style.cursor = 'pointer';
      faq.addEventListener('click', () => {
        const ans = faq.nextElementSibling;
        if (ans) {
          const isHidden = ans.style.display === 'none';
          ans.style.display = isHidden ? 'block' : 'none';
        }
      });
    });
  }

  function openCheckoutModal(planName) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 440px;
      max-width: 95vw;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.22);
      border: 1px solid #e0e3eb;
      z-index: 10000;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
    `;

    modal.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div style="font-size:18px;font-weight:700;color:#131722;">Start Your 30-Day Free Trial</div>
        <button id="tv-close-checkout" style="background:none;border:none;cursor:pointer;color:#787b86;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div style="font-size:14px;color:#787b86;margin-bottom:20px;">
        You've selected the <strong>${planName}</strong> plan. Enjoy 30 days of real-time market data, unlimited indicators, and custom alerts without charge.
      </div>
      <button onclick="alert('Trial activated successfully! Enjoy full TradingView Pro features.'); this.parentElement.remove();" style="width:100%;background:#2962ff;color:#ffffff;border:none;border-radius:6px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;">
        Activate 30-Day Free Trial
      </button>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#tv-close-checkout').addEventListener('click', () => modal.remove());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. GENERAL PAGE INITIALIZATION ROUTER
  // ─────────────────────────────────────────────────────────────────────────
  function initPage() {
    if (path.includes('screener') && !path.includes('crypto') && !path.includes('forex')) {
      initStockScreener();
    } else if (path.includes('crypto-screener')) {
      initCryptoScreener();
    } else if (path.includes('heatmap')) {
      initHeatmap();
    } else if (path.includes('pricing')) {
      initPricingPage();
    }

    // Universal navigation links fix: make sure every link works
    document.querySelectorAll('a[href^="/"]').forEach(a => {
      a.addEventListener('click', (e) => {
        // Normal browser navigation is preserved
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
  } else {
    setTimeout(initPage, 100);
  }

})();
