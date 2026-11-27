'use client';

import React, { useEffect, useState } from 'react';
import { Plus, MagnifyingGlass, ArrowUpRight } from '@phosphor-icons/react';
import KortixPinIcon from './KortixPinIcon';
import { getStoredWatchlist, type WatchlistEntry } from './watchlist.store';
import WatchlistButton from './WatchlistButton';
import { TradingPairIcon } from '../journal/TradingPairIcon';
import { openSearch } from './SearchCommand';
import TvTickerTag from './TvTickerTag';
import { resolveTradingViewSymbol } from './symbol-resolver';
import { getLocalTrades } from '../journal/storage';
import { cn, Card, Button, Badge } from '@kortix/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kortix/ui/table';

interface WatchlistTableProps {
  onSelectSymbol?: (symbol: string, name?: string, exchange?: string) => void;
  selectedSymbol?: string;
  positions?: any[];
  journalTrades?: any[];
}

export const WatchlistTable = React.memo(function WatchlistTable({
  onSelectSymbol,
  selectedSymbol,
  positions = [],
  journalTrades,
}: WatchlistTableProps) {
  const [items, setItems] = useState<WatchlistEntry[]>(() => getStoredWatchlist());
  const [trades, setTrades] = useState<any[]>(() => journalTrades || getLocalTrades());

  useEffect(() => {
    const onUpdate = () => {
      const next = getStoredWatchlist();
      setItems((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    window.addEventListener('watchlist-updated', onUpdate);
    return () => window.removeEventListener('watchlist-updated', onUpdate);
  }, []);

  useEffect(() => {
    if (journalTrades) {
      setTrades((prev) => (JSON.stringify(prev) === JSON.stringify(journalTrades) ? prev : journalTrades));
    } else {
      const onTrades = () => {
        const next = getLocalTrades();
        setTrades((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      };
      window.addEventListener('trading-journal-updated', onTrades);
      return () => window.removeEventListener('trading-journal-updated', onTrades);
    }
  }, [journalTrades]);

  // Compute profit/loss for a watchlist symbol
  const getSymbolPnl = (item: WatchlistEntry): number => {
    const symUpper = item.symbol.toUpperCase().trim();
    const nameUpper = (item.name || '').toUpperCase().trim();

    // 1. Check live open/recent positions from Dhan API
    if (Array.isArray(positions) && positions.length > 0) {
      const match = positions.find((p: any) => {
        const pSym = (p.tradingSymbol || p.customSymbol || '').toUpperCase().trim();
        return (
          pSym === symUpper ||
          (symUpper === 'CENTRALBK' && pSym.includes('CENTRAL')) ||
          (symUpper === 'IOB' && pSym.includes('INDIAN OVERSEAS')) ||
          (symUpper === 'IDEA' && pSym.includes('VODAFONE'))
        );
      });
      if (match) {
        if (typeof match.unrealizedProfit === 'number' && match.unrealizedProfit !== 0) {
          return match.unrealizedProfit;
        }
        if (typeof match.realizedProfit === 'number' && match.realizedProfit !== 0) {
          return match.realizedProfit;
        }
      }
    }

    // 2. Check journal trades for this symbol
    if (Array.isArray(trades) && trades.length > 0) {
      const matchingTrades = trades.filter((t: any) => {
        const tInst = (t.instrument || '').toUpperCase().trim();
        return (
          tInst === symUpper ||
          tInst === nameUpper ||
          (symUpper === 'CENTRALBK' && tInst.includes('CENTRAL')) ||
          (symUpper === 'IOB' && tInst.includes('INDIAN OVERSEAS')) ||
          (symUpper === 'IDEA' && tInst.includes('VODAFONE'))
        );
      });
      if (matchingTrades.length > 0) {
        return matchingTrades.reduce((acc: number, t: any) => acc + (t.pnl || 0), 0);
      }
    }

    return 0;
  };

  const isIndianExchange = (ex?: string) => {
    const e = (ex || '').toUpperCase();
    return e === 'NSE' || e === 'BSE' || e === 'MCX' || e === 'NFO';
  };

  return (
    <div className="flex flex-col gap-3 font-sans">
      <Card variant="outlined" className="rounded-xl border border-border/80 bg-popover shadow-2xs overflow-hidden p-0">
        {/* Card Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <KortixPinIcon className="size-4 text-foreground" />
            <h3 className="text-sm font-semibold tracking-tight text-foreground font-sans">Watchlist</h3>
            <Badge variant="secondary" size="tabular" className="rounded-full font-mono text-[11px]">
              {items.length}
            </Badge>
          </div>

          {/* "+ Add symbol" Button styled cleanly in Kortix primary */}
          <Button
            type="button"
            size="xs"
            onClick={openSearch}
            className="gap-1.5 rounded-lg font-sans font-medium"
          >
            <Plus className="size-3.5" />
            <span>Add symbol</span>
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/10 font-sans">
            <KortixPinIcon className="size-8 text-muted-foreground/60 mb-2" />
            <p className="text-sm font-semibold tracking-tight text-foreground font-sans">Your watchlist is empty</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs font-sans">
              Search worldwide stocks, indices, crypto, or forex and pin them here to track live.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={openSearch}
              className="mt-4 gap-2 rounded-lg font-sans font-medium"
            >
              <MagnifyingGlass className="size-3.5" />
              <span>Search stocks</span>
            </Button>
          </div>
        ) : (
          <Table className="font-sans">
            <TableHeader className="bg-muted/30 text-xs font-medium text-muted-foreground font-sans">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-2.5 px-3 sm:px-5 font-medium text-xs">Symbol / Name</TableHead>
                <TableHead className="hidden sm:table-cell py-2.5 px-5 font-medium text-xs">Exchange</TableHead>
                <TableHead className="py-2.5 px-3 sm:px-5 text-right font-medium text-xs">Price</TableHead>
                <TableHead className="hidden md:table-cell py-2.5 px-5 text-right font-medium text-xs">PnL</TableHead>
                <TableHead className="py-2.5 px-3 sm:px-5 text-right font-medium text-xs">Change</TableHead>
                <TableHead className="hidden sm:table-cell py-2.5 px-5 text-center w-16 font-medium text-xs">Pin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40 font-sans">
              {items.map((item) => {
                const isSelected = selectedSymbol === item.symbol;
                const isPositive = (item.change ?? 0) >= 0;
                const pnl = getSymbolPnl(item);
                const isPnlPositive = pnl > 0;
                const isPnlNegative = pnl < 0;
                const isIndian = isIndianExchange(item.exchange);
                const currencyPrefix = isIndian ? '₹' : '$';

                return (
                  <TableRow
                    key={item.symbol}
                    onClick={() => {
                      const effectiveEx = item.exchange || 'NSE';
                      const resolved = resolveTradingViewSymbol(item.symbol, item.name, effectiveEx);
                      const fullSym = resolved.fullSymbol || `${effectiveEx}:${item.symbol}`;
                      if (onSelectSymbol) {
                        onSelectSymbol(fullSym, item.name, effectiveEx);
                      }
                      window.dispatchEvent(
                        new CustomEvent('selected-stock-symbol', {
                          detail: { symbol: fullSym, name: item.name, exchange: effectiveEx },
                        }),
                      );
                    }}
                    className={cn(
                      'group hover:bg-muted/40 cursor-pointer transition-colors font-sans',
                      isSelected && 'bg-muted/60 font-medium',
                    )}
                  >
                    <TableCell className="py-2.5 px-3 sm:px-4">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <TradingPairIcon symbol={item.symbol} size="md" />
                        <div className="min-w-0">
                          <div className="font-medium text-foreground flex items-center gap-1.5 font-sans tracking-tight text-[13px]">
                            {item.symbol}
                            <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" />
                          </div>
                          <div className="text-[11px] sm:text-[11.5px] font-normal text-muted-foreground truncate max-w-[110px] sm:max-w-[220px] font-sans">
                            {item.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-3 px-5">
                      <Badge variant="secondary" className="text-[11px] font-mono">
                        {item.exchange || 'NSE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 px-3 sm:px-5 text-right font-normal tabular-nums text-xs sm:text-sm text-foreground font-mono tracking-tight whitespace-nowrap">
                      {currencyPrefix}{item.price?.toFixed(2) ?? '0.00'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-3 px-5 text-right font-normal tabular-nums text-xs font-mono tracking-tight whitespace-nowrap">
                      <span
                        className={cn(
                          'tabular-nums font-medium',
                          isPnlPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isPnlNegative
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-muted-foreground'
                        )}
                      >
                        {isPnlPositive ? '+' : isPnlNegative ? '-' : ''}₹{Math.abs(pnl).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 px-3 sm:px-5 text-right font-normal tabular-nums text-xs font-mono tracking-tight whitespace-nowrap">
                      <span className={cn(
                        'text-xs font-mono tabular-nums font-medium',
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      )}>
                        {isPositive ? '+' : ''}{item.changePercent?.toFixed(2) ?? '+0.00'}%
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-3 px-5 text-center">
                      <WatchlistButton
                        symbol={item.symbol}
                        name={item.name}
                        exchange={item.exchange}
                        variant="icon"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
});

export default WatchlistTable;
