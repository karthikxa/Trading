'use client';

import { useEffect, useRef, useState } from 'react';

// Global queue to stagger widget script loading to prevent TradingView CDN connection resets
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
  }, 180);
}

function queueWidgetScript(mountFn: () => void) {
  scriptLoadQueue.push(mountFn);
  processQueue();
}

// Suppress known transient errors from external TradingView embed scripts when React re-mounts
if (typeof window !== 'undefined') {
  const suppressTvError = (msg: string) => {
    return (
      msg.includes('querySelector') ||
      msg.includes('tradingview') ||
      msg.includes('_replaceScript') ||
      msg.includes('embed-widget') ||
      msg.includes('Failed to fetch') ||
      msg.includes('ERR_CONNECTION_RESET')
    );
  };

  const prevOnError = window.onerror;
  window.onerror = function (msg, url, line, col, error) {
    if (typeof msg === 'string' && suppressTvError(msg)) {
      return true; // Suppress
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
    true, // capture phase
  );
}

const useTradingViewWidget = (
  scriptUrl: string,
  config: Record<string, unknown>,
  lazy: boolean = true,
) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(!lazy);
  const serializedConfig = JSON.stringify(config);

  // Intersection observer for lazy loading widgets only when approaching viewport
  useEffect(() => {
    if (!lazy) {
      setIsVisible(true);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '300px' }, // Pre-load 300px before scrolling into view
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [lazy]);

  useEffect(() => {
    if (!isVisible) return;
    const container = containerRef.current;
    if (!container) return;

    // Check if identical widget is already mounted
    const existingScript = container.querySelector('script');
    if (
      existingScript &&
      existingScript.src === scriptUrl &&
      existingScript.textContent === serializedConfig
    ) {
      return;
    }

    // Queue script insertion to prevent concurrent connection bursts
    queueWidgetScript(() => {
      if (!containerRef.current) return;
      const targetContainer = containerRef.current;

      // Clear previous widget
      targetContainer.innerHTML = '';

      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container__widget';
      widgetDiv.style.width = '100%';
      widgetDiv.style.height = '100%';
      targetContainer.appendChild(widgetDiv);

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.type = 'text/javascript';
      script.innerHTML = serializedConfig;
      targetContainer.appendChild(script);
    });
  }, [isVisible, scriptUrl, serializedConfig]);

  return containerRef;
};

export default useTradingViewWidget;
