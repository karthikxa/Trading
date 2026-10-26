/**
 * Central Reactive State Store for TradingView Terminal
 * Manages symbol, resolution, chart type, active drawing tools, overlays, indicators,
 * and persists per-symbol preferences in localStorage.
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_PREFIX = 'tv_terminal_state_';

  const DEFAULT_STATE = {
    symbol: 'NIFTY',
    symbolDesc: 'Nifty 50 Index · NSE',
    resolution: '1D',
    chartType: 'candles', // 'candles' | 'bars' | 'line' | 'area' | 'heikin_ashi'
    activeTool: 'crosshair', // current drawing tool name
    keepDrawing: false,      // stay in tool mode after drawing completes
    magnetMode: 'normal',    // 'normal' | 'weak_magnet' | 'strong_magnet'
    drawingsLocked: false,
    drawingsHidden: false,
    indicators: ['VOL'],    // active indicators by name or config
    activeAlerts: [],
    replayMode: false,
    replaySpeed: 1,
    theme: 'dark'
  };

  class StateStore {
    constructor() {
      this.listeners = new Map();
      this.state = Object.assign({}, DEFAULT_STATE);
      this.loadState();
    }

    loadState(symbol) {
      const sym = symbol || this.state.symbol;
      try {
        const saved = localStorage.getItem(STORAGE_KEY_PREFIX + sym);
        if (saved) {
          const parsed = JSON.parse(saved);
          this.state = Object.assign({}, DEFAULT_STATE, parsed, { symbol: sym });
        }
      } catch (e) {
        console.warn('[StateStore] Failed to load localStorage state:', e);
      }
    }

    saveState() {
      try {
        const toSave = {
          symbol: this.state.symbol,
          resolution: this.state.resolution,
          chartType: this.state.chartType,
          keepDrawing: this.state.keepDrawing,
          magnetMode: this.state.magnetMode,
          drawingsLocked: this.state.drawingsLocked,
          drawingsHidden: this.state.drawingsHidden,
          indicators: this.state.indicators
        };
        localStorage.setItem(STORAGE_KEY_PREFIX + this.state.symbol, JSON.stringify(toSave));
      } catch (e) {
        console.warn('[StateStore] Failed to save state to localStorage:', e);
      }
    }

    get(key) {
      return this.state[key];
    }

    set(key, value) {
      if (this.state[key] === value) return;
      const prev = this.state[key];
      this.state[key] = value;
      this.saveState();
      this.notify(key, value, prev);
    }

    update(partial) {
      for (const k of Object.keys(partial)) {
        this.set(k, partial[k]);
      }
    }

    subscribe(key, callback) {
      if (!this.listeners.has(key)) {
        this.listeners.set(key, new Set());
      }
      this.listeners.get(key).add(callback);
      return () => this.listeners.get(key).delete(callback);
    }

    notify(key, value, prev) {
      if (this.listeners.has(key)) {
        for (const cb of this.listeners.get(key)) {
          try { cb(value, prev); } catch (e) { console.error(e); }
        }
      }
      if (this.listeners.has('*')) {
        for (const cb of this.listeners.get('*')) {
          try { cb(key, value, prev); } catch (e) { console.error(e); }
        }
      }
    }
  }

  window.tvStateStore = new StateStore();
})(window);
