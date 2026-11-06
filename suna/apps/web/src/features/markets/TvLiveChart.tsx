'use client';

import React, { useEffect, useRef, useId } from 'react';
import { resolveTradingViewSymbol } from './symbol-resolver';

interface TvLiveChartProps {
  symbol: string;
  height?: number | string;
  className?: string;
  theme?: 'light' | 'dark';
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

export default function TvLiveChart({
  symbol,
  height = 560,
  className = '',
  theme = 'light',
}: TvLiveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '_');
  const containerId = `tv_chart_${rawId}`;

  useEffect(() => {
    // Preload tv.js
    if (typeof window === 'undefined') return;

    const loadScript = () => {
      if (!window.TradingView) {
        if (!document.querySelector('script[src*="tradingview.com/tv.js"]')) {
          const script = document.createElement('script');
          script.src = 'https://s3.tradingview.com/tv.js';
          script.async = true;
          document.head.appendChild(script);
        }
      }
    };
    loadScript();
  }, []);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    const container = containerRef.current;
    container.innerHTML = `<div id="${containerId}" style="width:100%;height:100%;"></div>`;

    const resolved = resolveTradingViewSymbol(symbol);

    let isMounted = true;

    const initWidget = () => {
      if (!isMounted) return;
      if (!window.TradingView) {
        setTimeout(initWidget, 50);
        return;
      }

      try {
        new window.TradingView.widget({
          autosize: true,
          symbol: resolved.fullSymbol,
          interval: 'D',
          timezone: 'Etc/UTC',
          theme: theme,
          style: '1',
          locale: 'en',
          toolbar_bg: theme === 'dark' ? '#09090b' : '#f8fafc',
          enable_publishing: false,
          allow_symbol_change: true,
          withdateranges: true,
          hide_side_toolbar: false,
          container_id: containerId,
        });
      } catch (err) {
        console.warn('[TvLiveChart] Widget init warning:', err);
      }
    };

    initWidget();

    return () => {
      isMounted = false;
    };
  }, [symbol, containerId, theme]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-xl bg-white border border-zinc-200/80 ${className}`}
      style={{ height, minHeight: typeof height === 'number' ? `${height}px` : height }}
    />
  );
}

