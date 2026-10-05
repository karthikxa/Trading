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
      const activeDom = document.querySelector('[k-line-chart-id]');
      if (activeDom) {
        const id = activeDom.getAttribute('k-line-chart-id');
        if (window.__klinecharts_map.has(id)) {
          return window.__klinecharts_map.get(id);
        }
      }
      const values = Array.from(window.__klinecharts_map.values());
      return values[values.length - 1];
    }
    if (window.chart && typeof window.chart.getDataList === 'function') {
      return window.chart;
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

  // Close Flyout
  function closeAiFlyout() {
    isFlyoutOpen = false;
    const family = document.querySelector('.ai-prediction-family');
    if (family) {
      const mainBtn = family.querySelector('.ai-prediction-btn');
      const caretBtn = family.querySelector('.ds-caret');
      if (mainBtn) mainBtn.classList.remove('on');
      if (caretBtn) caretBtn.classList.remove('on');
    }
    const flyout = document.getElementById('tv-ai-flyout');
    if (flyout) {
      flyout.style.display = 'none';
    }
  }

  // Toggle Left-Side Flyout
  function toggleAiFlyout() {
    if (isFlyoutOpen) {
      closeAiFlyout();
      return;
    }

    isFlyoutOpen = true;
    const family = document.querySelector('.ai-prediction-family');
    if (!family) return;

    const mainBtn = family.querySelector('.ai-prediction-btn');
    const caretBtn = family.querySelector('.ds-caret');
    if (mainBtn) mainBtn.classList.add('on');
    if (caretBtn) caretBtn.classList.add('on');

    let flyout = document.getElementById('tv-ai-flyout');
    if (!flyout) {
      flyout = createAiFlyout();
      document.body.appendChild(flyout);
    }
    flyout.style.display = 'flex';
    flyout.style.flexDirection = 'column';
    flyout.style.width = '330px';
    flyout.style.minWidth = '330px';
    flyout.style.maxWidth = '340px';
    positionFlyout(flyout, family);
    updateCurrentGraphHeader();
    // NOTE: Prediction on chart ONLY occurs when user explicitly clicks "Analyze"!
  }

  // Position flyout dynamically so it is NEVER clipped at top or bottom
  function positionFlyout(flyout, trigger) {
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const flyoutH = flyout.offsetHeight || 380;
    
    // Align with trigger button center
    let top = rect.top + rect.height / 2 - flyoutH / 2;
    const minTop = 54; // below top toolbar
    const maxTop = window.innerHeight - flyoutH - 12;
    top = Math.max(minTop, Math.min(top, maxTop));

    flyout.style.position = 'fixed';
    flyout.style.left = `${Math.max(52, rect.right + 8)}px`;
    flyout.style.top = `${top}px`;
    flyout.style.width = '330px';
    flyout.style.zIndex = '99999';
  }

  // Create Flyout (No external stocks - Current Graph Alone)
  function createAiFlyout() {
    const flyout = document.createElement('div');
    flyout.id = 'tv-ai-flyout';
    flyout.className = 'ds-flyout ai-flyout';

    flyout.innerHTML = `
      <!-- Header -->
      <div class="ai-fly-section">
        <span>AI Predictions</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="ai-badge-live">Active</span>
          <button class="ai-fly-close-btn" id="ai-fly-close-btn" title="Close" aria-label="Close">
            <svg viewBox="0 0 18 18" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3" y1="3" x2="15" y2="15"></line><line x1="15" y1="3" x2="3" y2="15"></line></svg>
          </button>
        </div>
      </div>

      <!-- Current Graph Alone Card -->
      <div class="ai-graph-info-card">
        <div class="ai-graph-symbol-row">
          <span class="ai-graph-symbol" id="ai-current-symbol">US100</span>
          <span class="ai-graph-tf" id="ai-current-tf">1H</span>
        </div>
        <div class="ai-graph-subtext">Active chart continuation forecast</div>
      </div>

      <!-- Prediction Horizon / Candles to Predict -->
      <div class="ai-handles-strip">
        <div class="ai-handles-label">
          <span>Candles to Predict</span>
          <span class="ai-handles-hint" id="ai-handles-hint">5 - 60</span>
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

      <!-- Actions Row -->
      <div class="ai-fly-actions-row">
        <button class="ai-fly-btn-clear" id="ai-fly-clear-btn" title="Remove prediction from graph">Clear</button>
        <button class="ai-fly-btn-predict" id="ai-fly-predict-btn">Analyze</button>
      </div>
      <div class="ai-fly-status-text" id="ai-fly-status">Click Analyze to project price forecast on chart</div>
    `;

    // Close button event
    const closeBtn = flyout.querySelector('#ai-fly-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeAiFlyout();
      });
    }

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
      });
    }

    // Clear Button Event
    const clearBtn = flyout.querySelector('#ai-fly-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearGraphPrediction();
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
      predictBtn.innerHTML = `<span>Analyzing…</span>`;
    }

    const statusEl = document.getElementById('ai-fly-status');
    if (statusEl) {
      statusEl.textContent = `Analyzing ${info.ticker} (${currentHandles} candles)…`;
      statusEl.style.color = 'var(--text-dim, #787b86)';
    }

    try {
      // Pull actual candles from active chart if present
      const chart = getActiveChart();
      let candlePayload = null;
      if (chart && typeof chart.getDataList === 'function') {
        const rawBars = chart.getDataList() || [];
        const baseBars = rawBars.filter(b => !b._isAiForecast);
        if (baseBars.length >= 30) {
          candlePayload = baseBars.slice(-120).map(b => {
            const ms = b.timestamp < 1e11 ? b.timestamp * 1000 : b.timestamp;
            return {
              time: new Date(ms).toISOString(),
              open: Number(b.open),
              high: Number(b.high),
              low: Number(b.low),
              close: Number(b.close),
              volume: Number(b.volume || 100)
            };
          });
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
      const statusEl = document.getElementById('ai-fly-status');
      if (statusEl) {
        statusEl.textContent = `Analysis failed: ${err.message || 'Check connection'}`;
        statusEl.style.color = '#ef5350';
      }
    } finally {
      isLoading = false;
      if (predictBtn) {
        predictBtn.disabled = false;
        predictBtn.innerHTML = `<span>Analyze</span>`;
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

  // Remove prediction forecast candles & overlays from graph
  function clearGraphPrediction() {
    const chart = getActiveChart();
    if (!chart) return;

    // Remove all AI prediction overlays
    try {
      chart.removeOverlay({ groupId: 'ai_prediction_overlays' });
    } catch (e) {}
    if (activeOverlayIds.length > 0) {
      activeOverlayIds.forEach(id => {
        try { chart.removeOverlay({ id: id }); } catch (e) {}
      });
      activeOverlayIds = [];
    }

    // Restore chart bars without _isAiForecast
    const dataList = chart.getDataList() || [];
    const baseBars = dataList.filter(b => !b._isAiForecast);
    if (baseBars.length > 0 && baseBars.length !== dataList.length) {
      const store = (typeof chart.getChartStore === 'function') ? chart.getChartStore() : chart._chartStore;
      if (store && typeof store._addData === 'function') {
        store._addData(baseBars, 'init');
      } else if (typeof chart._addData === 'function') {
        chart._addData(baseBars, 'init');
      }
      try {
        if (typeof chart.scrollToRealTime === 'function') {
          chart.scrollToRealTime();
        }
      } catch (e) {}
    }

    const statusEl = document.getElementById('ai-fly-status');
    if (statusEl) {
      statusEl.textContent = 'Projection cleared from graph';
      statusEl.style.color = '#787b86';
    }
  }

  // Project Future Candles and Overlays on Current Graph
  function projectOnGraph(forecastCandles, metrics, tradePlan) {
    if (!forecastCandles || forecastCandles.length === 0) {
      console.warn('[AI Assistant] No forecast candles to project');
      return;
    }

    const chart = getActiveChart();
    if (!chart) {
      console.warn('[AI Assistant] No active chart found for projection');
      return;
    }

    const dataList = chart.getDataList() || [];
    if (dataList.length === 0) {
      console.warn('[AI Assistant] Chart dataList is empty');
      return;
    }

    // Filter out previous forecast bars
    const baseBars = dataList.filter(b => !b._isAiForecast);
    const lastBar = baseBars[baseBars.length - 1];
    if (!lastBar) return;

    // Detect step interval between bars in milliseconds
    let stepMs = 3600000;
    if (baseBars.length > 1) {
      const diff = lastBar.timestamp - baseBars[baseBars.length - 2].timestamp;
      if (diff > 0) stepMs = diff;
    }

    // Build new bars array with appended forecast candles
    const newBars = [...baseBars];
    const forecastPoints = [
      {
        timestamp: lastBar.timestamp,
        close: Number(lastBar.close),
        high: Number(lastBar.high),
        low: Number(lastBar.low)
      }
    ];

    forecastCandles.forEach((fc, idx) => {
      const fTime = lastBar.timestamp + stepMs * (idx + 1);
      const bar = {
        timestamp: fTime,
        open: Number(fc.open),
        high: Number(fc.high),
        low: Number(fc.low),
        close: Number(fc.close),
        volume: Number(fc.volume || 100),
        _isAiForecast: true
      };
      newBars.push(bar);
      forecastPoints.push(bar);
    });

    // Clean old overlays first
    try {
      chart.removeOverlay({ groupId: 'ai_prediction_overlays' });
    } catch (e) {}
    if (activeOverlayIds.length > 0) {
      activeOverlayIds.forEach(id => {
        try { chart.removeOverlay({ id: id }); } catch (e) {}
      });
      activeOverlayIds = [];
    }

    // 1. Inject continuation candles into KlineCharts store
    const store = (typeof chart.getChartStore === 'function') ? chart.getChartStore() : chart._chartStore;
    if (store && typeof store._addData === 'function') {
      store._addData(newBars, 'init');
    } else if (typeof chart._addData === 'function') {
      chart._addData(newBars, 'init');
    }

    // Ensure chart scrolls and leaves comfortable right offset for forecast
    try {
      if (typeof chart.setOffsetRightDistance === 'function') {
        chart.setOffsetRightDistance(120);
      }
      if (typeof chart.scrollToDataIndex === 'function') {
        chart.scrollToDataIndex(newBars.length - 1, 300);
      } else if (typeof chart.scrollToRealTime === 'function') {
        chart.scrollToRealTime();
      }
      if (typeof chart.updatePane === 'function') {
        chart.updatePane(0, 'candle_pane');
      }
    } catch (e) {
      console.warn('[AI Assistant] Scroll/layout error:', e);
    }

    // Determine active theme colors for chart overlays (Black & White TradingView style)
    const isLight = document.documentElement.getAttribute('data-theme') === 'light' || document.body.getAttribute('data-theme') === 'light';
    const mainStroke = isLight ? '#131722' : '#f0f3fa';
    const corridorStroke = isLight ? 'rgba(19, 23, 34, 0.35)' : 'rgba(240, 243, 250, 0.35)';
    const tagBg = isLight ? '#ffffff' : '#131722';
    const tagBorder = isLight ? '#131722' : '#f0f3fa';
    const tagTextCol = isLight ? '#131722' : '#ffffff';

    // 2. Draw trajectory segments connecting candle closes
    for (let i = 0; i < forecastPoints.length - 1; i++) {
      const p1 = forecastPoints[i];
      const p2 = forecastPoints[i + 1];
      try {
        const segId = chart.createOverlay({
          name: 'segment',
          groupId: 'ai_prediction_overlays',
          paneId: 'candle_pane',
          points: [
            { timestamp: p1.timestamp, value: p1.close },
            { timestamp: p2.timestamp, value: p2.close }
          ],
          styles: {
            line: {
              style: 'solid',
              color: mainStroke,
              size: 2
            }
          }
        });
        if (segId) activeOverlayIds.push(segId);
      } catch (e) {}
    }

    // 3. Draw upper / lower projection corridor
    for (let i = 0; i < forecastPoints.length - 1; i++) {
      const p1 = forecastPoints[i];
      const p2 = forecastPoints[i + 1];
      try {
        const hId = chart.createOverlay({
          name: 'segment',
          groupId: 'ai_prediction_overlays',
          paneId: 'candle_pane',
          points: [
            { timestamp: p1.timestamp, value: p1.high },
            { timestamp: p2.timestamp, value: p2.high }
          ],
          styles: {
            line: {
              style: 'dashed',
              color: corridorStroke,
              size: 1.2,
              dashedValue: [3, 3]
            }
          }
        });
        if (hId) activeOverlayIds.push(hId);

        const lId = chart.createOverlay({
          name: 'segment',
          groupId: 'ai_prediction_overlays',
          paneId: 'candle_pane',
          points: [
            { timestamp: p1.timestamp, value: p1.low },
            { timestamp: p2.timestamp, value: p2.low }
          ],
          styles: {
            line: {
              style: 'dashed',
              color: corridorStroke,
              size: 1.2,
              dashedValue: [3, 3]
            }
          }
        });
        if (lId) activeOverlayIds.push(lId);
      } catch (e) {}
    }

    // 4. Target 1 Price Line
    if (tradePlan && tradePlan.take_profit_1) {
      try {
        const tp1 = Number(tradePlan.take_profit_1);
        const id1 = chart.createOverlay({
          name: 'priceLine',
          groupId: 'ai_prediction_overlays',
          paneId: 'candle_pane',
          points: [{ timestamp: lastBar.timestamp, value: tp1 }],
          styles: {
            line: { style: 'dashed', color: mainStroke, size: 1.2, dashedValue: [4, 4] },
            text: { color: isLight ? '#ffffff' : '#131722', backgroundColor: mainStroke, size: 11 }
          }
        });
        if (id1) activeOverlayIds.push(id1);
      } catch (e) {}
    }

    // 5. Target 2 Price Line
    if (tradePlan && tradePlan.take_profit_2) {
      try {
        const tp2 = Number(tradePlan.take_profit_2);
        const idTp2 = chart.createOverlay({
          name: 'priceLine',
          groupId: 'ai_prediction_overlays',
          paneId: 'candle_pane',
          points: [{ timestamp: lastBar.timestamp, value: tp2 }],
          styles: {
            line: { style: 'dashed', color: mainStroke, size: 1, dashedValue: [3, 3] },
            text: { color: isLight ? '#ffffff' : '#131722', backgroundColor: mainStroke, size: 11 }
          }
        });
        if (idTp2) activeOverlayIds.push(idTp2);
      } catch (e) {}
    }

    // 6. Stop Loss Price Line
    if (tradePlan && tradePlan.stop_loss) {
      try {
        const sl = Number(tradePlan.stop_loss);
        const id2 = chart.createOverlay({
          name: 'priceLine',
          groupId: 'ai_prediction_overlays',
          paneId: 'candle_pane',
          points: [{ timestamp: lastBar.timestamp, value: sl }],
          styles: {
            line: { style: 'dashed', color: '#787b86', size: 1.2, dashedValue: [4, 4] },
            text: { color: '#ffffff', backgroundColor: '#787b86', size: 11 }
          }
        });
        if (id2) activeOverlayIds.push(id2);
      } catch (e) {}
    }

    // 7. Simple Annotation Tag on final candle
    const finalPoint = forecastPoints[forecastPoints.length - 1];
    if (finalPoint) {
      try {
        const retPct = (metrics && metrics.forecast_return_pct != null) ? metrics.forecast_return_pct : 0;
        const sign = retPct >= 0 ? '+' : '';
        const tagText = `Target ${sign}${retPct.toFixed(2)}%`;
        const tagId = chart.createOverlay({
          name: 'simpleAnnotation',
          groupId: 'ai_prediction_overlays',
          paneId: 'candle_pane',
          points: [{ timestamp: finalPoint.timestamp, value: finalPoint.close }],
          extendData: tagText,
          styles: {
            line: { style: 'dashed', color: mainStroke },
            rect: { color: tagBg, borderColor: tagBorder },
            text: { color: tagTextCol, size: 11 }
          }
        });
        if (tagId) activeOverlayIds.push(tagId);
      } catch (e) {}
    }

    const statusEl = document.getElementById('ai-fly-status');
    if (statusEl) {
      statusEl.textContent = `Forecast projected (${forecastCandles.length} candles)`;
      statusEl.style.color = 'var(--text-dim, #787b86)';
    }
  }

  // Close flyout on click outside
  document.addEventListener('click', (e) => {
    if (!isFlyoutOpen) return;
    const family = document.querySelector('.ai-prediction-family');
    const flyout = document.getElementById('tv-ai-flyout');
    if (family && !family.contains(e.target) && flyout && !flyout.contains(e.target)) {
      closeAiFlyout();
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
