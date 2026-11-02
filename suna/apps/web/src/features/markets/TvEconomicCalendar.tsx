'use client';

import React, { memo } from 'react';
import TradingViewWidget from './TradingViewWidget';

const CALENDAR_SCRIPT = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';

const TvEconomicCalendar = ({ height = 520 }: { height?: number }) => {
  const config = {
    colorTheme: 'light',
    isTransparent: false,
    width: '100%',
    height,
    locale: 'en',
    importanceFilter: '0,1',
    countryFilter: 'us,eu,gb,jp,cn,in',
  };

  return <TradingViewWidget scriptUrl={CALENDAR_SCRIPT} config={config} height={height} allowExpand />;
};

export default memo(TvEconomicCalendar);

