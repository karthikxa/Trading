'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@kortix/ui/dialog';
import { Loader2, Search, X, Maximize2, Minimize2, ArrowLeft } from 'lucide-react';
import { searchTradingViewSymbols } from '../markets/tradingview.actions';
import { resolveTradingViewSymbol } from '../markets/symbol-resolver';
import type { TvSymbolResult } from '../markets/types';
import { cn } from '@kortix/ui';

export const OPEN_STOCK_SEARCH_EVENT = 'kortix:open-stock-search';

export const openStockSearch = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_STOCK_SEARCH_EVENT));
  }
};

const TV_CATEGORIES = [
  { label: 'All', value: 'all', tvType: '' },
  { label: 'Stocks', value: 'stocks', tvType: 'stocks' },
  { label: 'Funds', value: 'funds', tvType: 'funds' },
  { label: 'Futures', value: 'futures', tvType: 'futures' },
  { label: 'Forex', value: 'forex', tvType: 'forex' },
  { label: 'Crypto', value: 'crypto', tvType: 'crypto' },
  { label: 'Indices', value: 'index', tvType: 'index' },
  { label: 'Bonds', value: 'bond', tvType: 'bond' },
  { label: 'Economy', value: 'economic', tvType: 'economic' },
  { label: 'Options', value: 'options', tvType: 'options' },
] as const;

interface TradingViewModalItem extends TvSymbolResult {
  badge: string;
  multiSource?: string;
  isIndia?: boolean;
}

const EXACT_IMAGE_SYMBOLS: TradingViewModalItem[] = [
  {
    symbol: 'NIFTY',
    description: 'Nifty 50 Index',
    badge: 'INDEX',
    type: 'index',
    exchange: 'NSE',
    country: 'IN',
    isIndia: true,
  },
  {
    symbol: 'XAUUSD',
    description: 'Gold',
    badge: 'COMMODITY CFD',
    type: 'commodity',
    exchange: 'OANDA',
  },
  {
    symbol: 'XAUUSD',
    description: 'Gold / U.S. Dollar',
    badge: 'COMMODITY CFD',
    type: 'commodity',
    exchange: 'FOREXCOM',
  },
  {
    symbol: 'NIFTY',
    description: 'GIFT NIFTY 50 INDEX FUTURES',
    badge: 'FUTURES',
    type: 'futures',
    exchange: 'NSEIX',
    multiSource: '+8 ∨',
  },
  {
    symbol: 'BANKNIFTY',
    description: 'Nifty Bank Index',
    badge: 'INDEX',
    type: 'index',
    exchange: 'NSE',
    country: 'IN',
    isIndia: true,
  },
  {
    symbol: 'BTCUSD',
    description: 'Bitcoin',
    badge: 'SPOT CRYPTO',
    type: 'crypto',
    exchange: 'CRYPTO',
    multiSource: '+49 ∨',
  },
  {
    symbol: 'GOLD',
    description: 'Gold',
    badge: 'COMMODITY CFD',
    type: 'commodity',
    exchange: 'TVC',
  },
  {
    symbol: 'SENSEX',
    description: 'BSE Sensex Index',
    badge: 'INDEX',
    type: 'index',
    exchange: 'BSE',
    country: 'IN',
    isIndia: true,
  },
  {
    symbol: 'XAUUSD',
    description: 'XAU/USD Spot - Gold',
    badge: 'COMMODITY CFD',
    type: 'commodity',
    exchange: 'FXCM',
  },
  {
    symbol: 'CRUDEOIL',
    description: 'Crude Oil Futures',
    badge: 'FUTURES',
    type: 'futures',
    exchange: 'MCX',
    multiSource: '+12 ∨',
  },
  {
    symbol: 'RELIANCE',
    description: 'Reliance Industries Ltd',
    badge: 'COMMON STOCK',
    type: 'stock',
    exchange: 'NSE',
    country: 'IN',
    isIndia: true,
  },
  {
    symbol: 'AAPL',
    description: 'Apple Inc.',
    badge: 'COMMON STOCK',
    type: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
  },
  {
    symbol: 'NVDA',
    description: 'NVIDIA Corporation',
    badge: 'COMMON STOCK',
    type: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
  },
  {
    symbol: 'TSLA',
    description: 'Tesla, Inc.',
    badge: 'COMMON STOCK',
    type: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
  },
];

const CATEGORY_PRESETS: Record<string, TradingViewModalItem[]> = {
  all: EXACT_IMAGE_SYMBOLS,
  stocks: [
    { symbol: 'AAPL', description: 'Apple Inc.', badge: 'COMMON STOCK', type: 'stock', exchange: 'NASDAQ', country: 'US' },
    { symbol: 'NVDA', description: 'NVIDIA Corporation', badge: 'COMMON STOCK', type: 'stock', exchange: 'NASDAQ', country: 'US' },
    { symbol: 'TSLA', description: 'Tesla, Inc.', badge: 'COMMON STOCK', type: 'stock', exchange: 'NASDAQ', country: 'US' },
    { symbol: 'MSFT', description: 'Microsoft Corporation', badge: 'COMMON STOCK', type: 'stock', exchange: 'NASDAQ', country: 'US' },
    { symbol: 'AMZN', description: 'Amazon.com, Inc.', badge: 'COMMON STOCK', type: 'stock', exchange: 'NASDAQ', country: 'US' },
    { symbol: 'GOOGL', description: 'Alphabet Inc. (Class A)', badge: 'COMMON STOCK', type: 'stock', exchange: 'NASDAQ', country: 'US' },
    { symbol: 'META', description: 'Meta Platforms, Inc.', badge: 'COMMON STOCK', type: 'stock', exchange: 'NASDAQ', country: 'US' },
    { symbol: 'RELIANCE', description: 'Reliance Industries Ltd', badge: 'COMMON STOCK', type: 'stock', exchange: 'NSE', country: 'IN', isIndia: true },
    { symbol: 'TCS', description: 'Tata Consultancy Services', badge: 'COMMON STOCK', type: 'stock', exchange: 'NSE', country: 'IN', isIndia: true },
    { symbol: 'INFY', description: 'Infosys Limited', badge: 'COMMON STOCK', type: 'stock', exchange: 'NSE', country: 'IN', isIndia: true },
    { symbol: 'HDFCBANK', description: 'HDFC Bank Ltd', badge: 'COMMON STOCK', type: 'stock', exchange: 'NSE', country: 'IN', isIndia: true },
    { symbol: 'JPM', description: 'JPMorgan Chase & Co.', badge: 'COMMON STOCK', type: 'stock', exchange: 'NYSE', country: 'US' },
  ],
  funds: [
    { symbol: 'SPY', description: 'SPDR S&P 500 ETF Trust', badge: 'ETF', type: 'funds', exchange: 'AMEX', country: 'US' },
    { symbol: 'QQQ', description: 'Invesco QQQ Trust Series 1', badge: 'ETF', type: 'funds', exchange: 'NASDAQ', country: 'US' },
    { symbol: 'IWM', description: 'iShares Russell 2000 ETF', badge: 'ETF', type: 'funds', exchange: 'AMEX', country: 'US' },
    { symbol: 'VOO', description: 'Vanguard S&P 500 ETF', badge: 'ETF', type: 'funds', exchange: 'AMEX', country: 'US' },
    { symbol: 'VTI', description: 'Vanguard Total Stock Market ETF', badge: 'ETF', type: 'funds', exchange: 'AMEX', country: 'US' },
    { symbol: 'DIA', description: 'SPDR Dow Jones Industrial Average ETF', badge: 'ETF', type: 'funds', exchange: 'AMEX', country: 'US' },
    { symbol: 'GLD', description: 'SPDR Gold Shares', badge: 'ETF', type: 'funds', exchange: 'AMEX', country: 'US' },
    { symbol: 'TLT', description: 'iShares 20+ Year Treasury Bond ETF', badge: 'ETF', type: 'funds', exchange: 'NASDAQ', country: 'US' },
    { symbol: 'XLF', description: 'Financial Select Sector SPDR Fund', badge: 'ETF', type: 'funds', exchange: 'AMEX', country: 'US' },
  ],
  futures: [
    { symbol: 'ES1!', description: 'E-mini S&P 500 Futures', badge: 'FUTURES', type: 'futures', exchange: 'CME', multiSource: '+18 ∨' },
    { symbol: 'NQ1!', description: 'E-mini Nasdaq 100 Futures', badge: 'FUTURES', type: 'futures', exchange: 'CME', multiSource: '+18 ∨' },
    { symbol: 'CL1!', description: 'Crude Oil Futures', badge: 'FUTURES', type: 'futures', exchange: 'NYMEX', multiSource: '+12 ∨' },
    { symbol: 'GC1!', description: 'Gold Futures', badge: 'FUTURES', type: 'futures', exchange: 'COMEX', multiSource: '+14 ∨' },
    { symbol: 'NIFTY', description: 'GIFT NIFTY 50 INDEX FUTURES', badge: 'FUTURES', type: 'futures', exchange: 'NSEIX', multiSource: '+8 ∨' },
    { symbol: 'BANKNIFTY', description: 'Nifty Bank Futures', badge: 'FUTURES', type: 'futures', exchange: 'NSE', isIndia: true },
  ],
  forex: [
    { symbol: 'EURUSD', description: 'Euro / U.S. Dollar', badge: 'FOREX', type: 'forex', exchange: 'FOREXCOM' },
    { symbol: 'GBPUSD', description: 'British Pound / U.S. Dollar', badge: 'FOREX', type: 'forex', exchange: 'FOREXCOM' },
    { symbol: 'USDJPY', description: 'U.S. Dollar / Japanese Yen', badge: 'FOREX', type: 'forex', exchange: 'FOREXCOM' },
    { symbol: 'AUDUSD', description: 'Australian Dollar / U.S. Dollar', badge: 'FOREX', type: 'forex', exchange: 'OANDA' },
    { symbol: 'USDCAD', description: 'U.S. Dollar / Canadian Dollar', badge: 'FOREX', type: 'forex', exchange: 'FXCM' },
    { symbol: 'USDCHF', description: 'U.S. Dollar / Swiss Franc', badge: 'FOREX', type: 'forex', exchange: 'OANDA' },
    { symbol: 'EURGBP', description: 'Euro / British Pound', badge: 'FOREX', type: 'forex', exchange: 'FOREXCOM' },
    { symbol: 'GBPJPY', description: 'British Pound / Japanese Yen', badge: 'FOREX', type: 'forex', exchange: 'SAXO' },
  ],
  crypto: [
    { symbol: 'BTCUSD', description: 'Bitcoin', badge: 'SPOT CRYPTO', type: 'crypto', exchange: 'CRYPTO', multiSource: '+49 ∨' },
    { symbol: 'ETHUSD', description: 'Ethereum', badge: 'SPOT CRYPTO', type: 'crypto', exchange: 'CRYPTO', multiSource: '+35 ∨' },
    { symbol: 'SOLUSD', description: 'Solana', badge: 'SPOT CRYPTO', type: 'crypto', exchange: 'CRYPTO', multiSource: '+22 ∨' },
    { symbol: 'XRPUSD', description: 'XRP', badge: 'SPOT CRYPTO', type: 'crypto', exchange: 'CRYPTO', multiSource: '+28 ∨' },
    { symbol: 'BNBUSD', description: 'BNB', badge: 'SPOT CRYPTO', type: 'crypto', exchange: 'CRYPTO' },
    { symbol: 'DOGEUSD', description: 'Dogecoin', badge: 'SPOT CRYPTO', type: 'crypto', exchange: 'CRYPTO' },
  ],
  index: [
    { symbol: 'NIFTY', description: 'Nifty 50 Index', badge: 'INDEX', type: 'index', exchange: 'NSE', country: 'IN', isIndia: true },
    { symbol: 'BANKNIFTY', description: 'Nifty Bank Index', badge: 'INDEX', type: 'index', exchange: 'NSE', country: 'IN', isIndia: true },
    { symbol: 'SENSEX', description: 'BSE Sensex Index', badge: 'INDEX', type: 'index', exchange: 'BSE', country: 'IN', isIndia: true },
    { symbol: 'SPX', description: 'S&P 500 Index', badge: 'INDEX', type: 'index', exchange: 'SP', country: 'US' },
    { symbol: 'NDX', description: 'Nasdaq 100 Index', badge: 'INDEX', type: 'index', exchange: 'NASDAQ', country: 'US' },
    { symbol: 'DJI', description: 'Dow Jones Industrial Average', badge: 'INDEX', type: 'index', exchange: 'DJ', country: 'US' },
    { symbol: 'DAX', description: 'DAX Index', badge: 'INDEX', type: 'index', exchange: 'XETR', country: 'DE' },
  ],
  bond: [
    { symbol: 'US10Y', description: 'U.S. 10 Year Treasury Yield', badge: 'BOND', type: 'bond', exchange: 'TVC' },
    { symbol: 'US02Y', description: 'U.S. 2 Year Treasury Yield', badge: 'BOND', type: 'bond', exchange: 'TVC' },
    { symbol: 'US30Y', description: 'U.S. 30 Year Treasury Yield', badge: 'BOND', type: 'bond', exchange: 'TVC' },
    { symbol: 'TNX', description: 'CBOE 10 Year Treasury Note Yield', badge: 'BOND', type: 'bond', exchange: 'CBOE' },
  ],
  options: [
    { symbol: 'SPY', description: 'SPDR S&P 500 Options Chain', badge: 'OPTIONS', type: 'options', exchange: 'CBOE' },
    { symbol: 'QQQ', description: 'Invesco QQQ Options Chain', badge: 'OPTIONS', type: 'options', exchange: 'CBOE' },
    { symbol: 'AAPL', description: 'Apple Inc. Options Chain', badge: 'OPTIONS', type: 'options', exchange: 'OPRA' },
    { symbol: 'NVDA', description: 'NVIDIA Options Chain', badge: 'OPTIONS', type: 'options', exchange: 'OPRA' },
    { symbol: 'TSLA', description: 'Tesla, Inc. Options Chain', badge: 'OPTIONS', type: 'options', exchange: 'OPRA' },
  ],
};

function renderTvCircularBadge(item: TradingViewModalItem) {
  const sym = (item.symbol || '').toUpperCase();
  const type = (item.type || '').toLowerCase();

  if (sym === 'NIFTY') {
    return (
      <div className="size-8.5 rounded-full bg-[#14204b] flex items-center justify-center shrink-0 text-white font-bold text-[13px] tracking-tight">
        50
      </div>
    );
  }

  if (sym.includes('BANKNIFTY')) {
    return (
      <div className="size-8.5 rounded-full bg-[#1b2f6b] flex items-center justify-center shrink-0 text-white">
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7v2h20V7L12 2zm-8 8v8h2v-8H4zm5 0v8h2v-8H9zm5 0v8h2v-8h-2zm5 0v8h2v-8h-2zM2 20v2h20v-2H2z" />
        </svg>
      </div>
    );
  }

  if (sym.includes('SENSEX')) {
    return (
      <div className="size-8.5 rounded-full bg-[#2b82d9] flex items-center justify-center shrink-0 text-white font-bold text-[10px]">
        BSE
      </div>
    );
  }

  if (sym.includes('GOLD') || sym.includes('XAU') || sym.includes('SILVER') || sym.includes('XAG')) {
    return (
      <div className="size-8.5 rounded-full bg-[#e5a01c] flex items-center justify-center shrink-0 text-white">
        <svg className="size-4.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 14h14l-2 5H7l-2-5zm3-8h8l2 5H6l2-5zm7.5 13l1.5-3.5L18.5 19h-3zM5.5 19l1.5-3.5L5.5 19z" />
        </svg>
      </div>
    );
  }

  if (sym.includes('OIL') || sym.includes('CRUDE') || sym.includes('CL')) {
    return (
      <div className="size-8.5 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 text-white">
        <svg className="size-4.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      </div>
    );
  }

  if (type.includes('crypto') || sym.includes('BTC') || sym.includes('ETH') || sym.includes('SOL')) {
    return (
      <div className="size-8.5 rounded-full bg-[#f7931a] flex items-center justify-center shrink-0 text-white font-bold text-[14px]">
        ₿
      </div>
    );
  }

  if (sym === 'CENTRALBK' || sym.includes('CENTRAL BANK') || sym.includes('CENTRALBANK')) {
    return (
      <div className="size-8.5 rounded-full bg-[#F0F3FA] p-0.5 flex items-center justify-center shrink-0 border border-zinc-200/80 shadow-2xs overflow-hidden">
        <svg viewBox="0 0 56 56" className="size-full">
          <path fill="#F0F3FA" d="M0 0h56v56H0z" />
          <path
            fillRule="evenodd"
            d="M28.2 10H28L15.95 22H10v6l12 12.05V46h6l12.05-12H46v-6L34 15.96V10h-5.8zM28 43.53l10-9.5V28h-1v5.53l-9 9v1zm0-2.85l7-6.65V28h-1v5.53l-6 6v1.15zM28 34l6-6-6-6-6 6v-5.5l6-6v-1.15L21 22v6h1.03L28 34zm-10-6h1v-5.5l9-9v-1.3L18 22v6zm-1.5 0h-1.15L23 35h5v-1h-4.7l-6.8-6zm-3 0h-1l10 10H28v-1h-5l-9.5-9zM28 22h5.2l6.58 6h1.11l-7.59-7H28v1zm0-3h5.3l9.37 9h.97L33.5 18H28v1z"
            fill="#CC103D"
          />
        </svg>
      </div>
    );
  }

  if (sym === 'IOB' || sym.includes('INDIAN OVERSEAS') || sym.includes('INDIANOVERSEAS')) {
    return (
      <div className="size-8.5 rounded-full bg-[#06329F] p-0.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
        <svg viewBox="0 0 56 56" className="size-full">
          <path d="M0 28a28 28 0 1156 0 28 28 0 01-56 0z" fill="#06329F" />
          <path
            d="M19.3 37.98L11 29.66v-1.42l8.3 8.32 8.2-8.22v1.42l-8.2 8.22zM11 32.67l8.3 8.32 8.2-8.22v-1.42l-8.2 8.22-8.3-8.32v1.42zm0 3L19.3 44l8.2-8.22v-1.42l-8.2 8.22-8.3-8.32v1.42zm25.8 2.31l-8.3-8.32v-1.42l8.3 8.33 8.2-8.22v1.41l-8.2 8.22zm-8.3-5.31l8.3 8.32 8.2-8.22v-1.42l-8.2 8.22-8.3-8.32v1.42zm0 3L36.8 44l8.2-8.22v-1.42l-8.2 8.22-8.3-8.32v1.42zm-2.3-7.48l.7-.7-7.72-7.76-7.6 7.63.7.7 6.9-6.91 7.02 7.04z"
            fill="#fff"
          />
          <path d="M25.4 28.98l-6.22-6.24-6.1 6.12.7.7 5.4-5.4 5.52 5.53.7-.7z" fill="#fff" />
          <path d="M23.9 30.49l-4.72-4.74-4.6 4.61.7.7 3.9-3.9 4.02 4.03.7-.7zm19.86-2.39l.7-.7-7.64-7.67-7.68 7.7.7.71 6.98-7 6.94 6.96z" fill="#fff" />
          <path d="M42.97 28.9l-6.15-6.16-6.18 6.2.7.7 5.48-5.48 5.44 5.45.7-.71z" fill="#fff" />
          <path d="M41.47 30.4l-4.65-4.65-4.68 4.69.71.7 3.97-3.98 3.94 3.95.7-.71zm-6.15-10.64l.71-.7L28 11l-8.03 8.05.7.71L28 12.42l7.32 7.34zm-.79.8L28 14l-6.53 6.55.7.7L28 15.43l5.82 5.83.71-.7zm-1.5 1.5L28 17.02l-5.03 5.04.7.7L28 18.44l4.32 4.34.7-.71z" fill="#fff" />
        </svg>
      </div>
    );
  }

  if (sym === 'IDEA' || sym.includes('VODAFONE')) {
    return (
      <div className="size-8.5 rounded-full bg-[#E60000] flex items-center justify-center shrink-0 text-white font-black text-[12px] tracking-tighter shadow-2xs">
        VI
      </div>
    );
  }

  return (
    <div className="size-8.5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 text-white font-bold text-[12px] uppercase">
      {sym.slice(0, 2)}
    </div>
  );
}

function renderTvExchangeLogo(exchange: string) {
  const ex = (exchange || '').toUpperCase();

  if (ex.includes('NSE')) {
    return (
      <div className="size-4.5 rounded-full bg-[#ea580c] flex items-center justify-center shrink-0 text-white text-[8px] font-bold">
        ✹
      </div>
    );
  }
  if (ex.includes('BSE')) {
    return (
      <div className="size-4.5 rounded-full bg-[#2563eb] flex items-center justify-center shrink-0 text-white text-[7px] font-bold">
        BSE
      </div>
    );
  }
  if (ex.includes('OANDA')) {
    return (
      <div className="size-4.5 rounded-full bg-[#0f172a] flex items-center justify-center shrink-0 text-white text-[9px]">
        〰
      </div>
    );
  }
  if (ex.includes('FOREXCOM')) {
    return (
      <div className="size-4.5 rounded-full bg-[#16a34a] flex items-center justify-center shrink-0 text-white text-[9px] font-bold">
        €
      </div>
    );
  }
  if (ex.includes('FXCM')) {
    return (
      <div className="size-4.5 rounded-full bg-[#1d4ed8] flex items-center justify-center shrink-0 text-white text-[8px] font-bold">
        2
      </div>
    );
  }
  if (ex.includes('MCX')) {
    return (
      <div className="size-4.5 rounded-full bg-[#dc2626] flex items-center justify-center shrink-0 text-white text-[6px] font-black">
        MCX
      </div>
    );
  }
  return (
    <div className="size-4.5 rounded-full bg-black flex items-center justify-center shrink-0 text-white text-[7.5px] font-black tracking-tighter">
      17
    </div>
  );
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

export function StockTradingModal() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<TradingViewModalItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [symbols, setSymbols] = useState<TradingViewModalItem[]>(EXACT_IMAGE_SYMBOLS);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Listen to open search event
  useEffect(() => {
    const handleOpen = () => setSearchOpen(true);
    window.addEventListener(OPEN_STOCK_SEARCH_EVENT, handleOpen);
    window.addEventListener('open-search', handleOpen);
    return () => {
      window.removeEventListener(OPEN_STOCK_SEARCH_EVENT, handleOpen);
      window.removeEventListener('open-search', handleOpen);
    };
  }, []);

  // Preload tv.js
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!document.querySelector('script[src*="tradingview.com/tv.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Focus input on search open
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
      setSelectedIndex(0);
    }
  }, [searchOpen]);

  // Search logic
  const fetchSymbols = useCallback(async (query: string, catValue: string) => {
    if (!query.trim()) {
      const preset = CATEGORY_PRESETS[catValue] || EXACT_IMAGE_SYMBOLS;
      setSymbols(preset);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const tvType = TV_CATEGORIES.find((c) => c.value === catValue)?.tvType ?? '';
      const results = await searchTradingViewSymbols(query, tvType, '', 0);

      if (results && results.length > 0) {
        const mapped: TradingViewModalItem[] = results.map((r) => {
          const typeU = (r.type || 'stock').toUpperCase();
          let badge = typeU;
          if (typeU === 'STOCK') badge = 'COMMON STOCK';
          else if (typeU === 'INDEX') badge = 'INDEX';
          else if (typeU.includes('CRYPTO') || typeU.includes('SPOT')) badge = 'SPOT CRYPTO';
          else if (typeU.includes('COMMODITY')) badge = 'COMMODITY CFD';
          else if (typeU.includes('FUTURE')) badge = 'FUTURES';
          else if (typeU.includes('FOREX')) badge = 'FOREX';

          const isIndia = r.country === 'IN' || r.exchange === 'NSE' || r.exchange === 'BSE';

          return { ...r, badge, isIndia };
        });
        setSymbols(mapped);
      } else {
        setSymbols([]);
      }
    } catch {
      setSymbols([]);
    } finally {
      setLoading(false);
      setSelectedIndex(0);
    }
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const timer = setTimeout(() => {
      fetchSymbols(searchTerm, category);
    }, searchTerm ? 120 : 0);
    return () => clearTimeout(timer);
  }, [searchOpen, searchTerm, category, fetchSymbols]);

  // Handle select stock: close search, dispatch global sync event, and open live chart modal
  const handleSelectStock = (item: TradingViewModalItem) => {
    setSelectedStock(item);
    setSearchOpen(false);

    // Synchronize globally with Watchlist, Overview, and Journal
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('selected-stock-symbol', {
          detail: {
            symbol: item.symbol,
            name: item.description || item.symbol,
            exchange: item.exchange,
            type: item.type,
          },
        }),
      );
    }

    setChartOpen(true);
  };

  // Mount TradingView Widget when chart modal is open
  useEffect(() => {
    if (!chartOpen || !selectedStock || !chartContainerRef.current) return;

    const containerId = 'kortix_tv_chart_container';
    chartContainerRef.current.innerHTML = `<div id="${containerId}" style="width:100%;height:100%;"></div>`;

    const resolved = resolveTradingViewSymbol(
      selectedStock.exchange && !selectedStock.symbol.includes(':')
        ? `${selectedStock.exchange}:${selectedStock.symbol}`
        : selectedStock.symbol,
      selectedStock.description,
    );

    const initTvWidget = () => {
      if (!window.TradingView) {
        setTimeout(initTvWidget, 100);
        return;
      }

      new window.TradingView.widget({
        autosize: true,
        symbol: resolved.fullSymbol,
        interval: 'D',
        timezone: 'Etc/UTC',
        theme: 'light',
        style: '1',
        locale: 'en',
        toolbar_bg: '#f8fafc',
        enable_publishing: false,
        allow_symbol_change: true,
        withdateranges: true,
        hide_side_toolbar: false,
        container_id: containerId,
      });
    };

    initTvWidget();
  }, [chartOpen, selectedStock]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, symbols.length - 1));
      scrollIndexIntoView(selectedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      scrollIndexIntoView(selectedIndex - 1);
    } else if (e.key === 'Enter' && symbols[selectedIndex]) {
      e.preventDefault();
      handleSelectStock(symbols[selectedIndex]);
    }
  };

  const scrollIndexIntoView = (index: number) => {
    const list = listRef.current;
    if (!list) return;
    const items = list.querySelectorAll<HTMLElement>('[data-search-row]');
    const target = items[index];
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
    }
  };

  return (
    <>
      {/* ============================================================ */}
      {/* 1. TRADINGVIEW SYMBOL SEARCH MODAL (Exact match to Image 2)  */}
      {/* ============================================================ */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent
          hideCloseButton={true}
          className="!max-w-4xl sm:!max-w-4xl w-[92vw] sm:w-[860px] md:w-[860px] overflow-hidden p-0 rounded-2xl bg-white text-zinc-900 border border-zinc-200/90 shadow-2xl font-sans"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Symbol Search</DialogTitle>
            <DialogDescription>Search worldwide symbols, ISIN, or CUSIP</DialogDescription>
          </DialogHeader>

          {/* Header Search Input */}
          <div className="flex items-center gap-3 px-4.5 pt-4 pb-3 bg-white">
            <Search className="size-5 text-zinc-400 shrink-0 stroke-[2.2]" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Symbol, ISIN, or CUSIP"
              className="flex-1 bg-transparent text-[16px] font-normal text-zinc-900 placeholder:text-zinc-400 outline-none font-sans"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer mr-1"
                title="Clear search"
              >
                <X className="size-4" />
              </button>
            )}

            {/* Clean Close Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto px-4 pb-3 bg-white [scrollbar-width:none]">
            {TV_CATEGORIES.map((cat) => {
              const active = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    'rounded-full px-3.5 py-1 text-[13px] font-medium transition-all shrink-0 cursor-pointer font-sans',
                    active
                      ? 'bg-black text-white font-semibold'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-black',
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-zinc-100" />

          {/* Results List */}
          <div
            ref={listRef}
            className="max-h-[64vh] min-h-[460px] overflow-y-auto divide-y divide-zinc-100/60 font-sans"
          >
            {loading && (
              <div className="flex items-center justify-center py-12 text-zinc-400 gap-2">
                <Loader2 className="size-5 animate-spin text-zinc-500" />
                <span className="text-xs font-medium">Searching symbols...</span>
              </div>
            )}

            {!loading && symbols.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400">
                <p className="text-sm font-semibold text-zinc-700">No symbols found</p>
                <p className="text-xs text-zinc-400 mt-0.5">Try searching another ticker or category</p>
              </div>
            )}

            {!loading &&
              symbols.map((item, idx) => {
                const displaySymbol = (item.symbol || '').replace(/<[^>]*>/g, '');
                const displayDesc = (item.description || '').replace(/<[^>]*>/g, '');
                const isSelected = selectedIndex === idx;

                return (
                  <div
                    key={`${displaySymbol}-${item.exchange}-${idx}`}
                    data-search-row
                    onClick={() => handleSelectStock(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      'flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors select-none',
                      isSelected ? 'bg-zinc-100/80' : 'hover:bg-zinc-50/80',
                    )}
                  >
                    {/* Left: Circular Badge + Symbol + Subtitle */}
                    <div className="flex items-center gap-3.5 min-w-0 pr-4">
                      {renderTvCircularBadge(item)}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 leading-tight">
                          <span className="font-bold text-[14px] text-zinc-950 font-sans tracking-tight">
                            {displaySymbol}
                          </span>
                          {item.isIndia && <span className="text-[12px]">🇮🇳</span>}
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                          <span className="truncate text-[12px] text-zinc-500 font-normal">
                            {displayDesc || displaySymbol}
                          </span>
                          {item.badge && (
                            <span className="rounded-[4px] bg-zinc-200/70 px-1.5 py-0.2 text-[9.5px] font-bold uppercase tracking-wider text-zinc-600 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Exchange + Multi-source (+8 ∨) + Exchange Logo */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-sans text-[12px] font-semibold text-zinc-600">
                        {item.exchange}
                      </span>

                      {item.multiSource && (
                        <span className="font-sans text-[11px] font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                          {item.multiSource}
                        </span>
                      )}

                      {renderTvExchangeLogo(item.exchange)}
                    </div>
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 2. FULLSCREEN LIVE TRADINGVIEW CHART MODAL (Direct in Kortix) */}
      {/* ============================================================ */}
      <Dialog open={chartOpen} onOpenChange={setChartOpen}>
        <DialogContent
          className={cn(
            'p-0 rounded-2xl bg-white border border-zinc-200 shadow-2xl flex flex-col font-sans transition-all overflow-hidden',
            isFullscreen
              ? 'fixed inset-2 max-w-none w-[99vw] h-[98vh]'
              : 'max-w-6xl w-[95vw] h-[86vh]',
          )}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Live Trading Chart</DialogTitle>
            <DialogDescription>Interactive live candlestick market chart</DialogDescription>
          </DialogHeader>

          {/* Chart Header Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 bg-zinc-50/80">
            <div className="flex items-center gap-3">
              {selectedStock && renderTvCircularBadge(selectedStock)}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold font-sans text-base text-zinc-950">
                    {selectedStock?.symbol}
                  </span>
                  {selectedStock?.badge && (
                    <span className="rounded bg-zinc-200 px-1.5 py-0.2 text-[10px] font-bold text-zinc-700">
                      {selectedStock.badge}
                    </span>
                  )}
                  <span className="text-xs font-mono font-medium text-zinc-500">
                    {selectedStock?.exchange}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 truncate max-w-md">
                  {selectedStock?.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <Search className="size-3.5 text-zinc-500" />
                <span>Search other stock</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors cursor-pointer"
                title={isFullscreen ? 'Exit full screen' : 'Full screen'}
              >
                {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>

              <button
                type="button"
                onClick={() => setChartOpen(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors cursor-pointer"
                title="Close chart (Esc)"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Chart Container */}
          <div ref={chartContainerRef} className="flex-1 w-full h-full min-h-0 bg-white" />
        </DialogContent>
      </Dialog>
    </>
  );
}

