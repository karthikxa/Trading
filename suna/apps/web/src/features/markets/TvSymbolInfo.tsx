'use client';

import React, { useEffect, useRef, memo } from 'react';
import { cn } from '@kortix/ui';

interface TvSymbolInfoProps {
  symbol: string;
  theme?: 'light' | 'dark';
  className?: string;
}

function TvSymbolInfo({ symbol, theme = 'light', className }: TvSymbolInfoProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    const container = containerRef.current;
    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: symbol,
      colorTheme: theme,
      isTransparent: true,
      locale: 'en',
      width: '100%',
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [symbol, theme]);

  return (
    <div
      ref={containerRef}
      className={cn('tradingview-widget-container w-full overflow-hidden min-h-[96px]', className)}
    />
  );
}

export default memo(TvSymbolInfo);
