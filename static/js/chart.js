/**
 * High-Performance HTML5 Canvas Candlestick, Volume & Multi-Pane Chart Engine
 * Features:
 * - Historical & Kronos AI Predicted Continuation Candles with Uncertainty Envelope
 * - Multi-Pane RSI(14) Oscillator Sub-Chart with 30/70 Overbought/Oversold Bands
 * - Candle Pattern Recognition Markers (Engulfing, Pin Bar, Breakout)
 * - On-Chart AI Trade Badges (B+, S-, SL, TP1, TP2) with Risk/Reward Projection Lines
 * - SMA 20/50 & Bollinger Bands Overlays
 * - Interactive Crosshair, Telemetry HUD, Drag Pan & Scroll Zoom
 */

class TradingChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    this.historicalCandles = [];
    this.forecastCandles = [];
    this.indicators = null;
    this.tradeMarkers = [];
    
    // Viewport and coordinate state
    this.lookbackVisible = 90;
    this.panOffset = 0; // Negative means panned right
    this.hoverIndex = -1;
    this.isDragging = false;
    this.dragStartX = 0;
    
    // Layout geometry
    this.padding = { top: 25, right: 75, bottom: 40, left: 15 };
    this.volumeHeightFraction = 0.18;
    
    // Feature Toggles (inspired by auto_trader / TradingView)
    this.showSMA = true;
    this.showBollinger = true;
    this.showVolume = true;
    this.showRSI = true;
    this.showPatterns = true;
    
    this.initEvents();
    this.resize();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.scale(dpr, dpr);
    
    this.render();
  }

  setData(historical, forecast = [], indicators = null, tradeMarkers = []) {
    this.historicalCandles = historical || [];
    this.forecastCandles = forecast || [];
    this.indicators = indicators;
    this.tradeMarkers = tradeMarkers || [];
    this.panOffset = 0;
    this.render();
  }

  updateLastCandle(candle) {
    if (!this.historicalCandles || this.historicalCandles.length === 0) {
      this.historicalCandles = [candle];
      this.render();
      return;
    }
    const last = this.historicalCandles[this.historicalCandles.length - 1];
    const isSameBar = (candle.ts && last.ts === candle.ts) || 
                      (candle.time && last.time === candle.time) ||
                      (candle.time_sec && last.time_sec === candle.time_sec);
    if (isSameBar) {
      last.close = candle.close;
      last.high = Math.max(last.high, candle.high);
      last.low = Math.min(last.low, candle.low);
      last.volume = Math.max(last.volume || 0, candle.volume || last.volume || 100);
    } else {
      this.historicalCandles.push(candle);
      if (this.historicalCandles.length > 1000) {
        this.historicalCandles.shift();
      }
    }
    this.render();
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (this.isDragging) {
        const dx = x - this.dragStartX;
        this.panOffset += dx / this.getCandleWidth();
        this.dragStartX = x;
        this.render();
        return;
      }
      
      this.updateHover(x, y);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverIndex = -1;
      this.render();
      if (window.onChartHover) window.onChartHover(null);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      const rect = this.canvas.getBoundingClientRect();
      this.dragStartX = e.clientX - rect.left;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
      this.lookbackVisible = Math.max(25, Math.min(260, Math.round(this.lookbackVisible * zoomFactor)));
      this.render();
    }, { passive: false });
  }

  getAllCandles() {
    return [...this.historicalCandles, ...this.forecastCandles];
  }

  getCandleWidth() {
    const chartWidth = this.width - this.padding.left - this.padding.right;
    return chartWidth / this.lookbackVisible;
  }

  updateHover(x, y) {
    const chartLeft = this.padding.left;
    const chartWidth = this.width - this.padding.left - this.padding.right;
    if (x < chartLeft || x > chartLeft + chartWidth) {
      this.hoverIndex = -1;
      this.render();
      return;
    }

    const allCandles = this.getAllCandles();
    if (allCandles.length === 0) return;

    const candleWidth = this.getCandleWidth();
    const visibleStart = Math.max(0, allCandles.length - this.lookbackVisible - Math.round(this.panOffset));
    const indexOffset = Math.floor((x - chartLeft) / candleWidth);
    const targetIdx = visibleStart + indexOffset;

    if (targetIdx >= 0 && targetIdx < allCandles.length) {
      this.hoverIndex = targetIdx;
      this.render(x, y);
      if (window.onChartHover) {
        window.onChartHover(allCandles[targetIdx], targetIdx >= this.historicalCandles.length);
      }
    } else {
      this.hoverIndex = -1;
      this.render();
    }
  }

  render(cursorX = null, cursorY = null) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';
    
    // Clear canvas and draw background
    ctx.fillStyle = isLight ? '#ffffff' : '#131722';
    ctx.fillRect(0, 0, w, h);

    const allCandles = this.getAllCandles();
    if (!allCandles || allCandles.length === 0) {
      ctx.fillStyle = isLight ? '#5a6573' : '#787b86';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('Loading market chart…', w / 2, h / 2);
      return;
    }

    const candleWidth = this.getCandleWidth();
    const totalVisible = this.lookbackVisible;
    let visibleStart = Math.max(0, allCandles.length - totalVisible - Math.round(this.panOffset));
    let visibleEnd = Math.min(allCandles.length, visibleStart + totalVisible);

    const visibleCandles = allCandles.slice(visibleStart, visibleEnd);
    if (visibleCandles.length === 0) return;

    // Price scaling
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    for (const c of visibleCandles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    }

    const priceBuffer = (maxPrice - minPrice) * 0.08 || 1;
    minPrice -= priceBuffer;
    maxPrice += priceBuffer;

    // Layout partitioning: Main Chart | Volume | RSI Sub-pane
    const totalHeight = h - this.padding.top - this.padding.bottom;
    let rsiHeight = 0;
    let rsiTop = 0;
    let mainAndVolHeight = totalHeight;

    if (this.showRSI) {
      rsiHeight = Math.max(55, Math.floor(totalHeight * 0.22));
      mainAndVolHeight = totalHeight - rsiHeight - 12;
      rsiTop = this.padding.top + mainAndVolHeight + 12;
    }

    const mainChartHeight = mainAndVolHeight * (1 - this.volumeHeightFraction);
    const volumeTop = this.padding.top + mainChartHeight + 8;
    const volumeHeight = mainAndVolHeight * this.volumeHeightFraction - 8;

    const priceToY = (price) => {
      const norm = (price - minPrice) / (maxPrice - minPrice);
      return this.padding.top + mainChartHeight * (1 - norm);
    };

    const indexToX = (index) => {
      return this.padding.left + (index - visibleStart) * candleWidth + candleWidth / 2;
    };

    // 1. Draw Grid lines and Right Price Axis
    this.drawGrid(ctx, minPrice, maxPrice, priceToY, visibleCandles, visibleStart, indexToX, mainChartHeight);

    // 2. Draw Forecast Envelope (Uncertainty corridor)
    if (this.forecastCandles.length > 0) {
      this.drawForecastEnvelope(ctx, allCandles, visibleStart, visibleEnd, indexToX, priceToY);
    }

    // 3. Draw Bollinger Bands
    if (this.showBollinger && this.indicators) {
      this.drawBollinger(ctx, visibleStart, visibleEnd, indexToX, priceToY);
    }

    // 4. Draw Moving Averages
    if (this.showSMA && this.indicators) {
      this.drawIndicators(ctx, visibleStart, visibleEnd, indexToX, priceToY);
    }

    // 5. Draw Candlesticks and Volume Bars
    const splitIndex = this.historicalCandles.length;
    for (let i = visibleStart; i < visibleEnd; i++) {
      const c = allCandles[i];
      const cx = indexToX(i);
      const isForecast = i >= splitIndex;
      const isBull = c.close >= c.open;

      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);

      const topY = Math.min(openY, closeY);
      const bodyH = Math.max(2, Math.abs(closeY - openY));
      const bodyW = Math.max(2, candleWidth * 0.72);

      // Volume Bar
      if (this.showVolume && maxVolume > 0) {
        const normVol = c.volume / maxVolume;
        const vH = Math.max(1, normVol * volumeHeight);
        const vy = volumeTop + volumeHeight - vH;

        ctx.fillStyle = isForecast
          ? (isBull ? 'rgba(0, 229, 255, 0.25)' : 'rgba(168, 85, 247, 0.25)')
          : (isBull ? 'rgba(8, 153, 129, 0.25)' : 'rgba(242, 54, 69, 0.25)');
        ctx.fillRect(cx - bodyW / 2, vy, bodyW, vH);
      }

      // Candlestick Body & Wicks
      if (isForecast) {
        // Futuristic Kronos projection styling
        const neonColor = isBull ? (isLight ? '#0284c7' : '#00e5ff') : (isLight ? '#7e57c2' : '#c084fc');
        const neonFill = isBull ? 'rgba(2, 132, 199, 0.25)' : 'rgba(126, 87, 194, 0.25)';

        ctx.strokeStyle = neonColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, highY);
        ctx.lineTo(cx, lowY);
        ctx.stroke();

        ctx.fillStyle = neonFill;
        ctx.fillRect(cx - bodyW / 2, topY, bodyW, bodyH);
        ctx.strokeStyle = neonColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - bodyW / 2, topY, bodyW, bodyH);
      } else {
        // High-contrast authentic TradingView financial candles
        const color = isBull ? '#089981' : '#f23645';

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, highY);
        ctx.lineTo(cx, lowY);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.fillRect(cx - bodyW / 2, topY, bodyW, bodyH);
      }
    }

    // 6. Draw High & Low Extreme Watermarks (matching auto_trader Screenshot 1)
    this.drawExtremes(ctx, visibleCandles, visibleStart, indexToX, priceToY);

    // 7. Draw Current Price Line & Axis Badge
    this.drawLastPriceLine(ctx, allCandles, priceToY, w - this.padding.right);

    // 8. Draw Candle Pattern Annotations (Pin Bar, Engulfing - matching auto_trader Screenshot 1)
    if (this.showPatterns && this.indicators && this.indicators.patterns) {
      this.drawPatterns(ctx, visibleStart, visibleEnd, indexToX, priceToY);
    }

    // 9. Draw On-Chart Trade Markers (B+, S-, SL, TP - matching auto_trader Screenshot 2)
    this.drawTradeMarkers(ctx, visibleStart, visibleEnd, indexToX, priceToY, candleWidth);

    // 10. Draw Kronos Projection Divider Line
    if (this.forecastCandles.length > 0 && splitIndex >= visibleStart && splitIndex <= visibleEnd) {
      const splitX = indexToX(splitIndex) - candleWidth / 2;
      ctx.strokeStyle = isLight ? 'rgba(2, 132, 199, 0.75)' : 'rgba(0, 229, 255, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(splitX, this.padding.top);
      ctx.lineTo(splitX, this.padding.top + mainChartHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = isLight ? '#0284c7' : '#00e5ff';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.fillText('⚡ KRONOS 102.3M HORIZON ➔', splitX + 6, this.padding.top + 16);
    }

    // 11. Draw RSI Sub-Pane (matching auto_trader Screenshot 1)
    if (this.showRSI && this.indicators) {
      this.drawRSI(ctx, visibleStart, visibleEnd, indexToX, rsiTop, rsiHeight);
    }

    // 12. Draw Interactive Crosshair
    if (this.hoverIndex >= visibleStart && this.hoverIndex < visibleEnd && cursorX !== null) {
      const hx = indexToX(this.hoverIndex);
      const candle = allCandles[this.hoverIndex];
      const candleCloseY = priceToY(candle.close);

      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hx, this.padding.top);
      ctx.lineTo(hx, h - this.padding.bottom);
      ctx.stroke();

      // Horizontal line
      const hy = cursorY !== null ? cursorY : candleCloseY;
      ctx.beginPath();
      ctx.moveTo(this.padding.left, hy);
      ctx.lineTo(w - this.padding.right, hy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right Axis Price Badge
      const curPrice = maxPrice - ((hy - this.padding.top) / mainChartHeight) * (maxPrice - minPrice);
      ctx.fillStyle = '#2962ff';
      ctx.fillRect(w - this.padding.right + 2, hy - 10, 70, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(curPrice.toFixed(1), w - this.padding.right + 37, hy + 4);

      // Bottom Date/Time Badge
      ctx.fillStyle = isLight ? '#ffffff' : '#2a2e39';
      const timeStr = candle.time ? candle.time.split(' ')[1] || candle.time : '';
      ctx.fillRect(hx - 35, h - this.padding.bottom + 4, 70, 20);
      if (isLight) {
        ctx.strokeStyle = '#e0e3eb';
        ctx.strokeRect(hx - 35, h - this.padding.bottom + 4, 70, 20);
      }
      ctx.fillStyle = isLight ? '#131722' : '#d1d4dc';
      ctx.fillText(timeStr, hx, h - this.padding.bottom + 18);
    }
  }

  drawGrid(ctx, minPrice, maxPrice, priceToY, visibleCandles, visibleStart, indexToX, mainH) {
    const w = this.width;
    const h = this.height;
    const rightAxisX = w - this.padding.right;
    const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';

    const stepCount = 5;
    const priceStep = (maxPrice - minPrice) / stepCount;

    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.font = '11px JetBrains Mono';
    ctx.fillStyle = isLight ? '#5a6573' : '#787b86';
    ctx.textAlign = 'left';

    for (let i = 0; i <= stepCount; i++) {
      const p = minPrice + i * priceStep;
      const py = priceToY(p);

      ctx.beginPath();
      ctx.moveTo(this.padding.left, py);
      ctx.lineTo(rightAxisX, py);
      ctx.stroke();

      ctx.fillText(p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }), rightAxisX + 8, py + 4);
    }

    const timeInterval = Math.max(1, Math.floor(visibleCandles.length / 5));
    for (let i = 0; i < visibleCandles.length; i += timeInterval) {
      const globalIdx = visibleStart + i;
      const tx = indexToX(globalIdx);
      const c = visibleCandles[i];

      ctx.beginPath();
      ctx.moveTo(tx, this.padding.top);
      ctx.lineTo(tx, this.padding.top + mainH);
      ctx.stroke();

      if (c && c.time) {
        ctx.fillStyle = isLight ? '#5a6573' : '#787b86';
        ctx.textAlign = 'center';
        const parts = c.time.split(' ');
        ctx.fillText(parts[1] || parts[0], tx, h - this.padding.bottom + 18);
      }
    }

    // Border separating main chart and volume
    ctx.strokeStyle = isLight ? '#e0e3eb' : '#2a2e39';
    ctx.beginPath();
    ctx.moveTo(this.padding.left, this.padding.top + mainH);
    ctx.lineTo(rightAxisX, this.padding.top + mainH);
    ctx.stroke();

    // Right vertical axis border
    ctx.beginPath();
    ctx.moveTo(rightAxisX, this.padding.top);
    ctx.lineTo(rightAxisX, h - this.padding.bottom);
    ctx.stroke();

    // Bottom horizontal axis border
    ctx.beginPath();
    ctx.moveTo(this.padding.left, h - this.padding.bottom);
    ctx.lineTo(w, h - this.padding.bottom);
    ctx.stroke();
  }

  // Draw High & Low Extreme Watermarks (matching auto_trader Screenshot 1)
  drawExtremes(ctx, visibleCandles, visibleStart, indexToX, priceToY) {
    if (!visibleCandles || visibleCandles.length === 0) return;
    const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';

    let maxC = visibleCandles[0];
    let maxIdx = 0;
    let minC = visibleCandles[0];
    let minIdx = 0;

    for (let i = 0; i < visibleCandles.length; i++) {
      const c = visibleCandles[i];
      if (c.high > maxC.high) { maxC = c; maxIdx = i; }
      if (c.low < minC.low) { minC = c; minIdx = i; }
    }

    ctx.save();
    ctx.font = '10px JetBrains Mono';
    ctx.fillStyle = isLight ? '#131722' : '#d1d4dc';
    ctx.strokeStyle = isLight ? '#131722' : '#d1d4dc';
    ctx.lineWidth = 1;

    // High extreme mark
    const highX = indexToX(visibleStart + maxIdx);
    const highY = priceToY(maxC.high);
    ctx.beginPath();
    ctx.moveTo(highX, highY - 2);
    ctx.lineTo(highX + 10, highY - 2);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillText(maxC.high.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }), highX + 12, highY + 1);

    // Low extreme mark
    const lowX = indexToX(visibleStart + minIdx);
    const lowY = priceToY(minC.low);
    ctx.beginPath();
    ctx.moveTo(lowX, lowY + 2);
    ctx.lineTo(lowX + 10, lowY + 2);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillText(minC.low.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }), lowX + 12, lowY + 4);

    ctx.restore();
  }

  // Draw Horizontal Current Price Line & Axis Pill (matching auto_trader Screenshot 1 & 2)
  drawLastPriceLine(ctx, allCandles, priceToY, rightAxisX) {
    if (!allCandles || allCandles.length === 0) return;
    const last = allCandles[allCandles.length - 1];
    const py = priceToY(last.close);

    ctx.save();
    ctx.strokeStyle = '#9397a6';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(this.padding.left, py);
    ctx.lineTo(rightAxisX, py);
    ctx.stroke();
    ctx.setLineDash([]);

    // Right axis price badge
    ctx.fillStyle = '#9397a6';
    ctx.fillRect(rightAxisX + 1, py - 9, 68, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText(last.close.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }), rightAxisX + 35, py + 4);
    ctx.restore();
  }

  drawForecastEnvelope(ctx, allCandles, visibleStart, visibleEnd, indexToX, priceToY) {
    const splitIndex = this.historicalCandles.length;
    const fStart = Math.max(visibleStart, splitIndex);
    const fEnd = Math.min(visibleEnd, allCandles.length);

    if (fStart >= fEnd) return;

    ctx.save();
    ctx.beginPath();
    for (let i = fStart; i < fEnd; i++) {
      const x = indexToX(i);
      const y = priceToY(allCandles[i].high);
      if (i === fStart) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = fEnd - 1; i >= fStart; i--) {
      const x = indexToX(i);
      const y = priceToY(allCandles[i].low);
      ctx.lineTo(x, y);
    }
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, this.padding.top, 0, this.height);
    gradient.addColorStop(0, 'rgba(0, 229, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  drawIndicators(ctx, visibleStart, visibleEnd, indexToX, priceToY) {
    const sma20 = this.indicators.series_sma20 || [];
    const sma50 = this.indicators.series_sma50 || [];

    // SMA 20 (Gold)
    if (sma20.length > 0) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      for (let i = visibleStart; i < visibleEnd && i < sma20.length; i++) {
        const val = sma20[i];
        if (val) {
          const x = indexToX(i);
          const y = priceToY(val);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // SMA 50 (Sky Blue)
    if (sma50.length > 0) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      for (let i = visibleStart; i < visibleEnd && i < sma50.length; i++) {
        const val = sma50[i];
        if (val) {
          const x = indexToX(i);
          const y = priceToY(val);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  }

  drawBollinger(ctx, visibleStart, visibleEnd, indexToX, priceToY) {
    const bbUpper = this.indicators.series_bb_upper || [];
    const bbLower = this.indicators.series_bb_lower || [];
    if (bbUpper.length === 0 || bbLower.length === 0) return;

    ctx.save();
    ctx.beginPath();
    let started = false;
    for (let i = visibleStart; i < visibleEnd && i < bbUpper.length; i++) {
      const u = bbUpper[i];
      if (u) {
        const x = indexToX(i);
        const y = priceToY(u);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
    }
    for (let i = Math.min(visibleEnd - 1, bbLower.length - 1); i >= visibleStart; i--) {
      const l = bbLower[i];
      if (l) {
        const x = indexToX(i);
        const y = priceToY(l);
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(129, 140, 248, 0.08)';
    ctx.fill();

    // Upper Line
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    started = false;
    for (let i = visibleStart; i < visibleEnd && i < bbUpper.length; i++) {
      const u = bbUpper[i];
      if (u) {
        const x = indexToX(i);
        const y = priceToY(u);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Lower Line
    ctx.beginPath();
    started = false;
    for (let i = visibleStart; i < visibleEnd && i < bbLower.length; i++) {
      const l = bbLower[i];
      if (l) {
        const x = indexToX(i);
        const y = priceToY(l);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Draw Candle Pattern Badges (Engulf, Pin Bar - matching auto_trader Screenshot 1)
  drawPatterns(ctx, visibleStart, visibleEnd, indexToX, priceToY) {
    const patterns = this.indicators.patterns || [];
    ctx.save();
    ctx.font = 'bold 9px Inter';
    ctx.textAlign = 'center';

    for (const p of patterns) {
      if (p.index >= visibleStart && p.index < visibleEnd) {
        const x = indexToX(p.index);
        const y = priceToY(p.price);
        const isBull = p.direction === 'bull';
        const color = isBull ? '#089981' : '#f23645';

        ctx.fillStyle = color;
        ctx.beginPath();
        if (isBull) {
          ctx.moveTo(x, y + 10);
          ctx.lineTo(x - 3.5, y + 16);
          ctx.lineTo(x + 3.5, y + 16);
          ctx.fill();
          ctx.fillText(p.text, x, y + 26);
        } else {
          ctx.moveTo(x, y - 10);
          ctx.lineTo(x - 3.5, y - 16);
          ctx.lineTo(x + 3.5, y - 16);
          ctx.fill();
          ctx.fillText(p.text, x, y - 19);
        }
      }
    }
    ctx.restore();
  }

  // Draw On-Chart Trade Markers (B+, S-, SL, TP - matching auto_trader Screenshot 2)
  drawTradeMarkers(ctx, visibleStart, visibleEnd, indexToX, priceToY, candleWidth) {
    if (!this.tradeMarkers || this.tradeMarkers.length === 0) return;
    const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';
    ctx.save();
    const rightAxisX = this.width - this.padding.right;

    // Draw spline / trailing path between trades (matching auto_trader Screenshot 2)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    let started = false;
    for (const m of this.tradeMarkers) {
      if (m.bar_index >= visibleStart && m.bar_index < visibleEnd) {
        const mx = indexToX(m.bar_index);
        const my = priceToY(m.entry);
        if (!started) { ctx.moveTo(mx, my); started = true; }
        else { ctx.lineTo(mx, my); }
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    for (const m of this.tradeMarkers) {
      if (m.bar_index >= visibleStart && m.bar_index < visibleEnd) {
        const x = indexToX(m.bar_index);
        const entryY = priceToY(m.entry);
        const tpY = priceToY(m.tp1);
        const slY = priceToY(m.sl);
        const isBuy = m.action === 'BUY';

        // 1. Entry Badge (B+ or S-)
        ctx.fillStyle = isBuy ? '#089981' : '#26a69a';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x - 14, entryY - 9, 28, 18, 3);
        else ctx.rect(x - 14, entryY - 9, 28, 18);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(m.label, x, entryY + 4);

        // 2. Take Profit Horizontal Line & Tag
        ctx.strokeStyle = isLight ? '#0284c7' : '#00e5ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x + 14, tpY);
        ctx.lineTo(rightAxisX, tpY);
        ctx.stroke();

        ctx.fillStyle = isLight ? '#0284c7' : 'rgba(0, 229, 255, 0.9)';
        ctx.fillRect(rightAxisX - 42, tpY - 8, 40, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px JetBrains Mono';
        ctx.fillText('TP1', rightAxisX - 22, tpY + 4);

        // 3. Stop Loss Horizontal Line & Tag (SL)
        ctx.strokeStyle = '#f23645';
        ctx.beginPath();
        ctx.moveTo(x + 14, slY);
        ctx.lineTo(rightAxisX, slY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#f23645';
        ctx.fillRect(rightAxisX - 42, slY - 8, 40, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('SL', rightAxisX - 22, slY + 4);
      }
    }
    ctx.restore();
  }

  // Draw Dedicated RSI Sub-Pane (matching auto_trader Screenshot 1)
  drawRSI(ctx, visibleStart, visibleEnd, indexToX, rsiTop, rsiHeight) {
    const rsiSeries = this.indicators.series_rsi || [];
    if (rsiSeries.length === 0) return;
    const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';

    const rightAxisX = this.width - this.padding.right;
    const rsiToY = (rsiVal) => {
      const norm = Math.max(0, Math.min(100, rsiVal)) / 100;
      return rsiTop + rsiHeight * (1 - norm);
    };

    ctx.save();

    // Top separator border
    ctx.strokeStyle = isLight ? '#e0e3eb' : '#2a2e39';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.padding.left, rsiTop - 6);
    ctx.lineTo(rightAxisX, rsiTop - 6);
    ctx.stroke();

    // Right vertical axis border for RSI
    ctx.beginPath();
    ctx.moveTo(rightAxisX, rsiTop - 6);
    ctx.lineTo(rightAxisX, rsiTop + rsiHeight);
    ctx.stroke();

    // Shaded 30-70 corridor (soft lavender purple)
    const y70 = rsiToY(70);
    const y30 = rsiToY(30);
    ctx.fillStyle = isLight ? 'rgba(126, 87, 194, 0.07)' : 'rgba(168, 85, 247, 0.04)';
    ctx.fillRect(this.padding.left, y70, rightAxisX - this.padding.left, y30 - y70);

    // 70 Line (Overbought - dashed purple/gray)
    ctx.strokeStyle = 'rgba(126, 87, 194, 0.4)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(this.padding.left, y70);
    ctx.lineTo(rightAxisX, y70);
    ctx.stroke();

    // 30 Line (Oversold - dashed purple/gray)
    ctx.beginPath();
    ctx.moveTo(this.padding.left, y30);
    ctx.lineTo(rightAxisX, y30);
    ctx.stroke();

    // 50 Middle Line
    const y50 = rsiToY(50);
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(this.padding.left, y50);
    ctx.lineTo(rightAxisX, y50);
    ctx.stroke();
    ctx.setLineDash([]);

    // Right Axis Labels
    ctx.font = '10px JetBrains Mono';
    ctx.fillStyle = isLight ? '#5a6573' : '#787b86';
    ctx.textAlign = 'left';
    ctx.fillText('70.0', rightAxisX + 6, y70 + 3);
    ctx.fillText('50.0', rightAxisX + 6, y50 + 3);
    ctx.fillText('30.0', rightAxisX + 6, y30 + 3);

    // Draw RSI Line (Purple)
    ctx.strokeStyle = '#7e57c2';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    for (let i = visibleStart; i < visibleEnd && i < rsiSeries.length; i++) {
      const val = rsiSeries[i];
      if (val !== undefined && val !== null) {
        const x = indexToX(i);
        const y = rsiToY(val);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Top-Left RSI Badge (auto_trader pattern)
    const currentRSI = rsiSeries[Math.min(rsiSeries.length - 1, visibleEnd - 1)] || 61.34;
    ctx.fillStyle = '#7e57c2';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText(`RSI(14)  RSI:${currentRSI.toFixed(2)}`, this.padding.left + 4, rsiTop + 8);

    ctx.restore();
  }
}

window.TradingChart = TradingChart;
