'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@kortix/ui/dialog';
import { Loader2, Search, X } from 'lucide-react';
import { searchTradingViewSymbols } from './tradingview.actions';
import type { TvSymbolResult } from './types';
import { cn } from '@kortix/ui';
import { TradingPairIcon } from '../journal/TradingPairIcon';
import { TOP_MARKET_SYMBOLS } from '../journal/data/top-instruments';
import WatchlistButton from './WatchlistButton';

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
      'inline-flex items-center gap-2.5 h-9 px-3 rounded-xl border border-border/70 bg-muted/40 hover:bg-muted/70 text-xs font-normal text-muted-foreground hover:text-foreground transition-all shadow-2xs cursor-pointer font-sans',
      className,
    )}
  >
    <Search className="size-3.5 text-muted-foreground shrink-0" />
    {children ? (
      children
    ) : (
      <>
        <span className="font-sans text-xs font-medium text-foreground/90">Search stocks...</span>
        <kbd className="hidden sm:inline-block ml-2 rounded-md bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/50">
          ⌘K
        </kbd>
      </>
    )}
  </button>
);

// Exact categories matching Image 4
const TV_CATEGORIES = [
  { label: 'All', value: 'all', tvType: '' },
  { label: 'Stocks', value: 'stocks', tvType: 'stocks' },
  { label: 'Funds', value: 'funds', tvType: 'funds' },
  { label: 'Futures', value: 'futures', tvType: 'futures' },
  { label: 'Forex', value: 'forex', tvType: 'forex' },
  { label: 'Crypto', value: 'crypto', tvType: 'crypto' },
  { label: 'Indices', value: 'indices', tvType: 'index' },
  { label: 'Bonds', value: 'bonds', tvType: 'bond' },
  { label: 'Economy', value: 'economy', tvType: 'economic' },
  { label: 'Options', value: 'options', tvType: 'options' },
] as const;

interface SearchModalItem {
  symbol: string;
  description: string;
  category: string;
  exchange: string;
  logoid?: string;
  type?: string;
  isIndia?: boolean;
}

export default function SearchCommand({
  onSelectSymbol,
}: {
  onSelectSymbol?: (symbol: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [symbols, setSymbols] = useState<SearchModalItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef<number>(0);

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
    const trimmed = query.trim();
    const catLabel = TV_CATEGORIES.find((c) => c.value === catValue)?.label || 'All';
    const thisRequestId = ++requestIdRef.current;

    // 1. If empty query, show top curated symbols for this category
    if (!trimmed) {
      const topItems = catValue === 'all'
        ? TOP_MARKET_SYMBOLS.slice(0, 50)
        : TOP_MARKET_SYMBOLS.filter((s) => s.category.toLowerCase() === catLabel.toLowerCase()).slice(0, 40);

      setSymbols(
        topItems.map((s) => ({
          symbol: s.symbol,
          description: s.name,
          category: s.category,
          exchange: s.exchange || 'NSE',
          logoid: s.logoid,
          isIndia: s.exchange === 'NSE' || s.exchange === 'BSE' || s.exchange === 'MCX',
        }))
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Query local Indian catalog first for instant complete results
      const catParam = catValue !== 'all' ? `&category=${encodeURIComponent(catLabel)}` : '';
      const localPromise = fetch(`/api/markets/symbols?q=${encodeURIComponent(trimmed)}${catParam}`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []);

      // Query TradingView remote search in parallel for global symbols
      const tvType = TV_CATEGORIES.find((c) => c.value === catValue)?.tvType ?? '';
      const tvPromise = searchTradingViewSymbols(trimmed, tvType, '', 0).catch(() => []);

      const [localResults, tvResults] = await Promise.all([localPromise, tvPromise]);

      // If a newer request has already fired, ignore this one
      if (thisRequestId !== requestIdRef.current) return;

      const seen = new Set<string>();
      const rawList: SearchModalItem[] = [];

      // Add local results first
      if (Array.isArray(localResults)) {
        for (const item of localResults) {
          const k = `${item.symbol}:${item.exchange}`;
          if (!seen.has(k)) {
            seen.add(k);
            rawList.push({
              symbol: item.symbol,
              description: item.name,
              category: item.category,
              exchange: item.exchange,
              logoid: item.logoid,
              isIndia: item.exchange === 'NSE' || item.exchange === 'BSE' || item.exchange === 'MCX',
            });
          }
        }
      }

      // Add global results from TradingView
      if (Array.isArray(tvResults)) {
        for (const r of tvResults) {
          const sym = (r.symbol || '').replace(/<[^>]*>/g, '');
          const ex = r.exchange || 'US';
          const k = `${sym}:${ex}`;
          if (!seen.has(k)) {
            seen.add(k);
            rawList.push({
              symbol: sym,
              description: (r.description || '').replace(/<[^>]*>/g, ''),
              category: r.type || 'Stock',
              exchange: ex,
              logoid: r.logoid,
              isIndia: r.country === 'IN' || ex === 'NSE' || ex === 'BSE',
            });
          }
        }
      }

      // 1. Deduplicate: if an equity is present on both NSE and BSE, prioritize NSE and drop the BSE duplicate
      const nseSymbols = new Set<string>();
      for (const item of rawList) {
        if (item.exchange === 'NSE') {
          nseSymbols.add(item.symbol.toUpperCase());
        }
      }

      const deduplicated: SearchModalItem[] = [];
      for (const item of rawList) {
        const symUpper = item.symbol.toUpperCase();
        if (item.exchange === 'BSE' && nseSymbols.has(symUpper)) {
          continue; // Skip BSE duplicate of NSE stock
        }
        deduplicated.push(item);
      }

      // 2. Intelligently Rank:
      // Exact ticker match at the top (#1)
      // Prefix match at #2
      // Standard equities before distant dated monthly futures (IDEAF2027, etc.)
      const queryUpper = trimmed.toUpperCase();
      deduplicated.sort((a, b) => {
        const aSym = a.symbol.toUpperCase();
        const bSym = b.symbol.toUpperCase();

        const aExact = aSym === queryUpper;
        const bExact = bSym === queryUpper;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = aSym.startsWith(queryUpper);
        const bStarts = bSym.startsWith(queryUpper);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // Push distant monthly dated contracts (e.g. IDEAF2027, IDEAX2026) below main stock/continuous contracts
        const aDated = /\d{4}$/.test(aSym);
        const bDated = /\d{4}$/.test(bSym);
        if (!aDated && bDated) return -1;
        if (aDated && !bDated) return 1;

        return 0;
      });

      setSymbols(deduplicated.slice(0, 60));
    } catch {
      if (thisRequestId === requestIdRef.current) {
        setSymbols([]);
      }
    } finally {
      if (thisRequestId === requestIdRef.current) {
        setLoading(false);
        setSelectedIndex(0);
      }
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      fetchSymbols(searchTerm, category);
    }, searchTerm ? 180 : 0);
    return () => clearTimeout(timer);
  }, [open, searchTerm, category, fetchSymbols]);

  const handleSelect = (item: SearchModalItem) => {
    setOpen(false);
    const displaySymbol = item.symbol.replace(/<[^>]*>/g, '');
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
      setSelectedIndex((prev) => (prev < symbols.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (symbols[selectedIndex]) {
        handleSelect(symbols[selectedIndex]);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-[800px] w-[94vw] p-0 gap-0 overflow-hidden border border-border/80 shadow-2xl bg-popover rounded-2xl font-sans"
        aria-describedby="symbol-search-description"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Symbol Search</DialogTitle>
          <DialogDescription id="symbol-search-description">
            Search worldwide and Indian stocks, indices, ETFs, F&O, forex, and crypto
          </DialogDescription>
        </DialogHeader>

        {/* Search Input Bar (Sleek Kortix style) */}
        <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5 border-b border-border/50 bg-background">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search stocks, indices, ETFs, forex, crypto..."
            className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none font-sans"
            autoFocus
          />
          {loading && (
            <Loader2 className="size-3.5 text-muted-foreground animate-spin shrink-0 mr-1" />
          )}
          <button
            type="button"
            onClick={() => {
              if (searchTerm) {
                setSearchTerm('');
              } else {
                setOpen(false);
              }
            }}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            title={searchTerm ? 'Clear search' : 'Close (Esc)'}
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Category Filter Pills (Exact Image 4 options & style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-3.5 py-2 bg-muted/20 border-b border-border/50 [scrollbar-width:none]">
          {TV_CATEGORIES.map((cat) => {
            const active = category === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all shrink-0 cursor-pointer font-sans',
                  active
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Results List with Decent Size Icons & Kortix Roobert typography */}
        <div
          ref={listRef}
          className="max-h-[55vh] min-h-[380px] overflow-y-auto p-1.5 space-y-0.5 font-sans [scrollbar-width:thin] scrollbar-thin"
        >
          {loading && symbols.length === 0 && (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 font-sans">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-xs font-medium">Searching live markets...</span>
            </div>
          )}

          {!loading && symbols.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground font-sans">
              <p className="text-sm font-medium text-foreground">No symbols found</p>
              <p className="text-xs text-muted-foreground mt-0.5">Try searching another ticker or category</p>
            </div>
          )}

          {symbols.map((item, idx) => {
              const displaySymbol = item.symbol.replace(/<[^>]*>/g, '');
              const displayDesc = item.description.replace(/<[^>]*>/g, '');
              const isSelected = selectedIndex === idx;

              return (
                <div
                  key={`${displaySymbol}-${item.exchange}-${idx}`}
                  data-search-row
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex items-center justify-between px-3 py-1.5 rounded-xl cursor-pointer transition-colors select-none font-sans',
                    isSelected ? 'bg-muted text-foreground' : 'hover:bg-muted/50 text-foreground/90',
                  )}
                >
                  {/* Left: Authentic SVG Logo (Decent size) + Symbol Name + Description */}
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <TradingPairIcon
                      symbol={displaySymbol}
                      logoid={item.logoid}
                      size="md"
                    />

                    <div className="min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 leading-snug">
                        <span className="font-semibold text-[13px] text-foreground font-sans tracking-tight">
                          {displaySymbol}
                        </span>
                        {item.isIndia && (
                          <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">
                            IN
                          </span>
                        )}
                      </div>

                      <span className="truncate text-[11.5px] text-muted-foreground font-normal font-sans leading-none mt-0.5">
                        {displayDesc || displaySymbol}
                      </span>
                    </div>
                  </div>

                  {/* Right: Exchange + Category + Quick Pin Button (Image 7 style) */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-sans text-muted-foreground uppercase font-medium">
                      {item.exchange}
                    </span>

                    {item.category && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#f4f4f5] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium font-sans">
                        {item.category}
                      </span>
                    )}

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="ml-1"
                    >
                      <WatchlistButton
                        symbol={displaySymbol}
                        name={displayDesc}
                        exchange={item.exchange}
                        variant="icon"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
