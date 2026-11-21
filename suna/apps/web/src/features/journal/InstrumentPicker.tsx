'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Loader2 } from 'lucide-react';
import { TradingPairIcon } from './TradingPairIcon';
import { TOP_MARKET_SYMBOLS, MarketSymbolOption } from './data/top-instruments';
import { cn } from '@kortix/ui';

export type { MarketSymbolOption };
export { TOP_MARKET_SYMBOLS as ALL_MARKET_SYMBOLS };

interface InstrumentPickerProps {
  value: string;
  onChange: (symbol: string) => void;
}

export function InstrumentPicker({ value, onChange }: InstrumentPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchResults, setSearchResults] = useState<MarketSymbolOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Standard Kortix category options matching Image 4
  const categories = [
    'All',
    'Stocks',
    'Funds',
    'Futures',
    'Forex',
    'Crypto',
    'Indices',
    'Bonds',
    'Economy',
    'Options',
  ];

  // Dynamic search across the full 12,500+ Indian & Global market catalog
  useEffect(() => {
    if (!isOpen) return;
    const query = search.trim();
    if (!query) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const catParam = selectedCategory !== 'All' ? `&category=${encodeURIComponent(selectedCategory)}` : '';
        const res = await fetch(`/api/markets/symbols?q=${encodeURIComponent(query)}${catParam}`);
        if (res.ok) {
          const data: MarketSymbolOption[] = await res.json();
          setSearchResults(data);
        }
      } catch {
        // Fallback to client-side filter
      } finally {
        setIsLoading(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [search, selectedCategory, isOpen]);

  // Compute displayed list: merge top pre-loaded items with search results
  const displayedSymbols = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      if (selectedCategory === 'All') return TOP_MARKET_SYMBOLS;
      return TOP_MARKET_SYMBOLS.filter((item) => item.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (searchResults.length > 0) {
      return searchResults;
    }

    // Instant local filter while remote query debounces
    return TOP_MARKET_SYMBOLS.filter((item) => {
      const matchCat = selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, selectedCategory, searchResults]);

  // Look up current selected item for the trigger header
  const selectedItem = useMemo(() => {
    const clean = (value || '').toUpperCase().trim();
    return (
      TOP_MARKET_SYMBOLS.find((s) => s.symbol.toUpperCase() === clean) ||
      searchResults.find((s) => s.symbol.toUpperCase() === clean)
    );
  }, [value, searchResults]);

  return (
    <div ref={dropdownRef} className="relative w-full font-sans select-none">
      {/* Trigger Button: Sleek, compact Kortix Roobert UI style (Image 1 fix) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full h-11 flex items-center justify-between px-3 py-1.5 bg-background border border-border/80 rounded-xl hover:border-border hover:bg-muted/20 focus:outline-none focus:ring-1 focus:ring-ring transition-all shadow-2xs text-left cursor-pointer font-sans"
      >
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          <TradingPairIcon symbol={value || 'NIFTY 50'} logoid={selectedItem?.logoid} size="md" />
          <div className="flex flex-col min-w-0 justify-center">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-semibold text-[13px] text-foreground tracking-tight font-sans">
                {value || 'Select symbol'}
              </span>
              {selectedItem?.exchange && (
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider leading-none">
                  {selectedItem.exchange}
                </span>
              )}
            </div>
            {selectedItem?.name && (
              <span className="text-[11.5px] text-muted-foreground font-sans truncate mt-0.5 leading-none">
                {selectedItem.name}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`size-3.5 text-muted-foreground/70 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Kortix Command Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover border border-border/80 rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
          {/* Search Header */}
          <div className="px-3 py-2 border-b border-border/50 bg-muted/30 flex items-center gap-2 font-sans">
            <Search className="size-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Indian stocks, ETFs, indices, F&O, forex..."
              className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground w-full font-sans"
              autoFocus
            />
            {isLoading && <Loader2 className="size-3.5 text-muted-foreground animate-spin shrink-0" />}
          </div>

          {/* Category Chips Bar (Exact Image 4 options & style) */}
          <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto border-b border-border/50 bg-muted/10 [scrollbar-width:none]">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1 rounded-full shrink-0 text-xs font-medium transition-colors font-sans cursor-pointer',
                  selectedCategory === cat
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Symbol Results List (Decent size, compact Kortix style - Image 2 & 3 fix) */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 font-sans [scrollbar-width:thin] scrollbar-thin">
            {displayedSymbols.length === 0 ? (
              <div className="py-7 px-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5 font-sans">
                <span>No symbols found for &quot;{search}&quot;</span>
                {search.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(search.toUpperCase().trim());
                      setIsOpen(false);
                    }}
                    className="mt-1 text-xs font-medium text-foreground underline hover:text-foreground/80 font-sans cursor-pointer"
                  >
                    Use custom symbol &quot;{search.toUpperCase().trim()}&quot;
                  </button>
                )}
              </div>
            ) : (
              displayedSymbols.map((item) => {
                const isSelected = item.symbol.toUpperCase() === value.toUpperCase();
                return (
                  <button
                    key={`${item.symbol}-${item.category}-${item.exchange}`}
                    type="button"
                    onClick={() => {
                      onChange(item.symbol);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors cursor-pointer font-sans',
                      isSelected
                        ? 'bg-muted text-foreground font-medium'
                        : 'hover:bg-muted/50 text-foreground/90'
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0 pr-2">
                      <TradingPairIcon symbol={item.symbol} logoid={item.logoid} size="md" />
                      <div className="flex flex-col min-w-0 justify-center">
                        <div className="flex items-center gap-1.5 leading-snug">
                          <span className="font-semibold text-[13px] text-foreground tracking-tight font-sans">
                            {item.symbol}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                            {item.exchange}
                          </span>
                        </div>
                        <span className="text-[11.5px] text-muted-foreground font-sans truncate mt-0.5 leading-none">
                          {item.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-1.5">
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#f4f4f5] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium font-sans">
                        {item.category}
                      </span>
                      {isSelected && <Check className="size-3.5 text-foreground" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default InstrumentPicker;
