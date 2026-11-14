'use client';

import React, { useEffect, useRef, memo } from 'react';
import { cn } from '@kortix/ui';

interface TvSeasonalChartProps {
  symbol: string;
  height?: number | string;
  className?: string;
}

function TvSeasonalChart({ symbol, height = 440, className }: TvSeasonalChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scriptSrc = 'https://widgets.tradingview-widget.com/w/en/tv-seasonal-chart.js';
    let script = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement;

    const mount = () => {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';
      const el = document.createElement('tv-seasonal-chart');
      el.setAttribute('symbol', symbol);
      el.style.width = '100%';
      el.style.height = typeof height === 'number' ? `${height}px` : height;
      el.style.display = 'block';
      containerRef.current.appendChild(el);
      if (window.customElements && typeof window.customElements.upgrade === 'function') {
        window.customElements.upgrade(el);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.type = 'module';
      script.src = scriptSrc;
      script.async = true;
      script.onload = () => mount();
      document.head.appendChild(script);
    } else {
      mount();
    }
  }, [symbol, height]);

  return (
    <div
      ref={containerRef}
      className={cn('w-full overflow-hidden', className)}
      style={{ minHeight: typeof height === 'number' ? `${height}px` : height }}
    />
  );
}

export default memo(TvSeasonalChart);
