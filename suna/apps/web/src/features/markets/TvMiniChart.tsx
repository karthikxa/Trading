'use client';

import React, { useEffect, useRef } from 'react';

interface TvMiniChartProps {
  symbol: string;
  width?: number | string;
  height?: number | string;
}

export default function TvMiniChart({
  symbol,
  width = 340,
  height = 120,
}: TvMiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scriptSrc = 'https://widgets.tradingview-widget.com/w/en/tv-mini-chart.js';
    let script = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement;

    const mountChart = () => {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';
      const chartEl = document.createElement('tv-mini-chart');
      const cleanSymbol = symbol.includes(':') ? symbol : `NASDAQ:${symbol}`;
      chartEl.setAttribute('symbol', cleanSymbol);
      chartEl.style.width = '100%';
      chartEl.style.height = '100%';
      chartEl.style.display = 'block';
      containerRef.current.appendChild(chartEl);
      if (window.customElements && typeof window.customElements.upgrade === 'function') {
        window.customElements.upgrade(chartEl);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.type = 'module';
      script.src = scriptSrc;
      script.async = true;
      script.onload = () => mountChart();
      document.head.appendChild(script);
    } else {
      mountChart();
    }
  }, [symbol]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden flex items-center justify-end rounded-xl"
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        minWidth: typeof width === 'number' ? `${width}px` : width,
        minHeight: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}
