'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@kortix/ui/dialog';
import { Loader2, Search, X } from 'lucide-react';
import { searchTradingViewSymbols } from './tradingview.actions';
import type { TvSymbolResult } from './types';
import { cn } from '@kortix/ui';
import { StockSymbolIcon } from './StockSymbolIcon';

const OPEN_SEARCH_EVENT = 'open-search';

export const openSearch = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
  }
};

export const SearchButton = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => (
  <button
    type="button"
    onClick={openSearch}
    className={cn(
      'inline-flex items-center gap-2.5 h-9 px-3.5 rounded-xl border border-border/60 bg-muted/50 hover:bg-muted/80 text-sm font-normal text-muted-foreground hover:text-foreground transition-all shadow-2xs cursor-pointer font-sans',
      className,
    )}
  >
    <Search className="size-4 text-foreground/80 shrink-0" />
    {children ? (
      children
    ) : (
      <>
        <span className="font-sans text-sm font-normal text-foreground/90">Search stocks</span>
        <kbd className="hidden sm:inline-block ml-3 rounded-md bg-background px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground border border-border/50">
          ⌘K
        </kbd>
      </>
    )}
  </button>
);

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

// The exact initial list shown in Image 2
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

export default function SearchCommand({
  onSelectSymbol,
}: {
  onSelectSymbol?: (symbol: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [symbols, setSymbols] = useState<TradingViewModalItem[]>(EXACT_IMAGE_SYMBOLS);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [open]);

  const fetchSymbols = useCallback(async (query: string, catValue: string) => {
    if (!query.trim()) {
      const preset = CATEGORY_PRESETS[catValue] || CATEGORY_PRESETS.all;
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

          return {
            ...r,
            badge,
            isIndia,
          };
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
    if (!open) return;
    const timer = setTimeout(() => {
      fetchSymbols(searchTerm, category);
    }, searchTerm ? 120 : 0);
    return () => clearTimeout(timer);
  }, [open, searchTerm, category, fetchSymbols]);

  const handleSelect = (item: TradingViewModalItem) => {
    setOpen(false);
    const displaySymbol = (item.symbol || '').replace(/<[^>]*>/g, '');
    const full =
      item.exchange && !displaySymbol.includes(':')
        ? `${item.exchange}:${displaySymbol}`
        : displaySymbol;

    if (onSelectSymbol) {
      onSelectSymbol(full);
    } else {
      window.dispatchEvent(
        new CustomEvent('selected-stock-symbol', {
          detail: { symbol: full, name: item.description },
        }),
      );
    }
  };

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
      handleSelect(symbols[selectedIndex]);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        hideCloseButton={true}
        className="!max-w-4xl sm:!max-w-4xl w-[92vw] sm:w-[860px] md:w-[860px] overflow-hidden p-0 rounded-2xl bg-white text-zinc-900 border border-zinc-200/90 shadow-2xl font-sans"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Symbol Search</DialogTitle>
          <DialogDescription>Search worldwide symbols, ISIN, or CUSIP</DialogDescription>
        </DialogHeader>

        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4.5 pt-4 pb-3 border-b border-zinc-200/80 bg-white">
          <Search className="size-5 text-zinc-400 shrink-0 stroke-[2.2]" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search stocks..."
            className="flex-1 bg-transparent text-[15px] font-normal text-zinc-900 placeholder:text-zinc-400 outline-none font-sans"
            autoFocus
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
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto px-4 py-2.5 bg-zinc-50/70 border-b border-zinc-200/60 [scrollbar-width:none]">
          {TV_CATEGORIES.map((cat) => {
            const active = category === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-[12.5px] font-medium transition-all shrink-0 cursor-pointer font-sans',
                  active
                    ? 'bg-black text-white font-semibold shadow-xs'
                    : 'text-zinc-600 hover:bg-zinc-200/60 hover:text-black',
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

            {/* Divider */}
            <div className="h-px w-full bg-zinc-100" />

            {/* Results List with Authentic TradingView CDN Logos */}
            <div
              ref={listRef}
              className="max-h-[60vh] min-h-[440px] overflow-y-auto divide-y divide-zinc-100/70 font-sans"
            >
              {loading && (
                <div className="flex items-center justify-center py-16 text-zinc-400 gap-2">
                  <Loader2 className="size-5 animate-spin text-zinc-500" />
                  <span className="text-xs font-medium">Searching live TradingView symbols...</span>
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
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors select-none',
                        isSelected ? 'bg-zinc-100/90' : 'hover:bg-zinc-50/80',
                      )}
                    >
                      {/* Left: Real TradingView CDN Logo + Symbol Name + Description */}
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <StockSymbolIcon
                          symbol={displaySymbol}
                          type={item.type}
                          logoid={item.logoid}
                          size="md"
                        />

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

                      {/* Right: Exchange + Source Logo / Pill */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-sans text-[12px] font-semibold text-zinc-600">
                          {item.exchange}
                        </span>

                        {item.multiSource && (
                          <span className="font-sans text-[11px] font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                            {item.multiSource}
                          </span>
                        )}

                        {item.sourceLogoid ? (
                          <img
                            src={`https://s3-symbol-logo.tradingview.com/${item.sourceLogoid}.svg`}
                            alt={item.exchange}
                            className="size-4.5 rounded-full object-contain shrink-0 border border-zinc-200/60 bg-zinc-50"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
            </div>
      </DialogContent>
    </Dialog>
  );
}
