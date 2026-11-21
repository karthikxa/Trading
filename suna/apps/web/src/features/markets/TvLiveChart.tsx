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

  const [currentSymbol, setCurrentSymbol] = useState<string>(symbol);
  const [liveTick, setLiveTick] = useState<DhanLiveTick | null>(null);
  const [lastTickTime, setLastTickTime] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [chartMode, setChartMode] = useState<'tradingview' | 'studio'>('tradingview');

  const WEBHOOK_PUBLIC_URL = 'https://zed-workspace.onrender.com/api/webhook/dhan';

  useEffect(() => {
    setCurrentSymbol(symbol);
  }, [symbol]);

  useEffect(() => {
    const handleSelectedStock = (e: Event) => {
      const custom = e as CustomEvent<{ symbol: string; name?: string }>;
      if (custom.detail?.symbol) {
        setCurrentSymbol(custom.detail.symbol);
        if (onSymbolChange) {
          onSymbolChange(custom.detail.symbol);
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

  // Auto-switch to studio view if Indian stock is selected and TV widget restriction is common
  useEffect(() => {
    // Keep user's choice if manually toggled
  }, [isIndian]);

  // Connect to SSE stream for real-time Dhan webhooks
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/webhook/dhan?stream=true');
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.price !== undefined) {
            setLiveTick(data);
            setLastTickTime(new Date(data.timestamp || Date.now()).toLocaleTimeString());
          }
        } catch {
          // ignore non-json messages (ping)
        }
      };
      es.onerror = () => {
        // SSE error, will auto-reconnect
      };
    } catch {
      // ignore
    }

    // Also fetch initial latest tick for this symbol
    fetch(`/api/webhook/dhan?symbol=${encodeURIComponent(resolved.cleanSymbol)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res?.latest) {
          setLiveTick(res.latest);
          setLastTickTime(new Date(res.latest.timestamp).toLocaleTimeString());
        }
      })
      .catch(() => {});

    return () => {
      if (es) {
        es.close();
      }
    };
  }, [resolved.cleanSymbol]);

  const copyWebhookUrl = useCallback(() => {
    navigator.clipboard.writeText(WEBHOOK_PUBLIC_URL);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [WEBHOOK_PUBLIC_URL]);

  const copySamplePayload = useCallback(() => {
    const payload = JSON.stringify(
      {
        symbol: '{{ticker}}',
        price: 31.99,
        high: 32.5,
        low: 31.4,
        open: 31.5,
        volume: 120000,
        action: 'ALERT_TRIGGER',
        time: '{{time}}',
      },
      null,
      2
    );
    navigator.clipboard.writeText(payload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  }, []);

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
      hide_side_toolbar: false,
      withdateranges: true,
      details: details,
      hotlist: true,
      news: ['headlines'],
      watchlist: watchlist,
      container_id: containerId,
    };
  }, [resolved.fullSymbol, isIndian, theme, details, watchlist, containerId]);

  // Direct iframe fallback URL encoded
  const fallbackIframeUrl = useMemo(() => {
    const jsonStr = JSON.stringify(widgetConfig);
    return `https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=en#${encodeURIComponent(jsonStr)}`;
  }, [widgetConfig]);

  // Mount TradingView Advanced Chart Widget
  useEffect(() => {
    if (chartMode !== 'tradingview') return;
    if (!containerRef.current || typeof window === 'undefined') return;

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

    let scriptLoaded = false;
    script.onload = () => {
      scriptLoaded = true;
    };

    container.appendChild(script);

    // Fallback timer: if embed script hasn't populated within 1800ms, inject direct responsive iframe
    const fallbackTimer = setTimeout(() => {
      if (!scriptLoaded && container && widgetDiv.children.length === 0) {
        container.innerHTML = `
          <iframe
            src="${fallbackIframeUrl}"
            style="width: 100%; height: 100%; border: none;"
            allowtransparency="true"
            scrolling="no"
            allowfullscreen
          ></iframe>
        `;
      }
    }, 1800);

    return () => {
      clearTimeout(fallbackTimer);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [chartMode, widgetConfig, containerId, fallbackIframeUrl]);

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
        {chartMode === 'tradingview' ? (
          <div ref={containerRef} className="tradingview-widget-container w-full h-full" />
        ) : (
          <iframe
            src="http://localhost:8080"
            className="w-full h-full border-0"
            title="TradingView Indicators Web Studio"
          />
        )}
      </div>

      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          className="absolute top-12 right-12 z-20 flex size-7 items-center justify-center rounded-[4px] bg-white text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer group shadow-2xs border border-zinc-200/60"
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
      )}
    </div>
  );
}

