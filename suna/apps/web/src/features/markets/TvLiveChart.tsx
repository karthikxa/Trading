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
      {/* DHAN LIVE WEBHOOK HUD BAR */}
      <div className="h-10 px-3 bg-zinc-900 border-b border-zinc-800 text-white flex items-center justify-between gap-3 text-xs shrink-0 z-30">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-zinc-200 tracking-tight">Dhan Live Bridge</span>

          {liveTick ? (
            <div className="flex items-center gap-2 font-mono text-[11px] bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700">
              <span className="text-zinc-400 font-sans">{liveTick.cleanSymbol}:</span>
              <span className="text-emerald-400 font-bold">₹{liveTick.price.toFixed(2)}</span>
              {liveTick.action && (
                <span className="text-[10px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-sans font-medium">
                  {liveTick.action}
                </span>
              )}
              {lastTickTime && <span className="text-zinc-500 text-[10px]">({lastTickTime})</span>}
            </div>
          ) : (
            <span className="text-zinc-400 text-[11px] hidden sm:inline">
              Listening for Webhook alerts on <code className="text-emerald-400 font-mono">/api/webhook/dhan</code>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Chart Mode Switcher */}
          <div className="flex items-center bg-zinc-800 p-0.5 rounded border border-zinc-700 text-[11px]">
            <button
              type="button"
              onClick={() => setChartMode('tradingview')}
              className={cn(
                'px-2 py-0.5 rounded font-medium transition-colors',
                chartMode === 'tradingview'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              )}
            >
              TradingView Widget
            </button>
            <button
              type="button"
              onClick={() => setChartMode('studio')}
              className={cn(
                'px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1',
                chartMode === 'studio'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              )}
              title="View with custom indicators & no NSE embed restrictions"
            >
              <span>Live Studio (8080)</span>
            </button>
          </div>

          {/* Copy Webhook URL Button */}
          <button
            type="button"
            onClick={copyWebhookUrl}
            className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-mono transition-colors cursor-pointer"
            title="Copy Public Webhook URL to paste in Dhan"
          >
            <span>{copiedLink ? 'Copied URL!' : 'Copy Webhook URL'}</span>
          </button>

          {/* Copy Sample Payload Button */}
          <button
            type="button"
            onClick={copySamplePayload}
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[11px] font-mono transition-colors cursor-pointer"
            title="Copy JSON template for Dhan Alert Message"
          >
            <span>{copiedPayload ? 'Copied JSON!' : 'Copy Alert JSON'}</span>
          </button>
        </div>
      </div>

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

