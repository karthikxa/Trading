'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@kortix/ui/dialog';
import { Loader2, Search, X, ArrowUpRight, Check, Globe } from 'lucide-react';
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
] as const;

const TV_EXCHANGES = [
  { label: 'All exchanges', value: 'ALL' },
  { label: 'NSE (India)', value: 'NSE' },
  { label: 'BSE (India)', value: 'BSE' },
  { label: 'NASDAQ (US)', value: 'NASDAQ' },
  { label: 'NYSE (US)', value: 'NYSE' },
  { label: 'BINANCE (Crypto)', value: 'BINANCE' },
  { label: 'CME (Futures)', value: 'CME' },
  { label: 'FX (Forex)', value: 'FX' },
  { label: 'TVC (Commodities)', value: 'TVC' },
] as const;

const INITIAL_POPULAR_SYMBOLS: TvSymbolResult[] = [
  { symbol: 'NIFTY', description: 'NIFTY 50 Index', type: 'index', exchange: 'NSE', country: 'IN', currency: 'INR' },
  { symbol: 'BANKNIFTY', description: 'Nifty Bank Index', type: 'index', exchange: 'NSE', country: 'IN', currency: 'INR' },
  { symbol: 'RELIANCE', description: 'Reliance Industries Ltd', type: 'stock', exchange: 'NSE', country: 'IN', currency: 'INR', logoid: 'reliance' },
  { symbol: 'TCS', description: 'Tata Consultancy Services', type: 'stock', exchange: 'NSE', country: 'IN', currency: 'INR' },
  { symbol: 'XAUUSD', description: 'Gold / US Dollar (Spot)', type: 'commodity', exchange: 'TVC', currency: 'USD' },
  { symbol: 'BTCUSDT', description: 'Bitcoin / TetherUS Spot', type: 'spot', exchange: 'BINANCE', currency: 'USDT', logoid: 'crypto/XTVCBTC' },
  { symbol: 'ETHUSDT', description: 'Ethereum / TetherUS Spot', type: 'spot', exchange: 'BINANCE', currency: 'USDT', logoid: 'crypto/XTVCETH' },
  { symbol: 'SOLUSDT', description: 'Solana / TetherUS Spot', type: 'spot', exchange: 'BINANCE', currency: 'USDT' },
  { symbol: 'EURUSD', description: 'Euro / US Dollar', type: 'forex', exchange: 'FX', currency: 'USD' },
  { symbol: 'USDINR', description: 'US Dollar / Indian Rupee', type: 'forex', exchange: 'FX_IDC', country: 'IN', currency: 'INR' },
  { symbol: 'USOIL', description: 'Crude Oil WTI', type: 'commodity', exchange: 'TVC', currency: 'USD' },
  { symbol: 'ES1!', description: 'S&P 500 E-mini Futures', type: 'futures', exchange: 'CME_MINI', currency: 'USD' },
  { symbol: 'NQ1!', description: 'Nasdaq 100 E-mini Futures', type: 'futures', exchange: 'CME_MINI', currency: 'USD' },
  { symbol: 'NVDA', description: 'NVIDIA Corporation', type: 'stock', exchange: 'NASDAQ', country: 'US', currency: 'USD', logoid: 'nvidia' },
  { symbol: 'AAPL', description: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ', country: 'US', currency: 'USD', logoid: 'apple' },
  { symbol: 'TSLA', description: 'Tesla, Inc.', type: 'stock', exchange: 'NASDAQ', country: 'US', currency: 'USD', logoid: 'tesla' },
  { symbol: 'MSFT', description: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ', country: 'US', currency: 'USD', logoid: 'microsoft' },
  { symbol: 'AMZN', description: 'Amazon.com, Inc.', type: 'stock', exchange: 'NASDAQ', country: 'US', currency: 'USD', logoid: 'amazon' },
];

export default function SearchCommand({
  onSelectSymbol,
}: {
  onSelectSymbol?: (symbol: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedExchange, setSelectedExchange] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [symbols, setSymbols] = useState<TvSymbolResult[]>(INITIAL_POPULAR_SYMBOLS);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  // Focus input on dialog open and reset state
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [open]);

  // Fetch symbols from TradingView API
  const fetchSymbols = useCallback(async (query: string, catValue: string, exchangeValue: string) => {
    setLoading(true);
    try {
      const tvType = TV_CATEGORIES.find((c) => c.value === catValue)?.tvType ?? '';
      const ex = exchangeValue === 'ALL' ? '' : exchangeValue;
      const results = await searchTradingViewSymbols(query, tvType, ex, 0);
      if (results && results.length > 0) {
        setSymbols(results);
      } else if (!query && exchangeValue === 'ALL' && catValue === 'all') {
        setSymbols(INITIAL_POPULAR_SYMBOLS);
      } else {
        setSymbols([]);
      }
    } catch {
      setSymbols(query ? [] : INITIAL_POPULAR_SYMBOLS);
    } finally {
      setLoading(false);
      setSelectedIndex(0);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      fetchSymbols(searchTerm, category, selectedExchange);
    }, searchTerm ? 140 : 0);
    return () => clearTimeout(timer);
  }, [open, searchTerm, category, selectedExchange, fetchSymbols]);

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

  // Keyboard navigation (Arrow Up, Down, Enter, Esc)
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
      const item = symbols[selectedIndex];
      const displaySymbol = (item.symbol || '').replace(/<[^>]*>/g, '');
      const displayDesc = (item.description || '').replace(/<[^>]*>/g, '');
      const full = item.exchange && !displaySymbol.includes(':') ? `${item.exchange}:${displaySymbol}` : displaySymbol;
      handleSelect(full, displayDesc);
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
      <DialogContent className="max-w-4xl w-[94vw] sm:w-[860px] overflow-hidden p-0 rounded-2xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-2xl font-sans">
        <DialogHeader className="sr-only">
          <DialogTitle>TradingView Symbol Search</DialogTitle>
          <DialogDescription>Search worldwide stocks, indices, crypto, forex, commodities, and futures</DialogDescription>
        </DialogHeader>

        {/* ============ OFFICIAL TRADINGVIEW SEARCH HEADER ============ */}
        <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800/80 px-4 py-3 bg-zinc-50/70 dark:bg-zinc-900/50">
          <Search className="size-5 text-zinc-500 dark:text-zinc-400 shrink-0" strokeWidth={2.2} />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search symbol, e.g. AAPL, NIFTY, BTCUSDT, GOLD..."
            className="flex-1 bg-transparent text-[15px] font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none font-sans"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
          {loading ? (
            <Loader2 className="size-4 animate-spin text-zinc-500 shrink-0" />
          ) : (
            <span className="text-[11px] font-mono font-medium text-zinc-400 px-2 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800">
              {symbols.length} results
            </span>
          )}
        </div>

        {/* ============ CATEGORY FILTER TABS (TradingView Standard) ============ */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 [scrollbar-width:none]">
          {TV_CATEGORIES.map((cat) => {
            const active = category === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-all shrink-0 cursor-pointer font-sans',
                  active
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900',
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ============ EXCHANGE SELECTOR PILLS ============ */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-1.5 border-b border-zinc-200/70 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 text-[11.5px] [scrollbar-width:none]">
          <span className="text-zinc-400 font-medium shrink-0 flex items-center gap-1 mr-1">
            <Globe className="size-3" /> Exchange:
          </span>
          {TV_EXCHANGES.map((ex) => {
            const active = selectedExchange === ex.value;
            return (
              <button
                key={ex.value}
                type="button"
                onClick={() => setSelectedExchange(ex.value)}
                className={cn(
                  'rounded-md px-2 py-0.5 font-medium transition-colors shrink-0 cursor-pointer font-mono',
                  active
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800',
                )}
              >
                {ex.label}
              </button>
            );
          })}
        </div>

        {/* ============ TABLE HEADERS ============ */}
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_80px_120px] items-center px-4 py-1.5 bg-zinc-100/70 dark:bg-zinc-900/80 text-[10.5px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
          <span>Symbol</span>
          <span>Description</span>
          <span>Type</span>
          <span className="text-right">Exchange</span>
        </div>

        {/* ============ RESULTS LIST ============ */}
        <div
          ref={listRef}
          className="max-h-[440px] min-h-[280px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/50 font-sans"
        >
          {symbols.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400">
              <Search className="size-8 stroke-1 mb-2 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No symbols found</p>
              <p className="text-xs text-zinc-400 mt-0.5">Try searching another ticker, company, or exchange</p>
            </div>
          ) : (
            symbols.map((item, idx) => {
              const displaySymbol = (item.symbol || '').replace(/<[^>]*>/g, '');
              const displayDesc = (item.description || '').replace(/<[^>]*>/g, '');
              const fullSelected = item.exchange && !displaySymbol.includes(':') ? `${item.exchange}:${displaySymbol}` : displaySymbol;
              const isSelected = selectedIndex === idx;

              // Type badge color
              const typeLower = (item.type || '').toLowerCase();
              const isCrypto = typeLower.includes('crypto') || typeLower.includes('spot') || typeLower.includes('coin');
              const isIndex = typeLower.includes('index');
              const isFutures = typeLower.includes('future');
              const isForex = typeLower.includes('forex');
              const isCommodity = typeLower.includes('commodity');

              const typeBadgeClass = isCrypto
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                : isIndex
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                : isFutures
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : isForex
                ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300'
                : isCommodity
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300'
                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';

              return (
                <div
                  key={`${displaySymbol}-${item.exchange}-${idx}`}
                  data-search-row
                  onClick={() => handleSelect(fullSelected, displayDesc)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'grid grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_80px_120px] items-center px-4 py-2.5 cursor-pointer transition-colors text-[13px]',
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60',
                  )}
                >
                  {/* Column 1: Symbol & Logo */}
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <StockSymbolIcon
                      symbol={displaySymbol}
                      logoid={item.logoid}
                      type={item.type}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <span className="font-bold font-mono tracking-tight text-[13.5px] text-zinc-950 dark:text-white truncate block">
                        {displaySymbol}
                      </span>
                      {item.currency && (
                        <span className="text-[10px] font-mono text-zinc-400">
                          {item.currency}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Description */}
                  <div className="min-w-0 pr-3">
                    <p className="truncate text-zinc-600 dark:text-zinc-300 font-medium text-[12.5px]">
                      {displayDesc || displaySymbol}
                    </p>
                  </div>

                  {/* Column 3: Type */}
                  <div>
                    <span className={cn('inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', typeBadgeClass)}>
                      {item.type || 'stock'}
                    </span>
                  </div>

                  {/* Column 4: Exchange & Action */}
                  <div className="flex items-center justify-end gap-2 text-right">
                    <span className="font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {item.exchange || 'AUTO'}
                    </span>
                    <WatchlistButton
                      symbol={displaySymbol}
                      name={displayDesc}
                      exchange={item.exchange}
                      variant="icon"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ============ FOOTER SHORTCUTS ============ */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-[11.5px] text-zinc-500 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px]">↑</kbd>
              <kbd className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px]">↓</kbd>
              <span className="ml-0.5">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
              <span className="ml-0.5">Select stock</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
              <span className="ml-0.5">Close</span>
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">
            Powered by TradingView
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
