'use client';

import React, { useEffect, useRef } from 'react';
import { resolveTradingViewSymbol } from './symbol-resolver';

interface TvTickerTagProps {
  symbol: string;
  className?: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'tv-ticker-tag': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { symbol?: string }, HTMLElement>;
    }
  }
}

export default function TvTickerTag({ symbol, className }: TvTickerTagProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scriptSrc = 'https://widgets.tradingview-widget.com/w/en/tv-ticker-tag.js';
    let script = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement;

    const resolved = resolveTradingViewSymbol(symbol);
    const full = resolved.fullSymbol || (symbol.includes(':') ? symbol : `NASDAQ:${symbol}`);

    const mountTag = () => {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';
      const tag = document.createElement('tv-ticker-tag');
      tag.setAttribute('symbol', full);
      tag.style.display = 'inline-flex';
      tag.style.alignItems = 'center';
      containerRef.current.appendChild(tag);
      if (window.customElements && typeof window.customElements.upgrade === 'function') {
        window.customElements.upgrade(tag);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.type = 'module';
      script.src = scriptSrc;
      script.async = true;
      script.onload = () => mountTag();
      document.head.appendChild(script);
    } else {
      mountTag();
    }
  }, [symbol]);

  return (
    <div
      ref={containerRef}
      className={`inline-flex items-center justify-end min-h-[24px] ${className || ''}`}
    />
  );
}
