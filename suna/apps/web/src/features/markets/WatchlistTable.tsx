'use client';

import React, { useEffect, useState } from 'react';
import { Pin, Plus, Search, ArrowUpRight } from 'lucide-react';
import { getStoredWatchlist, type WatchlistEntry } from './watchlist.store';
import WatchlistButton from './WatchlistButton';
import StockSymbolIcon from './StockSymbolIcon';
import { openSearch } from './SearchCommand';
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
    <div className="flex flex-col gap-4">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pin className="size-4 text-zinc-950 fill-zinc-950" />
          <h3 className="text-sm font-bold text-zinc-950">Pinned Watchlist</h3>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
            {items.length}
          </span>
        </div>

        {/* Black "+ Add symbol" Button as requested by user */}
        <button
          type="button"
          onClick={openSearch}
          className="inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>Add symbol</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 text-center">
          <Pin className="size-8 text-zinc-400 stroke-1 mb-2" />
          <p className="text-sm font-semibold text-zinc-800">Your watchlist is empty</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs">
            Search worldwide stocks, indices, crypto, or forex and pin them here to track live.
          </p>
          <button
            type="button"
            onClick={openSearch}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <Search className="size-3.5" />
            <span>Search stocks</span>
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-2xs">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200/70 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Symbol / Name</th>
                <th className="py-2.5 px-4">Exchange</th>
                <th className="py-2.5 px-4 text-right">Price</th>
                <th className="py-2.5 px-4 text-right">Change</th>
                <th className="py-2.5 px-4 text-center w-16">Pin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((item) => {
                const isSelected = selectedSymbol === item.symbol;
                const isPositive = (item.change ?? 0) >= 0;
                return (
                  <tr
                    key={item.symbol}
                    onClick={() => onSelectSymbol?.(item.symbol)}
                    className={cn(
                      'group hover:bg-zinc-50/80 cursor-pointer transition-colors',
                      isSelected && 'bg-zinc-100/60 font-semibold',
                    )}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {/* SVG / Icon before the stock name */}
                        <StockSymbolIcon symbol={item.symbol} size="sm" />
                        <div>
                          <div className="font-bold text-zinc-950 flex items-center gap-1.5">
                            {item.symbol}
                            <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 text-zinc-400 transition-opacity" />
                          </div>
                          <div className="text-xs text-zinc-500 truncate max-w-[200px]">
                            {item.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-zinc-500">
                      {item.exchange || 'NASDAQ'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-zinc-900">
                      ${item.price?.toFixed(2) ?? '189.20'}
                    </td>
                    <td
                      className={cn(
                        'py-3 px-4 text-right font-mono font-medium text-xs',
                        isPositive ? 'text-emerald-600' : 'text-rose-600',
                      )}
                    >
                      {isPositive ? '+' : ''}
                      {item.changePercent?.toFixed(2) ?? '+1.24'}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      {/* Black Pin Button */}
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
