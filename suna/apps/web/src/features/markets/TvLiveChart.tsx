'use client';

import React, { useEffect, useRef, useId } from 'react';
import { cn } from '@kortix/ui';
import { resolveTradingViewSymbol } from './symbol-resolver';

interface TvLiveChartProps {
  symbol: string;
  height?: number | string;
  className?: string;
  theme?: 'light' | 'dark';
  details?: boolean;
  watchlist?: string[];
  onExpand?: () => void;
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
  details = true,
  watchlist = [
    'FX:EURUSD',
    'FX:AUDUSD',
    'FX:USDJPY',
    'FX:GBPUSD',
    'CRYPTO:BTCUSD',
    'CRYPTO:ETHUSD',
    'NASDAQ:AAPL',
    'NASDAQ:TSLA',
    'NASDAQ:NVDA',
  ],
  onExpand,
}: TvLiveChartProps) {
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '_');
  const containerId = `tv_chart_${rawId}`;
  const detailsRef = useRef(details);
  detailsRef.current = details;
  const watchlistRef = useRef(watchlist);
  watchlistRef.current = watchlist;

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
    if (!chartWrapperRef.current || typeof window === 'undefined') return;

    const container = chartWrapperRef.current;
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
          details: detailsRef.current,
          hotlist: true,
          calendar: true,
          news: ['headlines'],
          show_popup_button: true,
          popup_width: '1000',
          popup_height: '650',
          watchlist: watchlistRef.current,
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
      className={cn('relative w-full overflow-hidden rounded-xl bg-white border border-zinc-200/80', className)}
      style={{ height, minHeight: typeof height === 'number' ? `${height}px` : height }}
    >
      <div ref={chartWrapperRef} className="w-full h-full" />
      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          className="absolute top-[6px] right-[46px] z-20 flex size-7 items-center justify-center rounded-[4px] bg-white text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer group shadow-2xs border border-zinc-200/60"
          title="See chart in fullscreen (redirect to Chart menu)"
          aria-label="Expand full screen chart"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 18 18"
            width="15"
            height="15"
            fill="none"
            className="stroke-current text-zinc-700 group-hover:text-zinc-950 transition-colors"
          >
            <path
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.5 3.5H4a1 1 0 0 0-1 1v9.5a1 1 0 0 0 1 1h9.5a1 1 0 0 0 1-1V9.5M10.5 3.5h4v4M14.5 3.5 8.5 9.5"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

