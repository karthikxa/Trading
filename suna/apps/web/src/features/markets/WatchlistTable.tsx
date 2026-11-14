'use client';

import React, { useEffect, useState } from 'react';
import { Plus, MagnifyingGlass, ArrowUpRight } from '@phosphor-icons/react';
import KortixPinIcon from './KortixPinIcon';
import { getStoredWatchlist, type WatchlistEntry } from './watchlist.store';
import WatchlistButton from './WatchlistButton';
import StockSymbolIcon from './StockSymbolIcon';
import { openSearch } from './SearchCommand';
import TvTickerTag from './TvTickerTag';
import { cn } from '@kortix/ui';

interface WatchlistTableProps {
  onSelectSymbol?: (symbol: string) => void;
  selectedSymbol?: string;
}

export default function WatchlistTable({ onSelectSymbol, selectedSymbol }: WatchlistTableProps) {
  const [items, setItems] = useState<WatchlistEntry[]>([]);

  useEffect(() => {
    setItems(getStoredWatchlist());
    const onUpdate = () => setItems(getStoredWatchlist());
    window.addEventListener('watchlist-updated', onUpdate);
    return () => window.removeEventListener('watchlist-updated', onUpdate);
  }, []);

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <KortixPinIcon className="size-4 text-foreground" />
          <h3 className="text-sm font-semibold tracking-tight text-foreground font-sans">Watchlist</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-sans font-medium text-muted-foreground">
            {items.length}
          </span>
        </div>

        {/* "+ Add symbol" Button styled cleanly in Kortix primary */}
        <button
          type="button"
          onClick={openSearch}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>Add symbol</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/10 font-sans">
          <KortixPinIcon className="size-8 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-semibold text-foreground font-sans">Your watchlist is empty</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs font-sans">
            Search worldwide stocks, indices, crypto, or forex and pin them here to track live.
          </p>
          <button
            type="button"
            onClick={openSearch}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors cursor-pointer font-sans"
          >
            <MagnifyingGlass className="size-3.5" />
            <span>Search stocks</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-sans">
            <thead className="bg-muted/30 border-b border-border/50 text-xs font-medium text-muted-foreground font-sans">
              <tr>
                <th className="py-2.5 px-5 font-medium">Symbol / Name</th>
                <th className="py-2.5 px-5 font-medium">Exchange</th>
                <th className="py-2.5 px-5 text-right font-medium">Price</th>
                <th className="py-2.5 px-5 text-right font-medium">Change</th>
                <th className="py-2.5 px-5 text-center w-16 font-medium">Pin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-sans">
              {items.map((item) => {
                const isSelected = selectedSymbol === item.symbol;
                const isPositive = (item.change ?? 0) >= 0;
                return (
                  <tr
                    key={item.symbol}
                    onClick={() => {
                      if (onSelectSymbol) {
                        onSelectSymbol(item.symbol);
                      }
                      window.dispatchEvent(
                        new CustomEvent('selected-stock-symbol', {
                          detail: { symbol: item.symbol, name: item.name },
                        }),
                      );
                    }}
                    className={cn(
                      'group hover:bg-muted/40 cursor-pointer transition-colors font-sans',
                      isSelected && 'bg-muted/60 font-medium',
                    )}
                  >
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <StockSymbolIcon symbol={item.symbol} size="sm" />
                        <div>
                          <div className="font-medium text-foreground flex items-center gap-1.5 font-sans tracking-tight text-sm">
                            {item.symbol}
                            <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" />
                          </div>
                          <div className="text-xs font-normal text-muted-foreground truncate max-w-[220px] font-sans">
                            {item.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-sans font-medium text-muted-foreground bg-muted/60">
                        {item.exchange || 'NASDAQ'}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right font-normal tabular-nums text-sm text-foreground font-sans tracking-tight">
                      ${item.price?.toFixed(2) ?? '189.20'}
                    </td>
                    <td className="py-3 px-5 text-right font-normal tabular-nums text-xs font-sans tracking-tight">
                      <div className="flex items-center justify-end gap-1.5">
                        <TvTickerTag symbol={item.symbol} />
                        <span className={cn(
                          'text-xs font-sans tabular-nums',
                          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        )}>
                          {isPositive ? '+' : ''}{item.changePercent?.toFixed(2) ?? '+1.24'}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-center">
                      <WatchlistButton
                        symbol={item.symbol}
                        name={item.name}
                        exchange={item.exchange}
                        variant="icon"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
