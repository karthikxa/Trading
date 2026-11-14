'use client';

import { useEffect, useRef, useState } from 'react';

// Preload scripts into browser cache for sub-millisecond execution
const PRELOAD_SCRIPTS = [
  'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js',
  'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js',
  'https://s3.tradingview.com/external-embedding/embed-widget-financials.js',
  'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js',
  'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js',
  'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js',
];

if (typeof window !== 'undefined') {
  // Preload script links in head
  PRELOAD_SCRIPTS.forEach((url) => {
    const existing = document.querySelector(`link[href="${url}"]`);
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = url;
      document.head.appendChild(link);
    }
  });

  // Inject CSS to eliminate any TradingView watermark, copyright, or redirect links
  const styleId = 'tradingview-no-redirect-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .tradingview-widget-copyright,
      .tradingview-widget-container__widget + div,
      [class*="copyright"],
      a[href*="tradingview.com"] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        height: 0 !important;
        width: 0 !important;
        opacity: 0 !important;
        position: absolute !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Intercept any external redirect to TradingView and route back into terminal tab
  const originalOpen = window.open;
  window.open = function (url?: string | URL, target?: string, features?: string) {
    if (typeof url === 'string' && (url.includes('tradingview.com') || url.includes('tradingview-widget.com'))) {
      const symbolMatch = url.match(/\/symbols\/([^/?#]+)/i) || url.match(/[?&]symbol=([^&#]+)/i);
      if (symbolMatch && symbolMatch[1]) {
        const extracted = decodeURIComponent(symbolMatch[1]).replace(/-/g, ':');
        window.dispatchEvent(
          new CustomEvent('selected-stock-symbol', {
            detail: { symbol: extracted },
          }),
        );
      }
      return null;
    }
    return originalOpen.call(window, url, target, features);
  };

  // Intercept any click on TradingView anchor tags
  document.addEventListener(
    'click',
    (e) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (target && target.href && (target.href.includes('tradingview.com') || target.href.includes('tradingview-widget.com'))) {
        e.preventDefault();
        e.stopPropagation();
        const symbolMatch = target.href.match(/\/symbols\/([^/?#]+)/i) || target.href.match(/[?&]symbol=([^&#]+)/i);
        if (symbolMatch && symbolMatch[1]) {
          const extracted = decodeURIComponent(symbolMatch[1]).replace(/-/g, ':');
          window.dispatchEvent(
            new CustomEvent('selected-stock-symbol', {
              detail: { symbol: extracted },
            }),
          );
        }
      }
    },
    true,
  );

  // Suppress known transient errors from external TradingView embed scripts
  const suppressTvError = (msg: string) => {
    return (
      msg.includes('querySelector') ||
      msg.includes('tradingview') ||
      msg.includes('_replaceScript') ||
      msg.includes('embed-widget') ||
      msg.includes('Failed to fetch') ||
      msg.includes('ERR_CONNECTION_RESET') ||
      msg.includes('contentWindow') ||
      msg.includes('Cannot listen to the event')
    );
  };

  const prevOnError = window.onerror;
  window.onerror = function (msg, url, line, col, error) {
    if (typeof msg === 'string' && suppressTvError(msg)) {
      return true;
    }
    return prevOnError ? prevOnError(msg, url, line, col, error) : false;
  };

  window.addEventListener(
    'error',
    (event) => {
      const msg = event.message || '';
      const file = event.filename || '';
      if (suppressTvError(msg) || file.includes('tradingview.com')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
}

// Global queue to stagger initial script insertions to prevent CDN burst / ERR_CONNECTION_RESET
let scriptLoadQueue: (() => void)[] = [];
let isQueueRunning = false;

function processQueue() {
  if (isQueueRunning || scriptLoadQueue.length === 0) return;
  isQueueRunning = true;
  const task = scriptLoadQueue.shift();
  if (task) {
    try {
      task();
    } catch {
      // ignore
    }
  }
  setTimeout(() => {
    isQueueRunning = false;
    processQueue();
  }, 250);
}

function queueWidgetScript(mountFn: () => void) {
  scriptLoadQueue.push(mountFn);
  processQueue();
}

const useTradingViewWidget = (
  scriptUrl: string,
  config: Record<string, unknown>,
  lazy: boolean = false,
) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const serializedConfig = JSON.stringify(config);
  const [inView, setInView] = useState(!lazy);

  useEffect(() => {
    if (!lazy || inView) return;
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [lazy, inView]);

  useEffect(() => {
    if (!inView) return;
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    const existingScript = container.querySelector('script');
    if (
      existingScript &&
      existingScript.src === scriptUrl &&
      (existingScript.textContent === serializedConfig || existingScript.innerHTML === serializedConfig)
    ) {
      return;
    }

    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.width = '100%';
    widgetDiv.style.height = '100%';
    container.appendChild(widgetDiv);

    queueWidgetScript(() => {
      if (!container) return;
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.type = 'text/javascript';
      script.text = serializedConfig;
      container.appendChild(script);
    });
  }, [inView, scriptUrl, serializedConfig]);

  return containerRef;
};

export default useTradingViewWidget;
