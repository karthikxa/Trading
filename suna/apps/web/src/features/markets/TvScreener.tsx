'use client';

import React, { memo } from 'react';
import TradingViewWidget from './TradingViewWidget';

const SCREENER_SCRIPT = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';

interface TvScreenerProps {
  height?: number;
  market?: string;
  defaultScreen?: string;
}

const TvScreener = ({
  height = 520,
  market = 'america',
  defaultScreen = 'most_capitalized',
}: TvScreenerProps) => {
  const config = {
    width: '100%',
    height,
    defaultColumn: 'overview',
    defaultScreen,
    market,
    showToolbar: true,
    colorTheme: 'light',
    locale: 'en',
    isTransparent: false,
  };

  return <TradingViewWidget scriptUrl={SCREENER_SCRIPT} config={config} height={height} allowExpand />;
};

export default memo(TvScreener);

