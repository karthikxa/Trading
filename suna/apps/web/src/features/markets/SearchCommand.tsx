'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@kortix/ui/dialog';
import { Loader2, Search, X, ArrowUpRight } from 'lucide-react';
import { searchTradingViewSymbols } from './tradingview.actions';
import type { TvSymbolResult } from './types';
import WatchlistButton from './WatchlistButton';
import StockSymbolIcon from './StockSymbolIcon';
import { cn } from '@kortix/ui';

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
      'inline-flex items-center gap-2.5 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-black transition-all cursor-pointer font-sans',
      className,
    )}
  >
    <Search className="size-4 text-zinc-300" />
    {children ? (
      children
    ) : (
      <>
        <span>Search stocks...</span>
        <kbd className="ml-2 rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-mono text-white">
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

const INITIAL_POPULAR_SYMBOLS: TvSymbolResult[] = [
  { symbol: 'XAUUSD', description: 'Gold', type: 'commodity', exchange: 'OANDA' },
  { symbol: 'BTCUSDT', description: 'Bitcoin / TetherUS', type: 'spot', exchange: 'Binance' },
  { symbol: 'BTCUSD', description: 'Bitcoin / U.S. dollar', type: 'spot', exchange: 'Bitstamp' },
  { symbol: 'MNQ', description: 'Micro E-mini Nasdaq-100 Index Futures', type: 'futures', exchange: 'CME' },
  { symbol: 'NQ', description: 'E-mini Nasdaq-100 Futures', type: 'futures', exchange: 'CME' },
  { symbol: 'GOLD', description: 'Gold', type: 'commodity', exchange: 'TVC' },
  { symbol: 'AAPL', description: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'NVDA', description: 'NVIDIA Corporation', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'TSLA', description: 'Tesla, Inc.', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'MSFT', description: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'AMZN', description: 'Amazon.com, Inc.', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', description: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'EURUSD', description: 'Euro / US Dollar', type: 'forex', exchange: 'FX' },
  { symbol: 'SPX', description: 'S&P 500 Index', type: 'index', exchange: 'SP' },
  { symbol: 'NDX', description: 'Nasdaq 100 Index', type: 'index', exchange: 'NASDAQ' },
];

export default function SearchCommand({
  onSelectSymbol,
}: {
  onSelectSymbol?: (symbol: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [symbols, setSymbols] = useState<TvSymbolResult[]>(INITIAL_POPULAR_SYMBOLS);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global shortcut Ctrl+K / Cmd+K and custom event listener
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

  // Focus input on dialog open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Fetch initial or search symbols
  const fetchSymbols = useCallback(async (query: string, catValue: string) => {
    setLoading(true);
    try {
      const tvType = TV_CATEGORIES.find((c) => c.value === catValue)?.tvType ?? '';
      const results = await searchTradingViewSymbols(query, tvType, '', 0);
      if (results && results.length > 0) {
        setSymbols(results);
      } else if (!query) {
        setSymbols(INITIAL_POPULAR_SYMBOLS);
      } else {
        setSymbols([]);
      }
    } catch {
      setSymbols(query ? [] : INITIAL_POPULAR_SYMBOLS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      fetchSymbols(searchTerm, category);
    }, searchTerm ? 200 : 0);
    return () => clearTimeout(timer);
  }, [open, searchTerm, category, fetchSymbols]);

  const handleSelect = (symbol: string, name?: string) => {
    setOpen(false);
    if (onSelectSymbol) {
      onSelectSymbol(symbol);
    } else {
      window.dispatchEvent(
        new CustomEvent('selected-stock-symbol', {
          detail: { symbol, name },
        }),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl sm:max-w-4xl w-[92vw] sm:w-[840px] overflow-hidden p-0 rounded-2xl bg-card text-card-foreground border border-border shadow-2xl font-sans">
        <DialogHeader className="sr-only">
          <DialogTitle>Search Stocks and Markets</DialogTitle>
          <DialogDescription>Search worldwide stocks, crypto, forex, and funds</DialogDescription>
        </DialogHeader>

        {/* Search Input Bar with magnifying glass and quick-clear (X) */}
        <div className="flex items-center gap-3 border-b border-border/80 px-4 py-3 bg-muted/30">
          <Search className="size-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search symbol, company, or market..."
            className="flex-1 bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground outline-none font-sans"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />}
        </div>

        {/* Category Filter Tabs: All, Stocks, Funds, Futures, Forex, Crypto, Indices, Bonds, Economy, Options */}
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 border-b border-border/60 bg-card [scrollbar-width:none]">
          {TV_CATEGORIES.map((cat) => {
            const active = category === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all shrink-0 cursor-pointer font-sans',
                  active
                    ? 'bg-foreground text-background font-bold shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60',
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Results List matching TradingView exact layout with SVG logos */}
        <div className="max-h-[460px] min-h-[260px] overflow-y-auto p-2 divide-y divide-border/40 font-sans">
          {symbols.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Search className="size-8 stroke-1 mb-2 text-muted-foreground/60" />
              <p className="text-sm font-medium">No symbols found</p>
              <p className="text-xs text-muted-foreground/80 mt-1">Try another ticker or category</p>
            </div>
          ) : (
            symbols.map((item, idx) => {
              const displaySymbol = (item.symbol || '').replace(/<[^>]*>/g, '');
              const displayDesc = (item.description || '').replace(/<[^>]*>/g, '');
              return (
                <div
                  key={`${displaySymbol}-${idx}`}
                  onClick={() => handleSelect(displaySymbol, displayDesc)}
                  className="group flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* SVG / Icon before the stock name */}
                    <StockSymbolIcon
                      symbol={displaySymbol}
                      logoid={item.logoid}
                      type={item.type}
                      size="md"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[14px] text-blue-600 dark:text-blue-400 hover:underline truncate">
                          {displaySymbol}
                        </span>
                        {item.type && (
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {item.type}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-md">
                        {displayDesc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {item.exchange && (
                      <span className="text-xs font-mono text-muted-foreground/80">
                        {item.exchange}
                      </span>
                    )}
                    {/* Black Pin Icon for Watchlist */}
                    <WatchlistButton
                      symbol={displaySymbol}
                      name={displayDesc}
                      exchange={item.exchange}
                      variant="icon"
                    />
                    <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
