'use client';

import React, { memo } from 'react';
import TradingViewWidget from './TradingViewWidget';

const TICKER_TAPE_SCRIPT =
  'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';

const TICKER_TAPE_CONFIG = {
  symbols: [
    { proName: 'NASDAQ:AAPL', title: 'Apple' },
    { proName: 'NASDAQ:NVDA', title: 'NVIDIA' },
    { proName: 'NASDAQ:TSLA', title: 'Tesla' },
    { proName: 'NASDAQ:MSFT', title: 'Microsoft' },
    { proName: 'BINANCE:BTCUSDT', title: 'BTC/USDT' },
    { proName: 'FX:EURUSD', title: 'EUR/USD' },
  ],
  showSymbolLogo: true,
  isTransparent: false,
  displayMode: 'adaptive',
  colorTheme: 'light',
  locale: 'en',
};

function TickerTape() {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-2xs">
      <TradingViewWidget scriptUrl={TICKER_TAPE_SCRIPT} config={TICKER_TAPE_CONFIG} height={48} />
    </div>
  );
}

export default memo(TickerTape);

