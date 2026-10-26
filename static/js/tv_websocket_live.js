/**
 * Authentic TradingView Live WebSocket Manager
 * Streams real-time candle ticks and watchlist quotes to chart & DOM
 */
(function() {
  'use strict';

  class TVLiveWebSocket {
    constructor() {
      this.ws = null;
      this.reconnectTimer = null;
      this.activeSymbol = 'NIFTY';
      this.activeResolution = '1D';
      this.sessionId = `cs_${Math.random().toString(36).substring(2, 10)}`;
      this.quoteSessionId = `qs_${Math.random().toString(36).substring(2, 10)}`;
      this.isSubscribed = false;

      this.init();
    }

    init() {
      if (typeof window === 'undefined') return;
      this.connect();
    }

    getWsUrl() {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host || '127.0.0.1:8000';
      return `${proto}//${host}/ws/tv_data`;
    }

    connect() {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const url = this.getWsUrl();
      console.log('[TV WebSocket] Connecting to', url);

      try {
        this.ws = new WebSocket(url);
      } catch (err) {
        console.warn('[TV WebSocket] WebSocket init error:', err);
        this.scheduleReconnect();
        return;
      }

      this.ws.onopen = () => {
        console.log('[TV WebSocket] Connected to live market data stream');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        // Send TradingView Handshake Frames
        this.sendTvFrame({ m: 'set_auth_token', p: ['mock_tv_session_jwt_token'] });
        this.sendTvFrame({ m: 'chart_create_session', p: [this.sessionId, ''] });
        this.sendTvFrame({ m: 'quote_create_session', p: [this.quoteSessionId] });

        // Subscribe active symbol & resolution
        this.subscribe(this.activeSymbol, this.activeResolution);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (err) => {
        console.warn('[TV WebSocket] Error:', err);
      };

      this.ws.onclose = () => {
        console.log('[TV WebSocket] Connection closed');
        this.scheduleReconnect();
      };
    }

    scheduleReconnect() {
      if (this.reconnectTimer) return;
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 2500);
    }

    sendTvFrame(obj) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const str = JSON.stringify(obj);
      this.ws.send(`~m~${str.length}~m~${str}`);
    }

    sendJson(obj) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      this.ws.send(JSON.stringify(obj));
    }

    subscribe(symbol, resolution) {
      if (!symbol) return;
      this.activeSymbol = symbol.toUpperCase().replace('NSE:', '').trim();
      if (resolution) this.activeResolution = resolution;

      console.log(`[TV WebSocket] Subscribing to ${this.activeSymbol} (${this.activeResolution})`);

      // 1. TradingView protocol frames
      this.sendTvFrame({
        m: 'resolve_symbol',
        p: [this.sessionId, 'sds_sym_1', `={"symbol":"NSE:${this.activeSymbol}"}`]
      });
      this.sendTvFrame({
        m: 'create_series',
        p: [this.sessionId, 'sds_1', 's1', 'sds_sym_1', this.activeResolution, 300, '']
      });

      // 2. Clean JSON subscription
      this.sendJson({
        action: 'subscribe',
        symbol: this.activeSymbol,
        resolution: this.activeResolution
      });
    }

    setResolution(resolution) {
      if (!resolution) return;
      this.activeResolution = resolution;
      this.subscribe(this.activeSymbol, this.activeResolution);
    }

    handleMessage(data) {
      if (!data) return;

      // Handle TradingView framing: ~m~<len>~m~<content>
      if (typeof data === 'string' && data.startsWith('~m~')) {
        const parts = data.split('~m~');
        for (let i = 0; i < parts.length; i++) {
          const chunk = parts[i];
          if (!chunk) continue;

          // Heartbeat check
          if (chunk.startsWith('~h~')) {
            const hNum = parseInt(chunk.substring(3), 10) || 1;
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(`~m~20~m~~h~${hNum + 1}`);
            }
            continue;
          }

          if (chunk.startsWith('{') && chunk.endsWith('}')) {
            try {
              const msg = JSON.parse(chunk);
              this.processTvMessage(msg);
            } catch (e) {}
          }
        }
        return;
      }

      // Handle direct JSON frames
      if (typeof data === 'string' && data.startsWith('{')) {
        try {
          const msg = JSON.parse(data);
          this.processJsonMessage(msg);
        } catch (e) {}
      }
    }

    processTvMessage(msg) {
      if (!msg || !msg.m) return;

      // Candle update (timescale_update)
      if (msg.m === 'timescale_update') {
        const seriesData = msg.p && msg.p[1] && msg.p[1].sds_1;
        if (seriesData && seriesData.s && seriesData.s.length > 0) {
          const barRaw = seriesData.s[0].v;
          if (Array.isArray(barRaw) && barRaw.length >= 5) {
            const candle = {
              time: barRaw[0],
              open: barRaw[1],
              high: barRaw[2],
              low: barRaw[3],
              close: barRaw[4],
              volume: barRaw[5] || 0
            };
            this.dispatchLiveCandle(candle);
          }
        }
      }

      // Quote update (qsd)
      if (msg.m === 'qsd') {
        const qData = msg.p && msg.p[1];
        if (qData && qData.v) {
          const symClean = (qData.n || '').split(':').pop().toUpperCase();
          const v = qData.v;
          if (symClean && v.lp !== undefined) {
            this.dispatchLiveQuote(symClean, {
              last: v.lp,
              chg: v.ch !== undefined ? v.ch : 0,
              pct: v.chp !== undefined ? v.chp : 0,
              bid: v.bid || v.lp - 0.05,
              ask: v.ask || v.lp + 0.05,
              volume: v.volume || 0,
              stale: v.stale,
              source: v.source
            });

            // If quote is for the active symbol, update the chart live candle in-place
            if (symClean === this.activeSymbol && window.tradingChart && typeof window.tradingChart.updateCandle === 'function') {
              const candle = {
                time: Math.floor(v.ts || Date.now() / 1000),
                open: v.open_price || v.lp,
                high: v.high_price || v.lp,
                low: v.low_price || v.lp,
                close: v.lp,
                volume: v.volume || 0
              };
              this.dispatchLiveCandle(candle, symClean, v.bid, v.ask);
            }
          }
        }
      }
    }

    processJsonMessage(msg) {
      if (!msg) return;

      if (msg.type === 'candle' && msg.candle) {
        const msgSym = (msg.symbol || this.activeSymbol).toUpperCase().replace('NSE:', '').trim();
        const currSym = this.activeSymbol.toUpperCase().replace('NSE:', '').trim();
        if (msgSym !== currSym) return;
        this.dispatchLiveCandle(msg.candle, msg.symbol, msg.bid, msg.ask);
      } else if (msg.type === 'quote' && msg.symbol) {
        this.dispatchLiveQuote(msg.symbol, msg);
      } else if (msg.type === 'quotes' && msg.quotes) {
        Object.entries(msg.quotes).forEach(([s, q]) => {
          this.dispatchLiveQuote(s, q);
        });
      }
    }

    dispatchLiveCandle(candle, symbol, bid, ask) {
      const sym = (symbol || this.activeSymbol).toUpperCase();

      // 1. Update lightweight chart
      if (window.tradingChart && typeof window.tradingChart.updateCandle === 'function') {
        window.tradingChart.updateCandle(candle);
      }

      const fmt = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const price = candle.close;
      const bPrice = bid !== undefined ? bid : price - 0.05;
      const aPrice = ask !== undefined ? ask : price + 0.05;

      // 2. Update Buy/Sell Trading Buttons
      const sellEl = document.getElementById('instantSellPrice');
      const buyEl = document.getElementById('instantBuyPrice');
      if (sellEl) sellEl.textContent = fmt(bPrice);
      if (buyEl) buyEl.textContent = fmt(aPrice);

      // 3. Update Detail Card if active
      const cardP = document.getElementById('cardPrice');
      const cardQaPrice = document.querySelector('[data-qa-id="details-element price"] [data-qa-id="value"]');
      if (cardP) cardP.textContent = fmt(price);
      if (cardQaPrice) cardQaPrice.textContent = fmt(price);

      // 4. Update Document Title
      const isUp = (candle.close >= candle.open);
      const chgVal = candle.close - candle.open;
      const pctVal = candle.open ? (chgVal / candle.open) * 100 : 0;
      document.title = `${sym} ${fmt(price)} ${isUp ? '▲ +' : '▼ -'}${Math.abs(pctVal).toFixed(2)}% Unnamed`;

      // 5. Update watchlist row for active symbol
      this.dispatchLiveQuote(sym, {
        last: price,
        chg: chgVal,
        pct: pctVal
      });
    }

    dispatchLiveQuote(symbol, data) {
      const sym = symbol.toUpperCase().replace('NSE:', '').trim();
      const last = data.last;
      const chg = data.chg !== undefined ? data.chg : 0;
      const pct = data.pct !== undefined ? data.pct : 0;
      const isUp = chg >= 0;

      const fmt = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const lastStr = fmt(last);
      const chgStr = `${isUp ? '+' : ''}${fmt(chg)}`;
      const pctStr = `${isUp ? '+' : ''}${Number(pct).toFixed(2)}%`;

      // Update right dock watchlist table rows
      const rows = document.querySelectorAll(`[data-symbol="${sym}"], [data-symbol-short="${sym}"], .tv-wl-row[data-symbol="${sym}"]`);
      rows.forEach(row => {
        const lastEl = row.querySelector('.last-ALH_8bJI .inner-ALH_8bJI, .last-ALH_8bJI, .tv-wl-last, [data-qa-id="last-price"], .last-price');
        const chgEl = row.querySelector('.change-ALH_8bJI .inner-ALH_8bJI, .change-ALH_8bJI, .tv-wl-chg, [data-qa-id="change"], .change');
        const pctEl = row.querySelector('.changeInPercents-ALH_8bJI .inner-ALH_8bJI, .changeInPercents-ALH_8bJI, .tv-wl-pct, [data-qa-id="percent-change"], .percent');

        if (lastEl) {
          lastEl.textContent = lastStr;
        }
        if (chgEl) {
          chgEl.textContent = chgStr;
          chgEl.classList.toggle('plus-ALH_8bJI', isUp);
          chgEl.classList.toggle('minus-ALH_8bJI', !isUp);
          chgEl.classList.toggle('up', isUp);
          chgEl.classList.toggle('dn', !isUp);
        }
        if (pctEl) {
          pctEl.textContent = pctStr;
          pctEl.classList.toggle('plus-ALH_8bJI', isUp);
          pctEl.classList.toggle('minus-ALH_8bJI', !isUp);
          pctEl.classList.toggle('up', isUp);
          pctEl.classList.toggle('dn', !isUp);
        }

        // Staleness handling
        if (data.stale !== undefined) {
          row.classList.toggle('stale-quote', data.stale === true);
        }

        // Pulse highlight animation
        const flashClass = isUp ? 'tv-pulse-green' : 'tv-pulse-red';
        row.classList.remove('tv-pulse-green', 'tv-pulse-red');
        void row.offsetWidth; // force reflow
        row.classList.add(flashClass);
        setTimeout(() => row.classList.remove(flashClass), 650);
      });
    }
  }

  // Inject CSS style for subtle live flash animations and staleness badges
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .tv-pulse-green {
      background-color: rgba(8, 153, 129, 0.16) !important;
      transition: background-color 0.4s ease-out;
    }
    .tv-pulse-red {
      background-color: rgba(242, 54, 69, 0.16) !important;
      transition: background-color 0.4s ease-out;
    }
    .stale-quote {
      opacity: 0.88;
    }
    .stale-quote .last-ALH_8bJI::after,
    .stale-quote .tv-wl-last::after {
      content: 'STALE';
      display: inline-block;
      font-size: 8px;
      line-height: 10px;
      font-weight: 600;
      background: #e0e3eb;
      color: #787b86;
      padding: 1px 3px;
      border-radius: 2px;
      margin-left: 5px;
      vertical-align: middle;
    }
  `;
  document.head.appendChild(styleEl);

  // Initialize singleton live WebSocket manager
  window.tvWebSocket = new TVLiveWebSocket();

})();
