'use client';

import React, { memo, useState, useEffect } from 'react';
import useTradingViewWidget from './useTradingViewWidget';
import { cn } from '@kortix/ui';
import { ArrowsOut, ArrowsIn } from '@phosphor-icons/react';

interface TradingViewWidgetProps {
  scriptUrl: string;
  config: Record<string, unknown>;
  height?: number;
  className?: string;
  allowExpand?: boolean;
  lazy?: boolean;
}

const TradingViewWidget = ({
  scriptUrl,
  config,
  height = 560,
  className,
  allowExpand = false,
  lazy,
}: TradingViewWidgetProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsExpanded(false);
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isExpanded]);

  const isAdvancedChart = scriptUrl.includes('advanced-chart');
  const shouldLazy = lazy !== undefined ? lazy : !isAdvancedChart;

  const widgetConfig = {
    ...config,
    width: '100%',
    height: isAdvancedChart ? (isExpanded ? '100%' : height) : height,
    ...(isAdvancedChart ? { autosize: true } : {}),
  };

  const containerRef = useTradingViewWidget(scriptUrl, widgetConfig, shouldLazy);

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsExpanded(false)}
        />
      )}
      <div
        className={cn(
          'relative w-full overflow-hidden bg-card transition-all',
          isExpanded && 'fixed inset-4 z-50 shadow-2xl rounded-2xl border border-border/80',
          className,
        )}
        style={isExpanded ? undefined : { height, minHeight: `${height}px` }}
      >
        {allowExpand && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'absolute top-3 right-3 z-10 p-2 rounded-lg bg-card/90 shadow-2xs border border-border/70 hover:bg-muted transition-colors cursor-pointer',
              !isExpanded && 'opacity-0 hover:opacity-100 focus-visible:opacity-100',
            )}
            aria-label={isExpanded ? 'Exit full screen' : 'Full screen'}
            title={isExpanded ? 'Exit full screen (Esc)' : 'Full screen'}
          >
            {isExpanded ? <ArrowsIn className="size-4" /> : <ArrowsOut className="size-4" />}
          </button>
        )}
        <div
          ref={containerRef}
          className={cn('tradingview-widget-container size-full', className)}
          style={{ height: '100%', width: '100%' }}
        />
      </div>
    </>
  );
};

export default memo(TradingViewWidget);
