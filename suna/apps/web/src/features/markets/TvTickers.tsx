'use client';

import React, { useEffect, useRef, memo } from 'react';
import { cn } from '@kortix/ui';

interface TvTickersProps {
  symbols: string;
  hideChart?: boolean;
  className?: string;
}

function TvTickers({ symbols, hideChart = true, className }: TvTickersProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scriptSrc = 'https://widgets.tradingview-widget.com/w/en/tv-tickers.js';
    let script = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement;

    const mount = () => {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';
      const el = document.createElement('tv-tickers');
      el.setAttribute('symbols', symbols);
      if (hideChart) {
        el.setAttribute('hide-chart', '');
      }
      el.style.width = '100%';
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
  }, [symbols, hideChart]);

  return (
    <div
      ref={containerRef}
      className={cn('w-full overflow-hidden py-1', className)}
    />
  );
}

export default memo(TvTickers);
