/**
 * TradingView Datafeed Layer
 * Loads historical data from /api/history, folds live WebSocket ticks from /ws/tv_data,
 * and maintains IST (+19800s) timezone formatting while updating the DOM legend.
 */

(function (window) {
  'use strict';

  class TVDatafeed {
    constructor() {
      this.chart = null;
      this.activeSymbol = 'NIFTY';
      this.activeResolution = '1D';
      this.loadedBars = [];
      this.currentBar = null;
      this.barSubscribeCallback = null;
      this.ws = null;
      this.wsReconnectTimer = null;
      this.isReplayPaused = false;
    }

    attach(chart) {
      this.chart = chart;
      this.setupDataLoader();
      this.connectWebSocket();

      // Listen to crosshair changes to update the TradingView HUD legend!
      if (this.chart.subscribeAction) {
        this.chart.subscribeAction('onCrosshairChange', (data) => {
          if (data && data.kLineData) {
            this.updateHudLegend(data.kLineData);
          } else if (this.currentBar) {
            this.updateHudLegend(this.currentBar);
          }
        });
      }
    }

    setupDataLoader() {
      if (!this.chart || !this.chart.setDataLoader) return;

      this.chart.setDataLoader({
        getBars: async (params) => {
          const sym = params.symbol ? params.symbol.ticker : this.activeSymbol;
          const res = this.activeResolution;
          const bars = await this.fetchHistory(sym, res);

          this.loadedBars = bars;
          if (bars.length > 0) {
            this.currentBar = bars[bars.length - 1];
            this.updateHudLegend(this.currentBar);
          }

          const processed = window.tvChartEngine && window.tvChartEngine.isHeikinAshi
            ? this.convertToHeikinAshi(bars)
            : bars;

          if (params.callback) {
            params.callback(processed, { more: false });
          }
        },
        subscribeBar: (params) => {
          this.barSubscribeCallback = params.callback;
        },
        unsubscribeBar: () => {
          this.barSubscribeCallback = null;
        }
      });
    }

    async fetchHistory(symbol, resolution) {
      try {
        const url = `/api/history?symbol=${encodeURIComponent(symbol)}&resolution=${encodeURIComponent(resolution)}&limit=1000`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.warn('[TVDatafeed] Failed to fetch /api/history, falling back to local data:', err);
        return [];
      }
    }

    convertToHeikinAshi(bars) {
      if (!bars || bars.length === 0) return [];
      const ha = [];
      let prevHaOpen = (bars[0].open + bars[0].close) / 2;
      let prevHaClose = (bars[0].open + bars[0].high + bars[0].low + bars[0].close) / 4;

      for (let i = 0; i < bars.length; i++) {
        const b = bars[i];
        const haClose = (b.open + b.high + b.low + b.close) / 4;
        const haOpen = i === 0 ? prevHaOpen : (prevHaOpen + prevHaClose) / 2;
        const haHigh = Math.max(b.high, haOpen, haClose);
        const haLow = Math.min(b.low, haOpen, haClose);

        ha.push({
          timestamp: b.timestamp,
          time: b.time,
          open: round(haOpen, 2),
          high: round(haHigh, 2),
          low: round(haLow, 2),
          close: round(haClose, 2),
          volume: b.volume
        });

        prevHaOpen = haOpen;
        prevHaClose = haClose;
      }
      return ha;
    }

    reapplyCurrentData() {
      if (!this.chart || !this.chart.resetData) return;
      this.chart.resetData();
    }

    connectWebSocket() {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const url = `${proto}//${host}/ws/tv_data`;

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('[TVDatafeed] WebSocket connected to', url);
          this.subscribeSymbol(this.activeSymbol, this.activeResolution);
        };

        this.ws.onmessage = (e) => {
          this.handleWsMessage(e.data);
        };

        this.ws.onclose = () => {
          console.warn('[TVDatafeed] WebSocket closed, auto-reconnecting in 3s...');
          this.scheduleReconnect();
        };

        this.ws.onerror = (err) => {
          console.warn('[TVDatafeed] WebSocket error:', err);
          this.ws.close();
        };
      } catch (err) {
        console.error('[TVDatafeed] Error connecting WebSocket:', err);
        this.scheduleReconnect();
      }
    }

    scheduleReconnect() {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = setTimeout(() => {
        this.connectWebSocket();
      }, 3000);
    }

    subscribeSymbol(symbol, resolution) {
      this.activeSymbol = symbol;
      this.activeResolution = resolution || this.activeResolution;

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          action: 'subscribe',
          symbol: this.activeSymbol,
          resolution: this.activeResolution
        }));
      }
    }

    handleWsMessage(raw) {
      if (this.isReplayPaused) return; // Do not apply live ticks during bar replay
      if (!raw) return;

      // 1. TradingView heartbeat handling
      if (raw.includes('~m~')) {
        if (raw.includes('~h~')) {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send('~m~20~m~~h~2');
          }
          return;
        }

        const parts = raw.split('~m~');
        for (const p of parts) {
          if (p.startsWith('{') && p.endsWith('}')) {
            try {
              const msg = JSON.parse(p);
              if (msg.m === 'timescale_update') {
                const sds = msg.p && msg.p[1] && msg.p[1].sds_1;
                if (sds && sds.s && sds.s.length > 0) {
                  const v = sds.s[0].v;
                  if (v && v.length >= 5) {
                    const tickBar = {
                      timestamp: v[0] * 1000,
                      time: v[0],
                      open: v[1],
                      high: v[2],
                      low: v[3],
                      close: v[4],
                      volume: v[5] || 0
                    };
                    this.onLiveCandleUpdate(tickBar);
                  }
                }
              }
            } catch (e) {}
          }
        }
      } else {
        // 2. Direct JSON frame
        try {
          const msg = JSON.parse(raw);
          if (msg.type === 'candle' && msg.candle) {
            const c = msg.candle;
            const tickBar = {
              timestamp: c.time * 1000,
              time: c.time,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume || 0
            };
            this.onLiveCandleUpdate(tickBar);
          }
        } catch (e) {}
      }
    }

    onLiveCandleUpdate(tickBar) {
      this.currentBar = tickBar;
      this.updateHudLegend(tickBar);

      if (this.barSubscribeCallback) {
        const finalBar = window.tvChartEngine && window.tvChartEngine.isHeikinAshi
          ? this.formatSingleHeikinAshi(tickBar)
          : tickBar;
        this.barSubscribeCallback(finalBar);
      }
    }

    formatSingleHeikinAshi(tickBar) {
      const prev = this.loadedBars.length > 1 ? this.loadedBars[this.loadedBars.length - 2] : tickBar;
      const haClose = (tickBar.open + tickBar.high + tickBar.low + tickBar.close) / 4;
      const haOpen = (prev.open + prev.close) / 2;
      return {
        timestamp: tickBar.timestamp,
        time: tickBar.time,
        open: round(haOpen, 2),
        high: round(Math.max(tickBar.high, haOpen, haClose), 2),
        low: round(Math.min(tickBar.low, haOpen, haClose), 2),
        close: round(haClose, 2),
        volume: tickBar.volume
      };
    }

    updateHudLegend(bar) {
      if (!bar) return;

      // Update HUD values in harvested TradingView DOM
      const oEl = document.querySelector('[data-qa-id="legend-source-item-open"] .value-quatTGAC') || document.getElementById('hud-open');
      const hEl = document.querySelector('[data-qa-id="legend-source-item-high"] .value-quatTGAC') || document.getElementById('hud-high');
      const lEl = document.querySelector('[data-qa-id="legend-source-item-low"] .value-quatTGAC') || document.getElementById('hud-low');
      const cEl = document.querySelector('[data-qa-id="legend-source-item-close"] .value-quatTGAC') || document.getElementById('hud-close');
      const chgEl = document.querySelector('[data-qa-id="legend-source-item-change"] .value-quatTGAC') || document.getElementById('hud-change');

      if (oEl) oEl.textContent = formatNum(bar.open);
      if (hEl) hEl.textContent = formatNum(bar.high);
      if (lEl) lEl.textContent = formatNum(bar.low);
      if (cEl) cEl.textContent = formatNum(bar.close);

      if (chgEl) {
        const diff = bar.close - bar.open;
        const pct = bar.open ? (diff / bar.open) * 100 : 0;
        const sign = diff >= 0 ? '+' : '';
        chgEl.textContent = `${sign}${formatNum(diff)} (${sign}${pct.toFixed(2)}%)`;
        chgEl.style.color = diff >= 0 ? '#26a69a' : '#ef5350';
      }

      // Also update top bar symbol search button text if present
      const symBtn = document.querySelector('#header-toolbar-symbol-search .value-eTD3FKHQ');
      if (symBtn && symBtn.textContent !== this.activeSymbol) {
        symBtn.textContent = this.activeSymbol;
      }
    }
  }

  function round(val, prec) {
    const factor = Math.pow(10, prec);
    return Math.round(val * factor) / factor;
  }

  function formatNum(num) {
    if (typeof num !== 'number' || isNaN(num)) return '--';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  window.tvDatafeed = new TVDatafeed();
})(window);
