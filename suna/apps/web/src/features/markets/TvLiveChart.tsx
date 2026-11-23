'use client';

import React, { useEffect, useRef, useState, useId, useMemo, useCallback } from 'react';
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
  onSymbolChange?: (symbol: string) => void;
}

interface DhanLiveTick {
  symbol: string;
  cleanSymbol: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  action?: string;
  message?: string;
  timestamp: number;
}

export default function TvLiveChart({
  symbol,
  height = 560,
  className = '',
  theme = 'light',
  details = true,
  watchlist = [
    'NSE:NIFTY',
    'NSE:BANKNIFTY',
    'BSE:SENSEX',
    'NSE:RELIANCE',
    'NSE:HDFCBANK',
    'NSE:TCS',
    'NSE:INFY',
    'NSE:ICICIBANK',
    'NSE:TATAMOTORS',
    'NSE:SBIN',
    'NSE:BHARTIARTL',
    'NSE:ITC',
    'NSE:BAJFINANCE',
    'NSE:LT',
    'NSE:TATASTEEL',
    'NSE:ZOMATO',
    'NASDAQ:AAPL',
    'NASDAQ:NVDA',
    'CRYPTO:BTCUSD',
  ],
  onExpand,
  onSymbolChange,
}: TvLiveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '_');
  const containerId = `tv_chart_${rawId}`;
  const lastMountedSymbolRef = useRef<string>('');

  const [currentSymbol, setCurrentSymbol] = useState<string>(symbol);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const res = resolveTradingViewSymbol(symbol);
    setCurrentSymbol(res.fullSymbol);
  }, [symbol]);

  useEffect(() => {
    const handleSelectedStock = (e: Event) => {
      const custom = e as CustomEvent<{ symbol: string; name?: string; exchange?: string }>;
      if (custom.detail?.symbol) {
        const res = resolveTradingViewSymbol(custom.detail.symbol, custom.detail.name, custom.detail.exchange);
        setCurrentSymbol(res.fullSymbol);
        if (onSymbolChange) {
          onSymbolChange(res.fullSymbol);
        }
      }
    };
    window.addEventListener('selected-stock-symbol', handleSelectedStock);
    return () => window.removeEventListener('selected-stock-symbol', handleSelectedStock);
  }, [onSymbolChange]);

  const resolved = useMemo(() => resolveTradingViewSymbol(currentSymbol), [currentSymbol]);
  const isIndian =
    resolved.exchange === 'NSE' ||
    resolved.exchange === 'BSE' ||
    ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX'].includes(resolved.cleanSymbol);

  // TradingView Advanced Chart widget configuration with full side watchlist and screener
  const widgetConfig = useMemo(() => {
    return {
      autosize: true,
      symbol: resolved.fullSymbol,
      interval: 'D',
      timezone: isIndian ? 'Asia/Kolkata' : 'Etc/UTC',
      theme: theme,
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: true,
      support_host: 'https://www.tradingview.com',
      hide_top_toolbar: false,
      hide_side_toolbar: isMobile ? true : false,
      withdateranges: true,
      details: isMobile ? false : details,
      hotlist: isMobile ? false : true,
      news: isMobile ? [] : ['headlines'],
      watchlist: isMobile ? [] : watchlist,
      container_id: containerId,
    };
  }, [resolved.fullSymbol, isIndian, theme, details, watchlist, containerId, isMobile]);

  // Mount TradingView Advanced Chart Widget - only remounts when symbol changes
  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    const currentFullSymbol = resolved.fullSymbol;
    // Prevent unmounting or re-running if already mounted for this exact symbol
    if (lastMountedSymbolRef.current === currentFullSymbol && containerRef.current.children.length > 0) {
      return;
    }
    lastMountedSymbolRef.current = currentFullSymbol;

    const container = containerRef.current;
    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.id = containerId;
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.width = '100%';
    widgetDiv.style.height = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify(widgetConfig);

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [resolved.fullSymbol, widgetConfig, containerId]);

  return (
    <div
      className={cn(
        'relative w-full h-full flex flex-col overflow-hidden bg-background select-none',
        className
      )}
      style={{
        height: height === '100%' ? '100%' : height,
        minHeight: typeof height === 'number' ? `${height}px` : height,
      }}
    >
      {/* MAIN CHART CONTAINER */}
      <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden bg-background">
        <div ref={containerRef} className="tradingview-widget-container w-full h-full" />
      </div>

      {/* Top right quick launcher */}
      {onExpand && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={onExpand}
            className="flex size-7 items-center justify-center rounded-lg bg-card/95 backdrop-blur-xs text-muted-foreground hover:text-foreground hover:bg-muted/90 transition-colors cursor-pointer group shadow-2xs border border-border/70"
            title="See chart in fullscreen"
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
        </div>
      )}
    </div>
  );
}

