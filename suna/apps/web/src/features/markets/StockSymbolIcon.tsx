'use client';

import React, { useState } from 'react';
import { cn } from '@kortix/ui';
import { Landmark, Cpu, Dna, Gem, Globe, Flame } from 'lucide-react';

interface StockSymbolIconProps {
  symbol: string;
  type?: string;
  logoid?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const TRADINGVIEW_KNOWN_LOGOS: Record<string, string> = {
  AAPL: 'https://s3-symbol-logo.tradingview.com/apple.svg',
  NVDA: 'https://s3-symbol-logo.tradingview.com/nvidia.svg',
  TSLA: 'https://s3-symbol-logo.tradingview.com/tesla.svg',
  MSFT: 'https://s3-symbol-logo.tradingview.com/microsoft.svg',
  AMZN: 'https://s3-symbol-logo.tradingview.com/amazon.svg',
  GOOGL: 'https://s3-symbol-logo.tradingview.com/alphabet.svg',
  GOOG: 'https://s3-symbol-logo.tradingview.com/alphabet.svg',
  META: 'https://s3-symbol-logo.tradingview.com/meta.svg',
  NFLX: 'https://s3-symbol-logo.tradingview.com/netflix.svg',
  AMD: 'https://s3-symbol-logo.tradingview.com/advanced-micro-devices.svg',
  INTC: 'https://s3-symbol-logo.tradingview.com/intel.svg',

  // ETFs & Indices
  SPY: 'https://s3-symbol-logo.tradingview.com/indices/s-and-p-500.svg',
  SPX: 'https://s3-symbol-logo.tradingview.com/indices/s-and-p-500.svg',
  INX: 'https://s3-symbol-logo.tradingview.com/indices/s-and-p-500.svg',
  QQQ: 'https://s3-symbol-logo.tradingview.com/indices/nasdaq-100.svg',
  NDX: 'https://s3-symbol-logo.tradingview.com/indices/nasdaq-100.svg',
  DIA: 'https://s3-symbol-logo.tradingview.com/indices/dow-30.svg',
  DJI: 'https://s3-symbol-logo.tradingview.com/indices/dow-30.svg',
  IWM: 'https://s3-symbol-logo.tradingview.com/indices/russell-2000.svg',

  // Crypto
  BTC: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCBTC.svg',
  BTCUSD: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCBTC.svg',
  BTCUSDT: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCBTC.svg',
  ETH: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCETH.svg',
  ETHUSD: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCETH.svg',
  ETHUSDT: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCETH.svg',
  SOL: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCSOL.svg',
  SOLUSD: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCSOL.svg',
  SOLUSDT: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCSOL.svg',
  BNB: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCBNB.svg',
  BNBUSD: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCBNB.svg',
  BNBUSDT: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCBNB.svg',
  XRP: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCXRP.svg',
  XRPUSD: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCXRP.svg',
  XRPUSDT: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCXRP.svg',
  DOGE: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCDOGE.svg',
  DOGEUSD: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCDOGE.svg',
  DOGEUSDT: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCDOGE.svg',
  ADA: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCADA.svg',
  ADAUSD: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCADA.svg',
  ADAUSDT: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCADA.svg',

  // Forex
  EURUSD: 'https://s3-symbol-logo.tradingview.com/country/EU.svg',
  EURGBP: 'https://s3-symbol-logo.tradingview.com/country/EU.svg',
  EURJPY: 'https://s3-symbol-logo.tradingview.com/country/EU.svg',
  GBPUSD: 'https://s3-symbol-logo.tradingview.com/country/GB.svg',
  GBPJPY: 'https://s3-symbol-logo.tradingview.com/country/GB.svg',
  USDJPY: 'https://s3-symbol-logo.tradingview.com/country/JP.svg',
  AUDUSD: 'https://s3-symbol-logo.tradingview.com/country/AU.svg',
  USDCAD: 'https://s3-symbol-logo.tradingview.com/country/CA.svg',
  USDCHF: 'https://s3-symbol-logo.tradingview.com/country/CH.svg',

  // India
  RELIANCE: 'https://s3-symbol-logo.tradingview.com/reliance.svg',
  HDFCBANK: 'https://s3-symbol-logo.tradingview.com/hdfc-bank.svg',
  ICICIBANK: 'https://s3-symbol-logo.tradingview.com/icici-bank.svg',
};

export function StockSymbolIcon({
  symbol,
  type,
  logoid,
  size = 'md',
  className,
}: StockSymbolIconProps) {
  const [imageError, setImageError] = useState(false);
  const cleanSym = symbol.toUpperCase().replace(/^.*:/, '').trim();

  const sizeClasses = {
    xs: 'size-4 text-[9px]',
    sm: 'size-6 text-[10px]',
    md: 'size-8 text-xs',
    lg: 'size-10 text-sm',
  }[size];

  // Try direct TradingView CDN logo if logoid is present or in known dictionary
  const directLogoUrl = logoid
    ? `https://s3-symbol-logo.tradingview.com/${logoid}.svg`
    : TRADINGVIEW_KNOWN_LOGOS[cleanSym];

  if (directLogoUrl && !imageError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full overflow-hidden shrink-0 bg-zinc-100 border border-zinc-200/60 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <img
          src={directLogoUrl}
          alt={cleanSym}
          className="size-full object-contain"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Commodities: Gold
  if (cleanSym.includes('XAU') || cleanSym.includes('GOLD')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 text-white font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
        title="Gold"
      >
        <Globe className={size === 'xs' || size === 'sm' ? 'size-2.5' : 'size-4'} />
      </div>
    );
  }

  // Futures: Micro E-mini / E-mini Nasdaq
  if (cleanSym === 'MNQ' || cleanSym === 'NQ' || cleanSym.includes('NQ')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-zinc-900 text-zinc-100 font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <span className="font-mono text-[9px] font-bold">NQ</span>
      </div>
    );
  }

  // Indices: NIFTY 50
  if (cleanSym === 'NIFTY' || cleanSym === 'NIFTY 50' || cleanSym === 'NIFTY50') {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#1e2749] text-white font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <span className="text-[9px]">50</span>
      </div>
    );
  }

  // Major Crypto Icons
  if (cleanSym.startsWith('BTC') || cleanSym.includes('BITCOIN')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#f7931a] text-white font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <span className="font-serif">₿</span>
      </div>
    );
  }

  if (cleanSym.startsWith('ETH') || cleanSym.includes('ETHEREUM')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#627eea] text-white font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <svg
          viewBox="0 0 784.37 1277.39"
          className={size === 'xs' || size === 'sm' ? 'size-2.5 fill-white' : 'size-4 fill-white'}
        >
          <polygon points="392.07,0 383.5,29.11 383.5,873.74 392.07,882.29 784.13,650.54" />
          <polygon points="392.07,0 0,650.54 392.07,882.29 392.07,472.33" />
          <polygon points="392.07,956.52 387.24,962.41 387.24,1263.28 392.07,1277.38 784.37,724.89" />
          <polygon points="392.07,1277.38 392.07,956.52 0,724.89" />
        </svg>
      </div>
    );
  }

  if (cleanSym.startsWith('SOL')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-tr from-[#9945FF] to-[#14F195] text-white font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <span className="font-mono text-[9px]">◎</span>
      </div>
    );
  }

  // Major Equities
  if (cleanSym === 'AAPL' || cleanSym.includes('APPLE')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-black text-white shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <svg
          viewBox="0 0 170 170"
          className={size === 'xs' || size === 'sm' ? 'size-2.5 fill-white' : 'size-3.5 fill-white'}
        >
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.77-7.97-12.24-14.67-6.08-9.05-10.83-19.16-14.25-30.33-3.41-11.17-5.12-21.75-5.12-31.74 0-14.07 3.69-25.75 11.07-35.03 7.38-9.28 16.65-14.04 27.81-14.28 4.79 0 10.22 1.25 16.29 3.75 6.07 2.5 9.77 3.75 11.11 3.75 1.56 0 5.56-1.32 12-3.96 6.44-2.64 12.08-3.79 16.92-3.46 12.57 1.05 22.42 5.86 29.56 14.44-11.01 6.64-16.34 15.77-16 27.38.33 9.4 3.99 17.27 10.98 23.6 6.99 6.33 15.11 9.94 24.36 10.83-2.34 7.23-5.28 14.24-8.81 21.03zM119.22 31.95c0-6.72 2.45-13.06 7.35-19.01 4.9-5.96 10.97-9.75 18.21-11.38.22 1.34.33 2.5.33 3.47 0 6.61-2.6 13.04-7.8 19.3-5.2 6.25-11.35 9.98-18.45 11.18-.33-1.12-.5-2.22-.5-3.3z" />
        </svg>
      </div>
    );
  }

  if (cleanSym === 'MSFT' || cleanSym.includes('MICROSOFT')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-zinc-950 p-1 shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <div className="grid grid-cols-2 gap-0.5 size-full">
          <div className="bg-[#f25022] rounded-[1px]" />
          <div className="bg-[#7fba00] rounded-[1px]" />
          <div className="bg-[#00a4ef] rounded-[1px]" />
          <div className="bg-[#ffb900] rounded-[1px]" />
        </div>
      </div>
    );
  }

  if (cleanSym === 'TSLA' || cleanSym.includes('TESLA')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#e82127] text-white shrink-0 shadow-2xs p-1.5',
          sizeClasses,
          className,
        )}
      >
        <svg viewBox="0 0 100 100" className="size-full fill-white">
          <path d="M50 20c7.8 0 24.3 1.8 32.4 6.8l2.6-7.8C75.2 14.5 59.8 13 50 13c-9.8 0-25.2 1.5-35 6l2.6 7.8c8.1-5 24.6-6.8 32.4-6.8zm0 17.5c11.6 0 24.8 3.5 32 8.7l4.8-13.8C76 26.6 62.8 24 50 24s-26 2.6-36.8 8.4l4.8 13.8c7.2-5.2 20.4-8.7 32-8.7zm-6.2 13h12.4v36.5h-12.4z" />
        </svg>
      </div>
    );
  }

  if (cleanSym === 'NVDA' || cleanSym.includes('NVIDIA')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-black text-[#76b900] shrink-0 shadow-2xs p-1.5',
          sizeClasses,
          className,
        )}
      >
        <svg viewBox="0 0 24 24" className="size-full fill-[#76b900]">
          <path d="M7.74 7.64c.54-.34 1.15-.6 1.78-.79V5.1c-.97.23-1.89.62-2.74 1.14l.96 1.4zm0 8.72l-.96 1.4c.85.52 1.77.91 2.74 1.14v-1.75c-.63-.19-1.24-.45-1.78-.79zm7.04-10.84v1.86c2.72.63 4.8 3.07 4.8 5.98 0 2.91-2.08 5.35-4.8 5.98v1.86c3.74-.68 6.55-3.93 6.55-7.84s-2.81-7.16-6.55-7.84zm-3.03 2.11v8.74c1.88-.47 3.29-2.18 3.29-4.37s-1.41-3.9-3.29-4.37z" />
        </svg>
      </div>
    );
  }

  if (cleanSym === 'SPY' || cleanSym === 'SPX') {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#1b365d] text-white shrink-0 shadow-2xs p-1 font-bold',
          sizeClasses,
          className,
        )}
      >
        <span className="text-[9px] font-sans tracking-tighter">S&P</span>
      </div>
    );
  }

  if (cleanSym === 'QQQ' || cleanSym === 'NDX') {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#0052cc] text-white shrink-0 shadow-2xs p-1 font-bold',
          sizeClasses,
          className,
        )}
      >
        <span className="text-[9px] font-sans tracking-tighter">100</span>
      </div>
    );
  }

  // Forex
  if (
    type === 'forex' ||
    (cleanSym.length === 6 &&
      (cleanSym.includes('USD') ||
        cleanSym.includes('EUR') ||
        cleanSym.includes('JPY') ||
        cleanSym.includes('GBP')))
  ) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-zinc-800 text-zinc-100 font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <Globe className={size === 'xs' || size === 'sm' ? 'size-2.5' : 'size-4'} />
      </div>
    );
  }

  // Fallback badge with ticker initials
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-zinc-100 text-zinc-800 font-bold uppercase shrink-0 border border-zinc-200/80 shadow-2xs',
        sizeClasses,
        className,
      )}
    >
      <span>{cleanSym.slice(0, 2)}</span>
    </div>
  );
}

export default StockSymbolIcon;
