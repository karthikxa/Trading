/**
 * TradingView UI Binder Layer
 * Binds the harvested TradingView DOM buttons & controls to the KLineChart core engine,
 * datafeed, and feature controllers without altering any visual styles, classes, or layout.
 */

(function (window) {
  'use strict';

  class UIBinder {
    constructor() {
      this.controllers = {};
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;
      this.initialized = true;

      console.log('[UIBinder] Mounting TradingView UI binding layer...');

      // 1. Initialize Chart Engine
      const chart = window.tvChartEngine.init('tvChartContainer');
      if (!chart) {
        console.error('[UIBinder] Failed to initialize KLineChart core in #tvChartContainer');
        return;
      }

      // 2. Attach Datafeed
      window.tvDatafeed.attach(chart);

      // Connect drawings controller to chart
      if (window.tvDrawingsController) {
        window.tvDrawingsController.init(chart);
      }

      // 3. Add default Volume indicator
      try {
        chart.createIndicator('VOL', false, { id: 'candle_pane' });
      } catch (e) {
        try { chart.createIndicator('VOL', false); } catch (e2) {}
      }

      // 4. Bind State Store listeners
      window.tvStateStore.subscribe('symbol', (sym) => {
        window.tvChartEngine.updateSymbol(sym);
        window.tvDatafeed.subscribeSymbol(sym, window.tvStateStore.get('resolution'));
        window.tvDatafeed.reapplyCurrentData();
      });

      window.tvStateStore.subscribe('resolution', (res) => {
        window.tvChartEngine.updatePeriod(res);
        window.tvDatafeed.subscribeSymbol(window.tvStateStore.get('symbol'), res);
        window.tvDatafeed.reapplyCurrentData();
        this.syncIntervalLabels(res);
      });

      window.tvStateStore.subscribe('chartType', (type) => {
        window.tvChartEngine.setChartType(type);
      });

      // 5. Wire top-level controls
      this.wireDOMControls();
    }

    registerController(name, controller) {
      this.controllers[name] = controller;
    }

    wireDOMControls() {
      // Find topbar symbol search
      const symBtn = document.getElementById('header-toolbar-symbol-search');
      if (symBtn) {
        symBtn.setAttribute('data-action', 'open-symbol-search');
      }

      // Find intervals
      const intervalBtn = document.querySelector('#header-toolbar-intervals button');
      if (intervalBtn) {
        intervalBtn.setAttribute('data-action', 'open-intervals-dropdown');
      }

      // Find chart styles
      const styleBtn = document.querySelector('#header-toolbar-chart-styles button');
      if (styleBtn) {
        styleBtn.setAttribute('data-action', 'open-chart-styles-dropdown');
      }

      // Find indicators
      const indBtn = document.querySelector('#header-toolbar-indicators button');
      if (indBtn) {
        indBtn.setAttribute('data-action', 'open-indicators-dialog');
      }

      // Find alerts
      const alertBtn = document.getElementById('header-toolbar-alerts');
      if (alertBtn) {
        alertBtn.setAttribute('data-action', 'create-alert');
      }

      // Find replay
      const replayBtn = document.getElementById('header-toolbar-replay');
      if (replayBtn) {
        replayBtn.setAttribute('data-action', 'toggle-replay');
      }

      // Find properties/settings
      const settingsBtn = document.getElementById('header-toolbar-properties');
      if (settingsBtn) {
        settingsBtn.setAttribute('data-action', 'open-settings-dialog');
      }

      // Find fullscreen
      const fsBtn = document.getElementById('header-toolbar-fullscreen');
      if (fsBtn) {
        fsBtn.setAttribute('data-action', 'toggle-fullscreen');
      }

      // Normalize interval pill labels to TV-style codes ("1D", not "D")
      const initialRes = window.tvStateStore ? window.tvStateStore.get('resolution') : '1D';
      this.syncIntervalLabels(initialRes);

      // Restore the authentic teal audio-waves legend chip
      // (the scraped shell ships the red alert-flag marker variant)
      this.swapLegendChip();
    }

    formatIntervalLabel(res) {
      if (res === null || res === undefined) return '';
      const r = String(res).trim();
      // TradingView renders bare period letters as 1-prefixed forms in the interval pill
      if (/^d$/i.test(r)) return '1D';
      if (/^w$/i.test(r)) return '1W';
      if (/^m$/i.test(r)) return '1M';
      return r;
    }

    syncIntervalLabels(res) {
      const label = this.formatIntervalLabel(
        res || (window.tvStateStore && window.tvStateStore.get('resolution')) || '1D'
      );
      if (!label) return;
      document.querySelectorAll('.value-EzLGe8ai').forEach((el) => {
        if ((el.textContent || '').trim() !== label) {
          el.textContent = label;
        }
      });
    }

    swapLegendChip() {
      const run = () => {
        document.querySelectorAll('.flagWrapper-quatTGAC').forEach((wrap) => {
          if (wrap.getAttribute('data-tv-waves') === '1') return;
          wrap.setAttribute('data-tv-waves', '1');
          wrap.classList.remove('red-ZtIxWs3Z');
          wrap.style.color = '#089981';
          wrap.innerHTML =
            '<svg fill="none" height="12" viewBox="0 0 12 12" width="12" xmlns="http://www.w3.org/2000/svg">' +
            '<rect x="1.55" y="4.6" width="1.9" height="2.8" rx="0.95" fill="currentColor"/>' +
            '<rect x="5.05" y="2.2" width="1.9" height="7.6" rx="0.95" fill="currentColor"/>' +
            '<rect x="8.55" y="4.6" width="1.9" height="2.8" rx="0.95" fill="currentColor"/>' +
            '</svg>';
        });
      };
      run();
      // The legend chip can be re-mounted after chart init — retry briefly
      let tries = 0;
      const t = setInterval(() => {
        run();
        if (++tries >= 10) clearInterval(t);
      }, 500);
    }
  }

  window.tvUIBinder = new UIBinder();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.tvUIBinder.init());
  } else {
    window.tvUIBinder.init();
  }
})(window);
