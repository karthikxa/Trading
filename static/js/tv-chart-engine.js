/**
 * TradingView Chart Engine wrapper around KLineChart v10 Core
 * Styled with genuine TradingView Dark Theme (#26a69a / #ef5350 candles, TV grid & crosshairs)
 */

(function (window) {
  'use strict';

  const TV_DARK_STYLES = {
    grid: {
      horizontal: {
        show: true,
        size: 1,
        color: 'rgba(240, 243, 250, 0.06)',
        style: 'dashed',
        dashedValue: [2, 4]
      },
      vertical: {
        show: true,
        size: 1,
        color: 'rgba(240, 243, 250, 0.06)',
        style: 'dashed',
        dashedValue: [2, 4]
      }
    },
    candle: {
      type: 'candle_solid',
      bar: {
        upColor: '#26a69a',
        downColor: '#ef5350',
        noChangeColor: '#787b86',
        upBorderColor: '#26a69a',
        downBorderColor: '#ef5350',
        noChangeBorderColor: '#787b86',
        upWickColor: '#26a69a',
        downWickColor: '#ef5350',
        noChangeWickColor: '#787b86'
      },
      area: {
        lineSize: 2,
        lineColor: '#2962ff',
        value: 'close',
        backgroundColor: [
          { offset: 0, color: 'rgba(41, 98, 255, 0.28)' },
          { offset: 1, color: 'rgba(41, 98, 255, 0.0)' }
        ]
      },
      priceMark: {
        show: true,
        high: { show: true, color: '#787b86', textOffset: 5, textSize: 10 },
        low: { show: true, color: '#787b86', textOffset: 5, textSize: 10 },
        last: {
          show: true,
          upColor: '#26a69a',
          downColor: '#ef5350',
          noChangeColor: '#787b86',
          line: { show: true, style: 'dashed', dashedValue: [3, 3], size: 1 },
          text: { show: true, size: 12, color: '#ffffff', family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif' }
        }
      },
      tooltip: {
        showRule: 'none' // We render the exact TradingView DOM legend!
      }
    },
    indicator: {
      ohlc: {
        upColor: 'rgba(38, 166, 154, 0.65)',
        downColor: 'rgba(239, 83, 80, 0.65)',
        noChangeColor: '#787b86'
      },
      bars: [{
        style: 'fill',
        borderStyle: 'solid',
        borderSize: 1,
        borderDashedValue: [2, 2],
        upColor: 'rgba(38, 166, 154, 0.65)',
        downColor: 'rgba(239, 83, 80, 0.65)',
        noChangeColor: '#787b86'
      }],
      lines: [
        { style: 'solid', smooth: false, size: 1.5, color: '#2962ff', dashedValue: [2, 2] },
        { style: 'solid', smooth: false, size: 1.5, color: '#ff9800', dashedValue: [2, 2] },
        { style: 'solid', smooth: false, size: 1.5, color: '#e91e63', dashedValue: [2, 2] },
        { style: 'solid', smooth: false, size: 1.5, color: '#9c27b0', dashedValue: [2, 2] }
      ],
      tooltip: {
        showRule: 'none' // TV DOM legend renders indicator values
      }
    },
    xAxis: {
      show: true,
      size: 'auto',
      axisLine: { show: true, color: '#2a2e39', size: 1 },
      tickText: {
        show: true,
        color: '#787b86',
        family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
        size: 11
      },
      tickLine: { show: true, size: 1, color: '#2a2e39', length: 4 }
    },
    yAxis: {
      show: true,
      size: 'auto',
      position: 'right',
      axisLine: { show: true, color: '#2a2e39', size: 1 },
      tickText: {
        show: true,
        color: '#787b86',
        family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
        size: 11
      },
      tickLine: { show: true, size: 1, color: '#2a2e39', length: 4 }
    },
    crosshair: {
      show: true,
      horizontal: {
        show: true,
        line: { style: 'dashed', dashedValue: [4, 4], size: 1, color: '#758696' },
        text: {
          show: true,
          color: '#d1d4dc',
          size: 11,
          family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
          backgroundColor: '#2a2e39',
          borderRadius: 2,
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 2,
          paddingBottom: 2
        }
      },
      vertical: {
        show: true,
        line: { style: 'dashed', dashedValue: [4, 4], size: 1, color: '#758696' },
        text: {
          show: true,
          color: '#d1d4dc',
          size: 11,
          family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
          backgroundColor: '#2a2e39',
          borderRadius: 2,
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 2,
          paddingBottom: 2
        }
      }
    },
    overlay: {
      point: {
        color: '#2962ff',
        borderColor: '#ffffff',
        borderSize: 1,
        radius: 4,
        activeColor: '#2962ff',
        activeBorderColor: '#ffffff',
        activeBorderSize: 2,
        activeRadius: 5
      },
      line: {
        style: 'solid',
        smooth: false,
        color: '#2962ff',
        size: 2,
        dashedValue: [2, 2]
      },
      polygon: {
        style: 'stroke_fill',
        color: 'rgba(41, 98, 255, 0.15)',
        borderColor: '#2962ff',
        borderSize: 1,
        borderStyle: 'solid',
        borderDashedValue: [2, 2]
      }
    }
  };

  const TV_LIGHT_STYLES = {
    grid: {
      horizontal: {
        show: true,
        size: 1,
        color: '#f0f3fa',
        style: 'solid'
      },
      vertical: {
        show: true,
        size: 1,
        color: '#f0f3fa',
        style: 'solid'
      }
    },
    candle: {
      type: 'candle_solid',
      bar: {
        upColor: '#089981',
        downColor: '#f23645',
        noChangeColor: '#787b86',
        upBorderColor: '#089981',
        downBorderColor: '#f23645',
        noChangeBorderColor: '#787b86',
        upWickColor: '#089981',
        downWickColor: '#f23645',
        noChangeWickColor: '#787b86'
      },
      area: {
        lineSize: 2,
        lineColor: '#2962ff',
        value: 'close',
        backgroundColor: [
          { offset: 0, color: 'rgba(41, 98, 255, 0.22)' },
          { offset: 1, color: 'rgba(41, 98, 255, 0.0)' }
        ]
      },
      priceMark: {
        show: true,
        high: { show: true, color: '#787b86', textOffset: 5, textSize: 10 },
        low: { show: true, color: '#787b86', textOffset: 5, textSize: 10 },
        last: {
          show: true,
          upColor: '#089981',
          downColor: '#f23645',
          noChangeColor: '#787b86',
          line: { show: true, style: 'dashed', dashedValue: [3, 3], size: 1 },
          text: { show: true, size: 12, color: '#ffffff', family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif' }
        }
      },
      tooltip: {
        showRule: 'none'
      }
    },
    indicator: {
      ohlc: {
        upColor: '#089981',
        downColor: '#f23645',
        noChangeColor: '#787b86'
      },
      bars: [{
        style: 'fill',
        borderStyle: 'solid',
        borderSize: 1,
        borderDashedValue: [2, 2],
        upColor: 'rgba(8, 153, 129, 0.55)',
        downColor: 'rgba(242, 54, 69, 0.55)',
        noChangeColor: '#787b86'
      }],
      lines: [
        { style: 'solid', smooth: false, size: 1.5, color: '#2962ff' },
        { style: 'solid', smooth: false, size: 1.5, color: '#ff9800' },
        { style: 'solid', smooth: false, size: 1.5, color: '#e91e63' },
        { style: 'solid', smooth: false, size: 1.5, color: '#9c27b0' }
      ],
      tooltip: {
        showRule: 'none'
      }
    },
    xAxis: {
      show: true,
      size: 'auto',
      axisLine: { show: true, color: '#e0e3eb', size: 1 },
      tickText: {
        show: true,
        color: '#787b86',
        family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
        size: 11
      },
      tickLine: { show: true, size: 1, color: '#e0e3eb', length: 4 }
    },
    yAxis: {
      show: true,
      size: 'auto',
      position: 'right',
      axisLine: { show: true, color: '#e0e3eb', size: 1 },
      tickText: {
        show: true,
        color: '#787b86',
        family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
        size: 11
      },
      tickLine: { show: true, size: 1, color: '#e0e3eb', length: 4 }
    },
    crosshair: {
      show: true,
      horizontal: {
        show: true,
        line: { style: 'dashed', dashedValue: [4, 4], size: 1, color: '#9598a1' },
        text: {
          show: true,
          color: '#ffffff',
          size: 11,
          family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
          backgroundColor: '#131722',
          borderRadius: 2,
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 2,
          paddingBottom: 2
        }
      },
      vertical: {
        show: true,
        line: { style: 'dashed', dashedValue: [4, 4], size: 1, color: '#9598a1' },
        text: {
          show: true,
          color: '#ffffff',
          size: 11,
          family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
          backgroundColor: '#131722',
          borderRadius: 2,
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 2,
          paddingBottom: 2
        }
      }
    },
    overlay: {
      point: {
        color: '#2962ff',
        borderColor: '#ffffff',
        borderSize: 1,
        radius: 4,
        activeColor: '#2962ff',
        activeBorderColor: '#ffffff',
        activeBorderSize: 2,
        activeRadius: 5
      },
      line: {
        style: 'solid',
        smooth: false,
        color: '#2962ff',
        size: 2,
        dashedValue: [2, 2]
      },
      polygon: {
        style: 'stroke_fill',
        color: 'rgba(41, 98, 255, 0.12)',
        borderColor: '#2962ff',
        borderSize: 1,
        borderStyle: 'solid',
        borderDashedValue: [2, 2]
      }
    }
  };

  class TVChartEngine {
    constructor() {
      this.chart = null;
      this.container = null;
      this.currentSymbol = 'NIFTY';
      this.currentResolution = '1D';
      this.currentChartType = 'candles';
      this.isHeikinAshi = false;
      this.rawBars = [];
    }

    init(containerId) {
      if (typeof klinecharts === 'undefined') {
        console.error('[TVChartEngine] KLineChart library not loaded!');
        return null;
      }

      this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
      if (!this.container) {
        console.error(`[TVChartEngine] Container #${containerId} not found.`);
        return null;
      }

      // Clear any prior chart canvas elements
      this.container.innerHTML = '';
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      this.container.style.backgroundColor = isDark ? '#131722' : '#ffffff';

      this.chart = klinecharts.init(this.container, {
        styles: isDark ? TV_DARK_STYLES : TV_LIGHT_STYLES,
        timezone: 'Asia/Kolkata', // IST UTC+5:30
        formatter: {
          formatDate: ({ timestamp, template, type }) => {
            const date = new Date(timestamp);
            if (template === 'YYYY-MM-DD') {
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, '0');
              const d = String(date.getDate()).padStart(2, '0');
              return `${y}-${m}-${d}`;
            }
            if (template === 'HH:mm') {
              const h = String(date.getHours()).padStart(2, '0');
              const min = String(date.getMinutes()).padStart(2, '0');
              return `${h}:${min}`;
            }
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
          }
        }
      });

      window.tvChart = this.chart;

      // Ensure proper sizing
      window.addEventListener('resize', () => {
        if (this.chart) this.chart.resize();
      });

      const ro = new ResizeObserver(() => {
        if (this.chart) this.chart.resize();
      });
      ro.observe(this.container);

      // Set initial symbol & period
      this.updateSymbol('NIFTY');
      this.updatePeriod('1D');

      return this.chart;
    }

    setTheme(theme) {
      const isDark = theme === 'dark';
      if (this.container) {
        this.container.style.backgroundColor = isDark ? '#131722' : '#ffffff';
      }
      if (this.chart) {
        this.chart.setStyles(isDark ? TV_DARK_STYLES : TV_LIGHT_STYLES);
      }
    }

    updateSymbol(sym) {
      this.currentSymbol = sym;
      const precision = (sym.includes('USD') || sym.includes('BTC') || sym.includes('SOL')) ? 4 : 2;
      if (this.chart) {
        this.chart.setSymbol({
          ticker: sym,
          name: sym,
          pricePrecision: precision,
          volumePrecision: 0
        });
      }
    }

    updatePeriod(res) {
      this.currentResolution = res;
      const r = String(res).toUpperCase();
      let span = 1;
      let type = 'day';

      if (r === '1M' || r === '1') { span = 1; type = 'minute'; }
      else if (r === '3M' || r === '3') { span = 3; type = 'minute'; }
      else if (r === '5M' || r === '5') { span = 5; type = 'minute'; }
      else if (r === '15M' || r === '15') { span = 15; type = 'minute'; }
      else if (r === '30M' || r === '30') { span = 30; type = 'minute'; }
      else if (r === '60' || r === '1H') { span = 60; type = 'minute'; }
      else if (r === '120' || r === '2H') { span = 120; type = 'minute'; }
      else if (r === '240' || r === '4H') { span = 240; type = 'minute'; }
      else if (r.includes('W')) { span = 1; type = 'week'; }
      else if (r.includes('M') && r !== '1M') { span = 1; type = 'month'; }
      else { span = 1; type = 'day'; }

      if (this.chart) {
        this.chart.setPeriod({ span, type });
      }
    }

    setChartType(chartType) {
      this.currentChartType = chartType;
      this.isHeikinAshi = (chartType === 'heikin_ashi');

      if (!this.chart) return;

      if (chartType === 'bars') {
        this.chart.setStyles({ candle: { type: 'ohlc' } });
      } else if (chartType === 'line' || chartType === 'area') {
        this.chart.setStyles({ candle: { type: 'area' } });
      } else {
        this.chart.setStyles({ candle: { type: 'candle_solid' } });
      }

      // Re-apply data if converting to/from Heikin Ashi
      if (window.tvDatafeed) {
        window.tvDatafeed.reapplyCurrentData();
      }
    }
  }

  window.tvChartEngine = new TVChartEngine();
})(window);
