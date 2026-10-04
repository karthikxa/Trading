/**
 * Kronos & Laya AI TradingView Assistant
 * Left-Sidebar Flyout & Real-Time Current Graph Prediction & Analysis Engine
 */

(function () {
  'use strict';

  let currentHandles = 20;
  let isFlyoutOpen = false;
  let isLoading = false;
  let lastPrediction = null;
  let activeOverlayIds = [];

  // Determine currency based on symbol
  function getCurrency(symbol) {
    if (!symbol) return '$';
    const s = symbol.toUpperCase();
    if (s.includes('NIFTY') || s.includes('SENSEX') || s.includes('RELIANCE') ||
        s.includes('TCS') || s.includes('HDFC') || s.includes('INFY') ||
        s.includes('ICICI') || s.includes('SBIN') || s.includes('TATAMOTORS') ||
        s.includes('BHARTI') || s.includes('ITC') || s.includes('BAJFINANCE') ||
        s.includes('CE') || s.includes('PE')) {
      return '₹';
    }
    if (s.includes('EUR') || s.includes('GBP') || s.includes('JPY')) {
      return '';
    }
    return '$';
  }

  function formatMoney(num, currency = '$') {
    if (num == null || isNaN(num)) return `${currency}0.00`;
    const precision = Math.abs(num) < 10 ? 4 : 2;
    return `${currency}${Number(num).toLocaleString('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    })}`;
  }

  // Get active KlineCharts instance
  function getActiveChart() {
    if (window.__klinecharts_map && window.__klinecharts_map.size > 0) {
      const values = Array.from(window.__klinecharts_map.values());
      return values[values.length - 1];
    }
    return null;
  }

  // Detect current graph symbol and timeframe
  function getCurrentGraphInfo() {
    let ticker = 'US100';
    let tf = '1H';

    const chart = getActiveChart();
    if (chart) {
      if (typeof chart.getSymbol === 'function') {
        const s = chart.getSymbol();
        if (s && s.ticker) ticker = s.ticker;
      }
      if (typeof chart.getPeriod === 'function') {
        const p = chart.getPeriod();
        if (p && p.text) tf = p.text;
      }
    }

    const epicEl = document.querySelector('.toolbar .sym-epic');
    if (epicEl && epicEl.textContent && epicEl.textContent.trim()) {
      ticker = epicEl.textContent.trim();
    }

    const periodBtn = document.querySelector('.toolbar .periods button.on');
    if (periodBtn && periodBtn.textContent && periodBtn.textContent.trim()) {
      tf = periodBtn.textContent.trim();
    }

    return { ticker, tf, currency: getCurrency(ticker) };
  }

  // Inject AI Button in Left Toolbar (Below Magnet)
  function ensureAiToolbar() {
    const sidebar = document.querySelector('.draw-sidebar');
    if (!sidebar) return;

    if (sidebar.querySelector('.ai-prediction-family')) return;

    // Locate magnet container
    const magnetBtn = sidebar.querySelector('.magnet-toggle');
    const magnetFamily = magnetBtn ? magnetBtn.closest('.ds-family') : null;

    const family = document.createElement('div');
    family.className = 'ds-family ai-prediction-family';

    // Image 1 Icon: Magnifying Glass + 4-Point Sparkle Star
    const mainBtn = document.createElement('button');
    mainBtn.className = 'ds-btn ai-prediction-btn' + (isFlyoutOpen ? ' on' : '');
    mainBtn.setAttribute('aria-label', 'Kronos and Laya AI Predictions');
    mainBtn.title = 'Kronos & Laya AI Analysis (Alt+A)';
    mainBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M10.5 4 A 6.5 6.5 0 1 0 17 10.5 A 6.5 6.5 0 0 0 10.5 4" />
        <path d="M15.5 15.5 L20.5 20.5" stroke-width="2.5" />
        <path d="M19 1.5 C19 3.5 20 4.5 22 5 C20 5.5 19 6.5 19 8.5 C19 6.5 18 5.5 16 5 C18 4.5 19 3.5 19 1.5 Z" fill="currentColor" stroke="none" />
      </svg>
    `;

    // Caret button (Image 2 style)
    const caretBtn = document.createElement('button');
    caretBtn.className = 'ds-caret' + (isFlyoutOpen ? ' on' : '');
    caretBtn.setAttribute('aria-label', 'AI Prediction Options');
    caretBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
        <path d="m9 6 6 6-6 6"></path>
      </svg>
    `;

    mainBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleAiFlyout();
    });

    caretBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleAiFlyout();
    });

    family.appendChild(mainBtn);
    family.appendChild(caretBtn);

    if (magnetFamily && magnetFamily.nextSibling) {
      sidebar.insertBefore(family, magnetFamily.nextSibling);
    } else {
      sidebar.appendChild(family);
    }
  }

  // Toggle Left-Side Flyout
  function toggleAiFlyout() {
    isFlyoutOpen = !isFlyoutOpen;
    const family = document.querySelector('.ai-prediction-family');
    if (!family) return;

    const mainBtn = family.querySelector('.ai-prediction-btn');
    const caretBtn = family.querySelector('.ds-caret');
    if (mainBtn) mainBtn.classList.toggle('on', isFlyoutOpen);
    if (caretBtn) caretBtn.classList.toggle('on', isFlyoutOpen);

    let flyout = document.getElementById('tv-ai-flyout');
    if (isFlyoutOpen) {
      if (!flyout) {
        flyout = createAiFlyout();
        document.body.appendChild(flyout);
      }
      flyout.style.display = 'flex';
      positionFlyout(flyout, family);
      updateCurrentGraphHeader();
      analyzeCurrentGraph();
    } else {
      if (flyout) flyout.style.display = 'none';
    }
  }

  // Position flyout dynamically so it is NEVER clipped at top or bottom
  function positionFlyout(flyout, trigger) {
    const rect = trigger.getBoundingClientRect();
    const flyoutH = flyout.offsetHeight || 370;
    
    // Align with trigger button center
    let top = rect.top + rect.height / 2 - flyoutH / 2;
    const minTop = 52; // below top toolbar
    const maxTop = window.innerHeight - flyoutH - 12;
    top = Math.max(minTop, Math.min(top, maxTop));

    flyout.style.position = 'fixed';
    flyout.style.left = `${rect.right + 8}px`;
    flyout.style.top = `${top}px`;
  }

  // Create Flyout (No external stocks - Current Graph Alone)
  function createAiFlyout() {
    const flyout = document.createElement('div');
    flyout.id = 'tv-ai-flyout';
    flyout.className = 'ds-flyout ai-flyout';

    flyout.innerHTML = `
      <!-- Header -->
      <div class="ai-fly-section">
        <span>AI PREDICTIONS (KRONOS + LAYA)</span>
        <span class="ai-badge-live">CURRENT GRAPH</span>
      </div>

      <!-- Current Graph Alone Card -->
      <div class="ai-graph-info-card">
        <div class="ai-graph-symbol-row">
          <span class="ai-graph-symbol" id="ai-current-symbol">US100</span>
          <span class="ai-graph-tf" id="ai-current-tf">1H</span>
        </div>
        <div class="ai-graph-subtext">Forecasting active chart continuation</div>
      </div>

      <!-- Prediction Horizon / Candles to Predict -->
      <div class="ai-handles-strip">
        <div class="ai-handles-label">
          <span>CANDLES TO PREDICT</span>
          <span class="ai-handles-hint" id="ai-handles-hint">5 - 60 candles</span>
        </div>
        
        <!-- Input & Stepper Field -->
        <div class="ai-input-stepper-row">
          <button class="ai-step-btn" id="ai-step-dec" title="Decrease candle count">−</button>
          <input type="number" id="ai-candle-input" min="5" max="60" value="20" class="ai-candle-number-input" />
          <button class="ai-step-btn" id="ai-step-inc" title="Increase candle count">+</button>
        </div>

        <!-- Quick Preset Chips -->
        <div class="ai-handles-row" id="ai-handles-row">
          <button class="ai-handle-btn" data-handles="5">5</button>
          <button class="ai-handle-btn" data-handles="10">10</button>
          <button class="ai-handle-btn active" data-handles="20">20</button>
          <button class="ai-handle-btn" data-handles="30">30</button>
          <button class="ai-handle-btn" data-handles="50">50</button>
        </div>
      </div>

      <!-- Decision & Target Card -->
      <div class="ai-fly-card">
        <div class="ai-fly-decision-row">
          <div class="ai-fly-badge hold" id="ai-fly-badge">HOLD</div>
          <div class="ai-fly-conf" id="ai-fly-conf">--% Conf.</div>
        </div>
        
        <div class="ai-fly-target-row">
          <div class="ai-fly-target" id="ai-fly-target">--.--</div>
          <div class="ai-fly-ret pos" id="ai-fly-ret">+0.00%</div>
        </div>

        <div class="ai-fly-levels">
          <div class="ai-fly-level-item"><span>Entry:</span> <strong id="ai-fly-entry">--</strong></div>
          <div class="ai-fly-level-item"><span>SL:</span> <strong class="sl" id="ai-fly-sl">--</strong></div>
          <div class="ai-fly-level-item"><span>TP1:</span> <strong class="tp" id="ai-fly-tp1">--</strong></div>
          <div class="ai-fly-level-item"><span>R:R:</span> <strong id="ai-fly-rr">1:2.0</strong></div>
        </div>
      </div>

      <!-- Analyze Button -->
      <button class="ai-fly-btn-predict" id="ai-fly-predict-btn">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <span>⚡ Analyze</span>
      </button>
    `;

    // Handles Presets Event
    const handleBtns = flyout.querySelectorAll('.ai-handle-btn');
    const candleInput = flyout.querySelector('#ai-candle-input');

    handleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const h = parseInt(btn.getAttribute('data-handles') || '20', 10);
        currentHandles = h;
        if (candleInput) candleInput.value = h;
        analyzeCurrentGraph();
      });
    });

    // Input field change
    if (candleInput) {
      candleInput.addEventListener('change', (e) => {
        e.stopPropagation();
        let val = parseInt(candleInput.value, 10);
        if (isNaN(val) || val < 5) val = 5;
        if (val > 60) val = 60;
        candleInput.value = val;
        currentHandles = val;
        
        handleBtns.forEach(b => {
          b.classList.toggle('active', parseInt(b.getAttribute('data-handles'), 10) === val);
        });
        analyzeCurrentGraph();
      });
    }

    // Stepper Decrement
    const decBtn = flyout.querySelector('#ai-step-dec');
    if (decBtn) {
      decBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let val = parseInt(candleInput.value, 10) || 20;
        val = Math.max(5, val - 5);
        candleInput.value = val;
        currentHandles = val;
        handleBtns.forEach(b => {
          b.classList.toggle('active', parseInt(b.getAttribute('data-handles'), 10) === val);
        });
        analyzeCurrentGraph();
      });
    }

    // Stepper Increment
    const incBtn = flyout.querySelector('#ai-step-inc');
    if (incBtn) {
      incBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let val = parseInt(candleInput.value, 10) || 20;
        val = Math.min(60, val + 5);
        candleInput.value = val;
        currentHandles = val;
        handleBtns.forEach(b => {
          b.classList.toggle('active', parseInt(b.getAttribute('data-handles'), 10) === val);
        });
        analyzeCurrentGraph();
      });
    }

    // Analyze Button Event
    const predictBtn = flyout.querySelector('#ai-fly-predict-btn');
    if (predictBtn) {
      predictBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        analyzeCurrentGraph();
      });
    }

    flyout.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    return flyout;
  }

  // Update current graph display in flyout
  function updateCurrentGraphHeader() {
    const info = getCurrentGraphInfo();
    const symEl = document.getElementById('ai-current-symbol');
    const tfEl = document.getElementById('ai-current-tf');
    if (symEl) symEl.textContent = info.ticker;
    if (tfEl) tfEl.textContent = `${info.tf} • ACTIVE`;
  }

  // Run AI analysis on the current graph
  async function analyzeCurrentGraph() {
    if (isLoading) return;
    isLoading = true;

    const info = getCurrentGraphInfo();
    updateCurrentGraphHeader();

    const predictBtn = document.getElementById('ai-fly-predict-btn');
    if (predictBtn) {
      predictBtn.disabled = true;
      predictBtn.innerHTML = `<span>Analyzing ${currentHandles} Candles…</span>`;
    }

    try {
      // Pull actual candles from active chart if present
      const chart = getActiveChart();
      let candlePayload = null;
      if (chart && typeof chart.getDataList === 'function') {
        const rawBars = chart.getDataList() || [];
        const baseBars = rawBars.filter(b => !b._isAiForecast);
        if (baseBars.length >= 30) {
          candlePayload = baseBars.slice(-120).map(b => ({
            time: new Date(b.timestamp).toISOString(),
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
            volume: b.volume || 100
          }));
        }
      }

      const bodyData = {
        pair: info.ticker,
        timeframe: info.tf,
        pred_len: currentHandles,
        temperature: 0.8,
        top_p: 0.9
      };
      if (candlePayload) bodyData.candles = candlePayload;

      const resp = await fetch('/api/forecast_and_decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      lastPrediction = data;

      // 1. Update flyout metrics
      updateFlyoutUI(data, info.currency);

      // 2. Project directly on current graph!
      projectOnGraph(data.forecast_candles, data.metrics, data.trade_plan);

    } catch (err) {
      console.warn('[AI Assistant] Analysis failed:', err);
    } finally {
      isLoading = false;
      if (predictBtn) {
        predictBtn.disabled = false;
        predictBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <span>⚡ Analyze</span>
        `;
      }
    }
  }

  // Update Flyout Card with predictions
  function updateFlyoutUI(data, cur) {
    const decision = data.laya_decision || {};
    const metrics = data.metrics || {};
    const plan = data.trade_plan || {};

    const badge = document.getElementById('ai-fly-badge');
    if (badge) {
      const act = (decision.action || 'HOLD').toUpperCase();
      badge.textContent = act;
      badge.className = `ai-fly-badge ${act.toLowerCase()}`;
    }

    const conf = document.getElementById('ai-fly-conf');
    if (conf) {
      conf.textContent = `${decision.action_confidence_pct || 75}% Conf.`;
    }

    const target = document.getElementById('ai-fly-target');
    if (target) {
      target.textContent = formatMoney(metrics.forecast_close, cur);
    }

    const ret = document.getElementById('ai-fly-ret');
    if (ret) {
      const pct = metrics.forecast_return_pct || 0;
      ret.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
      ret.className = `ai-fly-ret ${pct >= 0 ? 'pos' : 'neg'}`;
    }

    const entryEl = document.getElementById('ai-fly-entry');
    const slEl = document.getElementById('ai-fly-sl');
    const tp1El = document.getElementById('ai-fly-tp1');
    const rrEl = document.getElementById('ai-fly-rr');

    if (entryEl) entryEl.textContent = formatMoney(plan.entry_price || metrics.last_close, cur);
    if (slEl) slEl.textContent = formatMoney(plan.stop_loss, cur);
    if (tp1El) tp1El.textContent = formatMoney(plan.take_profit_1, cur);
    if (rrEl) rrEl.textContent = plan.risk_reward_ratio ? `1:${plan.risk_reward_ratio.split(':')[1] || '2.0'}` : '1:2.0';
  }

  // Project Future Candles and Overlays on Current Graph
  function projectOnGraph(forecastCandles, metrics, tradePlan) {
    if (!forecastCandles || forecastCandles.length === 0) return;

    const chart = getActiveChart();
    if (!chart) return;

    const dataList = chart.getDataList() || [];
    if (dataList.length === 0) return;

    // Filter out previous forecast bars
    const baseBars = dataList.filter(b => !b._isAiForecast);
    const lastBar = baseBars[baseBars.length - 1];
    const stepMs = baseBars.length > 1 ? (lastBar.timestamp - baseBars[baseBars.length - 2].timestamp) : 3600000;

    // Append forecast candles into future
    const newBars = [...baseBars];
    forecastCandles.forEach((fc, idx) => {
      newBars.push({
        timestamp: lastBar.timestamp + stepMs * (idx + 1),
        open: fc.open,
        high: fc.high,
        low: fc.low,
        close: fc.close,
        volume: fc.volume || 100,
        _isAiForecast: true
      });
    });

    if (typeof chart._addData === 'function') {
      chart._addData(newBars, 'init');
    }

    // Clean old overlays
    if (activeOverlayIds.length > 0) {
      activeOverlayIds.forEach(id => {
        try { chart.removeOverlay(id); } catch (e) {}
      });
      activeOverlayIds = [];
    }

    // Add Target 1 Price Line Overlay
    if (tradePlan && tradePlan.take_profit_1) {
      try {
        const id1 = chart.createOverlay({
          name: 'priceLine',
          points: [{ value: tradePlan.take_profit_1 }],
          styles: {
            line: { style: 'dashed', color: '#26a69a', size: 1.5 },
            text: { content: `⚡ Target ₹${tradePlan.take_profit_1.toFixed(2)}` }
          }
        });
        if (id1) activeOverlayIds.push(id1);
      } catch (e) {}
    }

    // Add Stop Loss Price Line Overlay
    if (tradePlan && tradePlan.stop_loss) {
      try {
        const id2 = chart.createOverlay({
          name: 'priceLine',
          points: [{ value: tradePlan.stop_loss }],
          styles: {
            line: { style: 'dashed', color: '#ef5350', size: 1.5 },
            text: { content: `🛡️ Stop Loss ₹${tradePlan.stop_loss.toFixed(2)}` }
          }
        });
        if (id2) activeOverlayIds.push(id2);
      } catch (e) {}
    }
  }

  // Close flyout on click outside
  document.addEventListener('click', (e) => {
    if (!isFlyoutOpen) return;
    const family = document.querySelector('.ai-prediction-family');
    const flyout = document.getElementById('tv-ai-flyout');
    if (family && !family.contains(e.target) && flyout && !flyout.contains(e.target)) {
      toggleAiFlyout();
    }
  });

  // Hotkey listener: Alt+A
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.code === 'KeyA') {
      e.preventDefault();
      toggleAiFlyout();
    }
  });

  // Watch for sidebar mounting
  function init() {
    ensureAiToolbar();
    const obs = new MutationObserver(() => {
      ensureAiToolbar();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
