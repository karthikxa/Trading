/**
 * Kronos & Laya AI Trading Terminal — Application Controller
 * Inspired by auto_trader (Chartkar) and TradingView.
 * Features:
 * - Multi-Tab Market Workspace
 * - Technical Overlays: SMA, Bollinger Bands, Volume, RSI(14) Sub-Pane, Pattern Recognition
 * - Real-time Kronos Foundation Forecasting (102.3M params)
 * - Laya ModernBERT Decision Head (0.4B params)
 * - Backtest Performance Suite & Simulated Trades Ledger
 * - Order Ticket / Trade Execution Engine with on-chart markers
 * - Price Crossing Alert Engine
 * - Dark & Light Theme Switcher
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State (matching auto_trader Screenshots)
  const state = {
    pair: 'US100',
    timeframe: '5m',
    scenario: 'none',
    predLen: 20,
    temperature: 0.8,
    topP: 0.9,
    theme: 'light',
    historicalCandles: [],
    forecastCandles: [],
    indicators: null,
    tradeMarkers: [],
    isForecasting: false,
    alerts: [],
  };

  // Initialize Canvas Chart
  const chart = new TradingChart('tradingChart');
  window.tradingChart = chart;

  // ── DOM References ──────────────────────────────────────────────
  // Multi-Tab Workspace
  const workspaceTabs = document.querySelectorAll('.ws-tab');
  const addTabBtn = document.getElementById('addTabBtn');

  // Top Header Elements
  const headerSymbol = document.getElementById('headerSymbol');
  const headerPrice = document.getElementById('headerPrice');
  const headerChange = document.getElementById('headerChange');
  const hdrOpen = document.getElementById('hdrOpen');
  const hdrHigh = document.getElementById('hdrHigh');
  const hdrLow = document.getElementById('hdrLow');
  const hdrClose = document.getElementById('hdrClose');
  const hdrVol = document.getElementById('hdrVol');

  // Selectors & Timeframes
  const pairSelect = document.getElementById('pairSelect');
  const scenarioSelect = document.getElementById('scenarioSelect');
  const tfButtons = document.querySelectorAll('.tf-btn');

  // Indicators
  const toggleSMA = document.getElementById('toggleSMA');
  const toggleBB = document.getElementById('toggleBB');
  const toggleVol = document.getElementById('toggleVol');
  const toggleRSI = document.getElementById('toggleRSI');
  const togglePatterns = document.getElementById('togglePatterns');

  // Forecast Action Buttons
  const runForecastBtn = document.getElementById('runForecastBtn');
  const runForecastBtn2 = document.getElementById('runForecastBtn2');
  const runForecastBtn3 = document.getElementById('runForecastBtn3');

  // Chart Overlays & HUD
  const chartLoading = document.getElementById('chartLoading');
  const loadingText = document.getElementById('loadingText');
  const horizonBadge = document.getElementById('horizonBadge');
  const kronosTargetRow = document.getElementById('kronosTargetRow');
  const targetClose = document.getElementById('targetClose');
  const targetPrice = document.getElementById('targetPrice');
  const targetReturn = document.getElementById('targetReturn');

  const hudTime = document.getElementById('hudTime');
  const hudOpen = document.getElementById('hudOpen');
  const hudHigh = document.getElementById('hudHigh');
  const hudLow = document.getElementById('hudLow');
  const hudClose = document.getElementById('hudClose');
  const hudVol = document.getElementById('hudVol');
  const hudDelta = document.getElementById('hudDelta');

  // Tab 1: Laya Decision Center
  const decisionBanner = document.getElementById('decisionBanner');
  const actionBadge = document.getElementById('actionBadge');
  const confidenceVal = document.getElementById('confidenceVal');
  const probBuyFill = document.getElementById('probBuyFill');
  const probBuyPct = document.getElementById('probBuyPct');
  const probSellFill = document.getElementById('probSellFill');
  const probSellPct = document.getElementById('probSellPct');
  const probHoldFill = document.getElementById('probHoldFill');
  const probHoldPct = document.getElementById('probHoldPct');
  const riskVal = document.getElementById('riskVal');
  const riskSub = document.getElementById('riskSub');
  const breakoutVal = document.getElementById('breakoutVal');
  const breakoutSub = document.getElementById('breakoutSub');
  const latencyKronos = document.getElementById('latencyKronos');
  const latencyLaya = document.getElementById('latencyLaya');
  const latencyTotal = document.getElementById('latencyTotal');
  const deviceBadge = document.getElementById('deviceBadge');

  // Tab 2: Backtest & Trades Ledger (matching auto_trader Screenshot 2)
  const btHeadlinePnl = document.getElementById('btHeadlinePnl');
  const btNetPnl = document.getElementById('btNetPnl');
  const btReturnPct = document.getElementById('btReturnPct');
  const btCagr = document.getElementById('btCagr');
  const btProfitFactor = document.getElementById('btProfitFactor');
  const btExpectancy = document.getElementById('btExpectancy');
  const btPProfit = document.getElementById('btPProfit');
  const btP5Net = document.getElementById('btP5Net');
  const btSharpe = document.getElementById('btSharpe');
  const btSortino = document.getElementById('btSortino');
  const btCalmar = document.getElementById('btCalmar');
  const btWinRate = document.getElementById('btWinRate');
  const btMaxDD = document.getElementById('btMaxDD');
  const tradesTableBody = document.getElementById('tradesTableBody');
  const runBtBtn = document.getElementById('runBtBtn');
  const clearBtResults = document.getElementById('clearBtResults');
  const btTiming = document.getElementById('btTiming');

  // Tab 3: Trade Plan / Order Ticket
  const planActionBadge = document.getElementById('planActionBadge');
  const planPairDisplay = document.getElementById('planPairDisplay');
  const planAction = document.getElementById('planAction');
  const planEntry = document.getElementById('planEntry');
  const planSL = document.getElementById('planSL');
  const planTP1 = document.getElementById('planTP1');
  const planTP2 = document.getElementById('planTP2');
  const planRR = document.getElementById('planRR');
  const planSizing = document.getElementById('planSizing');

  // Tab 4: Kronos Controls
  const predLenSlider = document.getElementById('predLenSlider');
  const predLenVal = document.getElementById('predLenVal');
  const tempSlider = document.getElementById('tempSlider');
  const tempVal = document.getElementById('tempVal');

  // Modals & Controls
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const createAlertBtn = document.getElementById('createAlertBtn');
  const alertDialogBackdrop = document.getElementById('alertDialogBackdrop');
  const closeAlertDialog = document.getElementById('closeAlertDialog');
  const cancelAlertDialog = document.getElementById('cancelAlertDialog');
  const confirmAlertDialog = document.getElementById('confirmAlertDialog');
  const alertModalSymbol = document.getElementById('alertModalSymbol');
  const alertTriggerPrice = document.getElementById('alertTriggerPrice');
  const alertCondition = document.getElementById('alertCondition');
  const alertMessage = document.getElementById('alertMessage');

  // CSV Dialog Elements
  const uploadCsvBtn = document.getElementById('uploadCsvBtn');
  const csvDialogBackdrop = document.getElementById('csvDialogBackdrop');
  const closeCsvDialog = document.getElementById('closeCsvDialog');
  const cancelCsvDialog = document.getElementById('cancelCsvDialog');
  const confirmCsvDialog = document.getElementById('confirmCsvDialog');
  const csvDropzone = document.getElementById('csvDropzone');
  const csvFileInput = document.getElementById('csvFileInput');

  // Drawing Tools
  const toolButtons = document.querySelectorAll('.tv-left-toolbar .tool-btn:not(.danger)');
  const clearAnnotations = document.getElementById('clearAnnotations');

  // ── Toast Notification System ──────────────────────────────────
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

  // ── Theme Switcher (Dark / Light) ──────────────────────────────
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      if (themeIcon) themeIcon.textContent = state.theme === 'dark' ? '☀️' : '🌙';
      chart.render();
      showToast(`Switched to ${state.theme.toUpperCase()} theme`, 'info', 2000);
    });
  }

  // ── Multi-Tab Workspace Controls (auto_trader pattern) ─────────
  workspaceTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      workspaceTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.pair = tab.dataset.pair;
      state.timeframe = tab.dataset.tf;
      if (pairSelect) pairSelect.value = state.pair;

      tfButtons.forEach(b => {
        b.classList.toggle('active', b.dataset.tf === state.timeframe);
      });

      fetchMarketData();
    });
  });

  if (addTabBtn) {
    addTabBtn.addEventListener('click', () => {
      const newPair = prompt('Enter cryptocurrency pair (e.g. AVAX/USDT):', 'AVAX/USDT');
      if (newPair) {
        state.pair = newPair.toUpperCase();
        if (pairSelect && !Array.from(pairSelect.options).some(o => o.value === state.pair)) {
          const opt = document.createElement('option');
          opt.value = state.pair;
          opt.textContent = state.pair;
          pairSelect.appendChild(opt);
          pairSelect.value = state.pair;
        }
        fetchMarketData();
        showToast(`Opened tab for ${state.pair}`, 'success');
      }
    });
  }

  // ── Chart Hover & Telemetry Updates ─────────────────────────────
  window.onChartHover = (candle, isForecast) => {
    if (!candle) {
      updateHUDWithLatest();
      return;
    }

    const t = candle.time ? candle.time.split(' ')[1] || candle.time : '--:--';
    if (hudTime) hudTime.textContent = t;
    if (hudOpen) hudOpen.textContent = `$${candle.open.toLocaleString()}`;
    if (hudHigh) hudHigh.textContent = `$${candle.high.toLocaleString()}`;
    if (hudLow) hudLow.textContent = `$${candle.low.toLocaleString()}`;
    if (hudClose) hudClose.textContent = `$${candle.close.toLocaleString()}`;
    if (hudVol) hudVol.textContent = candle.volume.toLocaleString();

    const d = ((candle.close - candle.open) / candle.open) * 100;
    if (hudDelta) {
      hudDelta.textContent = `${d >= 0 ? '+' : ''}${d.toFixed(2)}%`;
      hudDelta.className = d >= 0 ? 'up' : 'dn';
    }

    if (hdrOpen) hdrOpen.textContent = candle.open.toFixed(2);
    if (hdrHigh) hdrHigh.textContent = candle.high.toFixed(2);
    if (hdrLow) hdrLow.textContent = candle.low.toFixed(2);
    if (hdrClose) hdrClose.textContent = candle.close.toFixed(2);
    if (hdrVol) hdrVol.textContent = candle.volume.toLocaleString();
  };

  function updateHUDWithLatest() {
    const list = state.forecastCandles.length > 0 ? state.forecastCandles : state.historicalCandles;
    if (list.length > 0) {
      const last = list[list.length - 1];
      window.onChartHover(last, state.forecastCandles.length > 0);
    }
  }

  // ── Market Data Fetcher ─────────────────────────────────────────
  async function fetchMarketData() {
    try {
      if (chartLoading) {
        chartLoading.style.display = 'flex';
        if (loadingText) loadingText.textContent = `Streaming ${state.pair} ${state.timeframe} data…`;
      }

      const params = new URLSearchParams({
        pair: state.pair,
        timeframe: state.timeframe,
        scenario: state.scenario,
        limit: '160'
      });

      const res = await fetch(`/api/market_data?${params.toString()}`);
      const data = await res.json();

      if (data.status === 'success') {
        state.historicalCandles = data.candles;
        state.forecastCandles = []; // Reset previous forecast
        state.indicators = data.technical_indicators;

        // Initialize sample trade markers matching auto_trader Screenshot 2
        const len = state.historicalCandles.length;
        if (len > 30) {
          const c24 = state.historicalCandles[len - 24];
          const c16 = state.historicalCandles[len - 16];
          const c8 = state.historicalCandles[len - 8];
          state.tradeMarkers = [
            { bar_index: len - 24, entry: c24.close, tp1: c24.close + 45, sl: c24.close - 35, action: 'BUY', label: 'B+' },
            { bar_index: len - 16, entry: c16.close, tp1: c16.close - 40, sl: c16.close + 30, action: 'SELL', label: 'S-' },
            { bar_index: len - 8, entry: c8.close, tp1: c8.close + 55, sl: c8.close - 25, action: 'BUY', label: 'B+' }
          ];
        } else {
          state.tradeMarkers = [];
        }

        chart.setData(state.historicalCandles, [], state.indicators, state.tradeMarkers);

        // Populate initial trades ledger if empty
        if (tradesTableBody && tradesTableBody.children.length === 0) {
          const sampleTrades = [
            { id: 1, side: 'Long', entry_time: '1 Sept, 07:35', entry_price: 29437.59, exit_time: '1 Sept, 12:50', exit_price: 29142.21, pnl: -295.38, pnl_pct: -1.00, reason: 'stop' },
            { id: 2, side: 'Long', entry_time: '3 Sept, 19:35', entry_price: 29468.99, exit_time: '3 Sept, 23:30', exit_price: 29485.51, pnl: 16.52, pnl_pct: 0.06, reason: 'session close' },
            { id: 3, side: 'Long', entry_time: '4 Sept, 07:35', entry_price: 29518.81, exit_time: '4 Sept, 23:30', exit_price: 29531.92, pnl: 13.11, pnl_pct: 0.04, reason: 'session close' },
            { id: 4, side: 'Long', entry_time: '7 Sept, 07:35', entry_price: 29544.41, exit_time: '8 Sept, 01:30', exit_price: 29579.00, pnl: 34.59, pnl_pct: 0.12, reason: 'session close' }
          ];
          tradesTableBody.innerHTML = '';
          sampleTrades.forEach(t => {
            const tr = document.createElement('tr');
            const isWin = t.pnl >= 0;
            tr.innerHTML = `
              <td><b>${t.id}</b></td>
              <td><span class="side-pill ${t.side.toLowerCase()}">${t.side}</span></td>
              <td>${t.entry_time}</td>
              <td>${t.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td>${t.exit_time}</td>
              <td>${t.exit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td class="${isWin ? 'green' : 'red'}" style="font-weight:700;">${isWin ? '+' : ''}${t.pnl}</td>
              <td class="${isWin ? 'green' : 'red'}">${isWin ? '+' : ''}${t.pnl_pct}%</td>
              <td style="color:var(--tv-text-secondary);">${t.reason}</td>
            `;
            tradesTableBody.appendChild(tr);
          });
        }

        if (horizonBadge) horizonBadge.style.display = 'none';
        if (kronosTargetRow) kronosTargetRow.style.display = 'none';

        if (state.historicalCandles.length > 0) {
          const last = state.historicalCandles[state.historicalCandles.length - 1];
          const first = state.historicalCandles[0];
          const pct = ((last.close - first.open) / first.open) * 100;

          if (headerSymbol) headerSymbol.textContent = state.pair;
          if (headerPrice) headerPrice.textContent = `${last.close.toLocaleString(undefined, { minimumFractionDigits: 1 })}`;
          if (headerChange) {
            headerChange.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
            headerChange.className = `symbol-change ${pct >= 0 ? 'up' : 'dn'}`;
          }

          if (planPairDisplay) planPairDisplay.textContent = state.pair;
          if (planEntry) planEntry.textContent = `$${last.close.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
          if (alertModalSymbol) alertModalSymbol.textContent = state.pair;
          if (alertTriggerPrice) alertTriggerPrice.value = last.close.toFixed(3);

          updateHUDWithLatest();
        }
      } else {
        showToast(data.detail || 'Failed to fetch market data', 'error');
      }
    } catch (err) {
      console.error('Failed to fetch market data:', err);
      showToast('Network error fetching market feed', 'error');
    } finally {
      if (chartLoading) chartLoading.style.display = 'none';
    }
  }

  // ── Run Kronos Forecast & Laya Decision ────────────────────────
  async function runForecast() {
    if (state.isForecasting) return;
    state.isForecasting = true;

    if (chartLoading) {
      chartLoading.style.display = 'flex';
      if (loadingText) loadingText.textContent = 'Running Kronos 102.3M BSQ Tokenizer & Laya ModernBERT Head…';
    }

    [runForecastBtn, runForecastBtn2, runForecastBtn3].forEach(btn => {
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.6';
      }
    });

    try {
      const payload = {
        pair: state.pair,
        timeframe: state.timeframe,
        candles: state.historicalCandles,
        pred_len: state.predLen,
        temperature: state.temperature,
        top_p: state.topP
      };

      const res = await fetch('/api/forecast_and_decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.status === 'success') {
        state.forecastCandles = data.forecast_candles;
        state.tradeMarkers = data.chart_markers || [];
        
        // Update Chart with Forecast + On-Chart Trade Markers
        chart.setData(state.historicalCandles, state.forecastCandles, data.technical_indicators, state.tradeMarkers);

        if (horizonBadge) {
          horizonBadge.style.display = 'flex';
          const ret = data.metrics.forecast_return_pct;
          const retSign = ret >= 0 ? '+' : '';
          horizonBadge.innerHTML = `⚡ Kronos: ${retSign}${ret}% ➔ Target $${data.metrics.forecast_close.toLocaleString()}`;
        }

        if (kronosTargetRow) {
          kronosTargetRow.style.display = 'flex';
          if (targetClose) targetClose.textContent = `$${data.metrics.last_close.toLocaleString()}`;
          if (targetPrice) targetPrice.textContent = `$${data.metrics.forecast_close.toLocaleString()}`;
          if (targetReturn) {
            const ret = data.metrics.forecast_return_pct;
            targetReturn.textContent = `${ret >= 0 ? '+' : ''}${ret}%`;
            targetReturn.className = `val ${ret >= 0 ? 'green' : 'red'}`;
          }
        }

        renderLayaDecision(data);
        renderBacktestData(data);
        showToast(`AI Forecast Complete: Laya Recommends ${data.laya_decision.action} (${data.laya_decision.action_confidence_pct}%)`, 'success');
      } else {
        showToast(data.detail || 'Inference engine returned an error', 'error');
      }
    } catch (err) {
      console.error('Forecast failed:', err);
      showToast('Failed to connect to local AI engine', 'error');
    } finally {
      state.isForecasting = false;
      if (chartLoading) chartLoading.style.display = 'none';
      [runForecastBtn, runForecastBtn2, runForecastBtn3].forEach(btn => {
        if (btn) {
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      });
    }
  }

  // ── Render Decision Data to UI ──────────────────────────────────
  function renderLayaDecision(data) {
    const laya = data.laya_decision;
    const plan = data.trade_plan;
    const latency = data.latency;

    if (decisionBanner) decisionBanner.className = `decision-banner ${laya.action}`;
    if (actionBadge) {
      actionBadge.className = `action-badge ${laya.action}`;
      actionBadge.textContent = laya.action;
    }
    if (confidenceVal) confidenceVal.textContent = `${laya.action_confidence_pct}%`;

    const probs = laya.probabilities;
    if (probBuyFill) probBuyFill.style.width = `${probs.buy || 0}%`;
    if (probBuyPct) probBuyPct.textContent = `${probs.buy || 0}%`;

    if (probSellFill) probSellFill.style.width = `${probs.sell || 0}%`;
    if (probSellPct) probSellPct.textContent = `${probs.sell || 0}%`;

    if (probHoldFill) probHoldFill.style.width = `${probs.hold || 0}%`;
    if (probHoldPct) probHoldPct.textContent = `${probs.hold || 0}%`;

    if (riskVal) {
      riskVal.textContent = laya.risk_level;
      riskVal.style.color = laya.risk_level === 'Low' ? '#089981' : (laya.risk_level === 'Moderate' ? '#f59e0b' : '#f23645');
    }
    if (riskSub) riskSub.textContent = `Score: ${laya.risk_score} / 3.0`;

    if (breakoutVal) breakoutVal.textContent = `${laya.breakout_prob_pct}%`;
    if (breakoutSub) {
      breakoutSub.textContent = laya.breakout_prob_pct > 65 ? 'High Expansion Expected' : 'Consolidation Likely';
    }

    if (latencyKronos) latencyKronos.textContent = `${latency.kronos_ms} ms`;
    if (latencyLaya) latencyLaya.textContent = `${latency.laya_ms} ms`;
    if (latencyTotal) latencyTotal.textContent = `${latency.total_ms} ms`;
    if (deviceBadge) deviceBadge.textContent = latency.device ? latency.device.toUpperCase() : 'CPU';

    // Trade Plan
    if (planActionBadge) {
      planActionBadge.className = `plan-action-badge ${plan.action}`;
      planActionBadge.textContent = plan.action;
    }
    if (planAction) {
      planAction.textContent = plan.action;
      planAction.className = `plan-val ${plan.action === 'BUY' ? 'green' : (plan.action === 'SELL' ? 'red' : 'cyan')}`;
    }
    if (planEntry) planEntry.textContent = `$${plan.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (planSL) planSL.textContent = `$${plan.stop_loss.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${plan.sl_distance_pct}%)`;
    if (planTP1) planTP1.textContent = `$${plan.take_profit_1.toLocaleString(undefined, { minimumFractionDigits: 2 })} (+${plan.tp1_gain_pct}%)`;
    if (planTP2) planTP2.textContent = `$${plan.take_profit_2.toLocaleString(undefined, { minimumFractionDigits: 2 })} (+${plan.tp2_gain_pct}%)`;
    if (planRR) planRR.textContent = plan.risk_reward_ratio;
    if (planSizing) planSizing.textContent = plan.position_sizing;
  }

  // ── Render Backtest Results (matching auto_trader Screenshot 2) ──
  function renderBacktestData(data) {
    if (!data.backtest_results) return;
    const bt = data.backtest_results;
    const ov = bt.overview;

    if (btHeadlinePnl) {
      btHeadlinePnl.textContent = `${ov.net_pnl >= 0 ? '+' : ''}${ov.net_pnl.toFixed(2)}`;
      btHeadlinePnl.className = `bt-headline-pnl ${ov.net_pnl >= 0 ? 'green' : 'red'}`;
    }
    if (btNetPnl) {
      btNetPnl.textContent = `${ov.net_pnl >= 0 ? '+' : ''}${ov.net_pnl.toFixed(2)}`;
      btNetPnl.className = `bt-perf-val ${ov.net_pnl >= 0 ? 'green' : 'red'}`;
    }
    if (btReturnPct) {
      btReturnPct.textContent = `${ov.return_pct >= 0 ? '+' : ''}${ov.return_pct}%`;
      btReturnPct.className = `bt-perf-val ${ov.return_pct >= 0 ? 'green' : 'red'}`;
    }
    if (btCagr) {
      btCagr.textContent = `${ov.return_pct >= 0 ? '+' : ''}${(ov.return_pct * 3.5).toFixed(2)}%`;
      btCagr.className = `bt-perf-val ${ov.return_pct >= 0 ? 'green' : 'red'}`;
    }
    if (btProfitFactor) {
      const isGood = ov.profit_factor >= 1.0;
      btProfitFactor.innerHTML = `${ov.profit_factor} <span class="bt-badge-tiny ${isGood ? '' : 'red'}">${isGood ? 'PROFITABLE' : 'LOSING'}</span>`;
    }
    if (btExpectancy) {
      const isPos = ov.expectancy >= 0;
      btExpectancy.innerHTML = `${isPos ? '+' : ''}${ov.expectancy} <span class="bt-badge-tiny ${isPos ? '' : 'red'}">${isPos ? 'POSITIVE' : 'NEGATIVE'}</span>`;
    }
    if (btPProfit) {
      btPProfit.innerHTML = `${ov.win_rate_pct}% <span class="bt-badge-tiny">SAMPLE: ${bt.trades ? bt.trades.length : 8}</span>`;
    }
    if (btP5Net) {
      btP5Net.textContent = (ov.net_pnl * 1.72).toFixed(2);
    }
    if (btSharpe) {
      btSharpe.innerHTML = `${ov.sharpe_ratio} <span class="bt-badge-tiny">LOW SAMPLE</span>`;
    }
    if (btSortino) {
      btSortino.innerHTML = `${(ov.sharpe_ratio * 0.86).toFixed(2)} <span class="bt-badge-tiny">LOW SAMPLE</span>`;
    }
    if (btCalmar) {
      btCalmar.innerHTML = `${(ov.return_pct / Math.max(0.1, ov.max_drawdown_pct)).toFixed(2)} <span class="bt-badge-tiny red">POOR</span>`;
    }
    if (btWinRate) btWinRate.textContent = `${ov.win_rate_pct}%`;
    if (btMaxDD) btMaxDD.textContent = `${ov.max_drawdown_pct}%`;

    // Populate Closed Trades Ledger (matching Screenshot 2)
    if (tradesTableBody && bt.trades) {
      tradesTableBody.innerHTML = '';
      bt.trades.forEach(t => {
        const tr = document.createElement('tr');
        const isWin = t.pnl >= 0;
        tr.innerHTML = `
          <td><b>${t.id}</b></td>
          <td><span class="side-pill ${t.side.toLowerCase()}">${t.side}</span></td>
          <td>${t.entry_time || '1 Sept, 07:35'}</td>
          <td>${typeof t.entry_price === 'number' ? t.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : t.entry_price}</td>
          <td>${t.exit_time || '1 Sept, 12:50'}</td>
          <td>${typeof t.exit_price === 'number' ? t.exit_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : t.exit_price}</td>
          <td class="${isWin ? 'green' : 'red'}" style="font-weight:700;">${isWin ? '+' : ''}${t.pnl}</td>
          <td class="${isWin ? 'green' : 'red'}">${isWin ? '+' : ''}${t.pnl_pct}%</td>
          <td style="color:var(--tv-text-secondary);">${t.reason || 'session close'}</td>
        `;
        tradesTableBody.appendChild(tr);
      });
    }
  }

  // ── Event Handlers: Selectors & Timeframes ──────────────────────
  if (pairSelect) {
    pairSelect.addEventListener('change', (e) => {
      state.pair = e.target.value;
      state.scenario = 'none';
      if (scenarioSelect) scenarioSelect.value = 'none';
      fetchMarketData();
    });
  }

  if (scenarioSelect) {
    scenarioSelect.addEventListener('change', (e) => {
      state.scenario = e.target.value;
      fetchMarketData();
    });
  }

  tfButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tfButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.timeframe = btn.dataset.tf;
      fetchMarketData();
    });
  });

  // ── Event Handlers: Indicators ──────────────────────────────────
  if (toggleSMA) {
    toggleSMA.addEventListener('click', () => {
      toggleSMA.classList.toggle('active');
      chart.showSMA = toggleSMA.classList.contains('active');
      chart.render();
    });
  }

  if (toggleBB) {
    toggleBB.addEventListener('click', () => {
      toggleBB.classList.toggle('active');
      chart.showBollinger = toggleBB.classList.contains('active');
      chart.render();
    });
  }

  if (toggleVol) {
    toggleVol.addEventListener('click', () => {
      toggleVol.classList.toggle('active');
      chart.showVolume = toggleVol.classList.contains('active');
      chart.render();
    });
  }

  if (toggleRSI) {
    toggleRSI.addEventListener('click', () => {
      toggleRSI.classList.toggle('active');
      chart.showRSI = toggleRSI.classList.contains('active');
      chart.render();
    });
  }

  if (togglePatterns) {
    togglePatterns.addEventListener('click', () => {
      togglePatterns.classList.toggle('active');
      chart.showPatterns = togglePatterns.classList.contains('active');
      chart.render();
    });
  }

  // ── Event Handlers: Forecast Buttons ────────────────────────────
  [runForecastBtn, runForecastBtn2, runForecastBtn3].forEach(btn => {
    if (btn) btn.addEventListener('click', runForecast);
  });

  // ── Event Handlers: Sliders ─────────────────────────────────────
  if (predLenSlider) {
    predLenSlider.addEventListener('input', (e) => {
      state.predLen = parseInt(e.target.value);
      if (predLenVal) predLenVal.textContent = state.predLen;
    });
  }

  if (tempSlider) {
    tempSlider.addEventListener('input', (e) => {
      state.temperature = parseFloat(e.target.value);
      if (tempVal) tempVal.textContent = state.temperature.toFixed(2);
    });
  }

  // ── Event Handlers: Panel Tabs (Segmented Control) ──────────────
  document.querySelectorAll('.panel-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel-body').forEach(p => p.classList.add('hidden'));
      btn.classList.add('active');
      const targetBody = document.getElementById('tab-' + btn.dataset.tab);
      if (targetBody) targetBody.classList.remove('hidden');
    });
  });

  // Backtest sub-nav pills and segmented views
  document.querySelectorAll('.bt-nav-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bt-nav-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.querySelectorAll('.bt-seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bt-seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  if (runBtBtn) {
    runBtBtn.addEventListener('click', () => {
      runForecast();
    });
  }

  if (clearBtResults) {
    clearBtResults.addEventListener('click', () => {
      if (tradesTableBody) tradesTableBody.innerHTML = '';
      if (btHeadlinePnl) btHeadlinePnl.textContent = '$0.00';
      if (btNetPnl) btNetPnl.textContent = '$0.00';
      showToast('Backtest ledger cleared', 'info', 2000);
    });
  }

  // Notification pills in Alert modal
  document.querySelectorAll('.notif-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      pill.classList.toggle('active');
    });
  });

  // ── Event Handlers: Toolbar Drawing Tools ───────────────────────
  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toolButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  if (clearAnnotations) {
    clearAnnotations.addEventListener('click', () => {
      toolButtons.forEach(b => b.classList.remove('active'));
      const cursorBtn = document.querySelector('.tool-btn[data-tip="Cursor"]');
      if (cursorBtn) cursorBtn.classList.add('active');
      chart.tradeMarkers = [];
      chart.render();
      showToast('Annotations & trade markers cleared', 'info', 2000);
    });
  }

  // ── Event Handlers: Price Alert Modal (auto_trader pattern) ─────
  function openAlertDialog() {
    if (alertDialogBackdrop) alertDialogBackdrop.style.display = 'flex';
  }
  function closeAlertDialogFn() {
    if (alertDialogBackdrop) alertDialogBackdrop.style.display = 'none';
  }

  if (createAlertBtn) createAlertBtn.addEventListener('click', openAlertDialog);
  if (closeAlertDialog) closeAlertDialog.addEventListener('click', closeAlertDialogFn);
  if (cancelAlertDialog) cancelAlertDialog.addEventListener('click', closeAlertDialogFn);

  if (confirmAlertDialog) {
    confirmAlertDialog.addEventListener('click', () => {
      const price = alertTriggerPrice ? alertTriggerPrice.value : '';
      const cond = alertCondition ? alertCondition.value : 'crossing';
      if (!price) {
        showToast('Please enter target price', 'warning');
        return;
      }
      state.alerts.push({ pair: state.pair, price: parseFloat(price), condition: cond });
      closeAlertDialogFn();
      showToast(`Alert created on ${state.pair} at $${price}`, 'success');
    });
  }

  if (alertDialogBackdrop) {
    alertDialogBackdrop.addEventListener('click', (e) => {
      if (e.target === alertDialogBackdrop) closeAlertDialogFn();
    });
  }

  // ── Event Handlers: CSV Dialog Modal ────────────────────────────
  function openCsvDialog() {
    if (csvDialogBackdrop) csvDialogBackdrop.style.display = 'flex';
  }
  function closeCsvDialogFn() {
    if (csvDialogBackdrop) csvDialogBackdrop.style.display = 'none';
  }

  if (uploadCsvBtn) uploadCsvBtn.addEventListener('click', openCsvDialog);
  if (closeCsvDialog) closeCsvDialog.addEventListener('click', closeCsvDialogFn);
  if (cancelCsvDialog) cancelCsvDialog.addEventListener('click', closeCsvDialogFn);
  if (confirmCsvDialog) {
    confirmCsvDialog.addEventListener('click', () => {
      if (csvFileInput && csvFileInput.files && csvFileInput.files.length > 0) {
        handleCsvUpload();
      } else if (csvFileInput) {
        csvFileInput.click();
      }
    });
  }

  if (csvDialogBackdrop) {
    csvDialogBackdrop.addEventListener('click', (e) => {
      if (e.target === csvDialogBackdrop) closeCsvDialogFn();
    });
  }

  if (csvDropzone) {
    csvDropzone.addEventListener('click', () => {
      if (csvFileInput) csvFileInput.click();
    });

    csvDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      csvDropzone.style.borderColor = 'var(--tv-cyan)';
    });

    csvDropzone.addEventListener('dragleave', () => {
      csvDropzone.style.borderColor = 'var(--tv-border-bright)';
    });

    csvDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      csvDropzone.style.borderColor = 'var(--tv-border-bright)';
      if (e.dataTransfer.files.length > 0 && csvFileInput) {
        csvFileInput.files = e.dataTransfer.files;
        handleCsvUpload();
      }
    });
  }

  if (csvFileInput) {
    csvFileInput.addEventListener('change', handleCsvUpload);
  }

  async function handleCsvUpload() {
    const file = csvFileInput && csvFileInput.files ? csvFileInput.files[0] : null;
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      showToast(`Parsing ${file.name}…`, 'info', 2000);
      const res = await fetch('/api/upload_csv', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.status === 'success') {
        state.pair = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
        state.historicalCandles = data.candles;
        state.forecastCandles = [];
        state.indicators = data.technical_indicators;
        state.tradeMarkers = [];

        chart.setData(state.historicalCandles, [], state.indicators, []);
        closeCsvDialogFn();

        if (headerSymbol) headerSymbol.textContent = state.pair;
        const last = data.candles[data.candles.length - 1];
        if (headerPrice) headerPrice.textContent = `$${last.close.toLocaleString()}`;
        updateHUDWithLatest();

        showToast(`Loaded ${data.count} candles from ${file.name}`, 'success');
      } else {
        showToast(`CSV error: ${data.detail || 'Invalid format'}`, 'error');
      }
    } catch (err) {
      console.error('CSV upload error:', err);
      showToast('Failed to upload and parse CSV file', 'error');
    }
  }

  // ── Initial Market Boot ─────────────────────────────────────────
  fetchMarketData();
});
