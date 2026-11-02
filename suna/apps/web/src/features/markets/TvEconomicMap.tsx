'use client';

import React, { memo } from 'react';
import TradingViewWidget from './TradingViewWidget';

const HEATMAP_SCRIPT = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';

const TvEconomicMap = ({ height = 520 }: { height?: number }) => {
  const config = {
    exchanges: [],
    dataSource: 'SPX500',
    grouping: 'sector',
    blockSize: 'market_cap_calc',
    blockColor: 'change',
    locale: 'en',
    symbolUrl: '',
    colorTheme: 'light',
    hasTopBar: true,
    isDataSetEnabled: true,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    width: '100%',
    height,
  };

  return <TradingViewWidget scriptUrl={HEATMAP_SCRIPT} config={config} height={height} allowExpand />;
};

export default memo(TvEconomicMap);

