'use client';

import { useEffect, useRef } from 'react';

// Suppress known transient errors from external TradingView embed scripts when React re-mounts
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (
      event.filename?.includes('tradingview.com') ||
      event.message?.includes("reading 'querySelector'") ||
      event.message?.includes('_replaceScript')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

const useTradingViewWidget = (scriptUrl: string, config: Record<string, unknown>) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const serializedConfig = JSON.stringify(config);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Build the widget anchor element
    container.innerHTML =
      '<div class="tradingview-widget-container__widget" style="width: 100%; height: 100%;"></div>';

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = serializedConfig;
    container.appendChild(script);

    return () => {
      // Delay clearing slightly so any in-flight execution doesn't hit a null parent
      try {
        if (container) {
          container.innerHTML = '';
        }
      } catch {
        /* ignore */
      }
    };
  }, [scriptUrl, serializedConfig]);

  return containerRef;
};

export default useTradingViewWidget;

