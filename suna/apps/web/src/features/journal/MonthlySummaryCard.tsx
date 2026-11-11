'use client';

import React from 'react';
import { JournalTrade } from './types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MonthlySummaryCardProps {
  trades: JournalTrade[];
  monthLabel?: string;
}

export function MonthlySummaryCard({ trades, monthLabel }: MonthlySummaryCardProps) {
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const winCount = wins.length;
  const lossCount = losses.length;

  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
  const totalWinPnl = wins.reduce((acc, t) => acc + t.pnl, 0);
  const totalLossPnl = losses.reduce((acc, t) => acc + t.pnl, 0);

  const avgWin = winCount > 0 ? totalWinPnl / winCount : 0;
  const avgLoss = lossCount > 0 ? totalLossPnl / lossCount : 0;

  const bestTrade = totalTrades > 0 ? Math.max(...trades.map((t) => t.pnl)) : 0;
  const worstTrade = totalTrades > 0 ? Math.min(...trades.map((t) => t.pnl)) : 0;

  // Expectancy R from real return_r (only defined when totalTrades > 0)
  const avgR =
    totalTrades > 0
      ? trades.reduce((acc, t) => acc + (t.returnR ?? 0), 0) / totalTrades
      : 0;

  // Contiguous 5-bucket R-multiple distribution covering all values (-Infinity to +Infinity)
  const buckets = [
    { label: '<-1R', count: trades.filter((t) => (t.returnR ?? 0) < -1).length },
    { label: '-1R to 0', count: trades.filter((t) => (t.returnR ?? 0) >= -1 && (t.returnR ?? 0) < 0).length },
    { label: '0 to 1R', count: trades.filter((t) => (t.returnR ?? 0) >= 0 && (t.returnR ?? 0) < 1).length },
    { label: '1R to 2R', count: trades.filter((t) => (t.returnR ?? 0) >= 1 && (t.returnR ?? 0) < 2).length },
    { label: '>=2R', count: trades.filter((t) => (t.returnR ?? 0) >= 2).length },
  ];

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  const formatCurrency = (val: number) => {
    if (val === 0) return '$0.00';
    const sign = val > 0 ? '+' : '-';
    return `${sign}$${Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const pnlColorClass = (val: number) => {
    if (val > 0) return 'text-emerald-600';
    if (val < 0) return 'text-rose-600';
    return 'text-zinc-600';
  };

  return (
    <Card className="bg-white border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col gap-4 font-sans h-full">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <h2 className="text-sm font-bold text-zinc-950 tracking-tight">Monthly Summary</h2>
        <Badge variant="secondary" className="font-sans text-xs font-medium text-zinc-600 bg-zinc-100/90 border border-zinc-200/80 px-2.5 py-0.5 rounded-lg tracking-normal">
          {monthLabel || 'Performance Metrics'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end flex-1">
        {/* Left: Bar Chart of R-distribution in black & white (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-end h-48 pt-2">
          <div className="flex items-end justify-between gap-3 h-36 px-2 border-b border-zinc-200/80 pb-2">
            {buckets.map((b) => {
              const heightPct = b.count > 0 ? Math.max(16, Math.round((b.count / maxCount) * 100)) : 4;
              return (
                <div
                  key={b.label}
                  className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
                  title={`${b.label}: ${b.count} ${b.count === 1 ? 'trade' : 'trades'}`}
                >
                  <span
                    className={`text-[10px] font-sans tabular-nums font-semibold transition-opacity ${
                      b.count > 0 ? 'text-zinc-600 opacity-100' : 'text-zinc-400 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {b.count}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[44px] rounded-t-lg transition-all shadow-2xs ${
                      b.count > 0 ? 'bg-zinc-950 hover:bg-zinc-800' : 'bg-zinc-200/80'
                    }`}
                  />
                  <span className="text-[11px] text-zinc-600 font-sans font-medium tracking-normal truncate max-w-[58px] text-center">
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500 px-2 pt-2.5 font-sans font-medium tracking-normal">
            <span>Risk-to-Reward Distribution</span>
            <span>R-Multiple</span>
          </div>
        </div>

        {/* Right: Key Performance Stats Table (5 cols) */}
        <div className="md:col-span-5 flex flex-col justify-between h-full border-t md:border-t-0 md:border-l border-zinc-100 md:pl-6 pt-4 md:pt-0">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500 font-normal">Expectancy</span>
              {totalTrades > 0 ? (
                <span className={`font-sans tabular-nums font-medium ${pnlColorClass(avgR)}`}>
                  {avgR > 0 ? '+' : ''}
                  {avgR.toFixed(2)}R
                </span>
              ) : (
                <span className="font-sans tabular-nums font-medium text-zinc-400">—</span>
              )}
            </div>
            <div className="flex items-center justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500 font-normal">Win rate</span>
              {totalTrades > 0 ? (
                <span className="font-sans tabular-nums font-medium text-zinc-900">{winRate.toFixed(1)}%</span>
              ) : (
                <span className="font-sans tabular-nums font-medium text-zinc-400">—</span>
              )}
            </div>
            <div className="flex items-center justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500 font-normal">Avg Win</span>
              {winCount > 0 ? (
                <span className="font-sans tabular-nums font-medium text-emerald-600">{formatCurrency(avgWin)}</span>
              ) : (
                <span className="font-sans tabular-nums font-medium text-zinc-400">—</span>
              )}
            </div>
            <div className="flex items-center justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500 font-normal">Avg Loss</span>
              {lossCount > 0 ? (
                <span className="font-sans tabular-nums font-medium text-rose-600">{formatCurrency(avgLoss)}</span>
              ) : (
                <span className="font-sans tabular-nums font-medium text-zinc-400">—</span>
              )}
            </div>
            <div className="flex items-center justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500 font-normal">Best trade</span>
              {totalTrades > 0 ? (
                <span className={`font-sans tabular-nums font-medium ${pnlColorClass(bestTrade)}`}>
                  {formatCurrency(bestTrade)}
                </span>
              ) : (
                <span className="font-sans tabular-nums font-medium text-zinc-400">—</span>
              )}
            </div>
            <div className="flex items-center justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500 font-normal">Worst trade</span>
              {totalTrades > 0 ? (
                <span className={`font-sans tabular-nums font-medium ${pnlColorClass(worstTrade)}`}>
                  {formatCurrency(worstTrade)}
                </span>
              ) : (
                <span className="font-sans tabular-nums font-medium text-zinc-400">—</span>
              )}
            </div>
            <div className="flex items-center justify-between py-1.5 pt-2">
              <span className="text-zinc-500 font-normal">Total trades</span>
              <div className="text-right">
                <span className="font-sans tabular-nums font-medium text-zinc-800 mr-2">{totalTrades}</span>
                <span className="text-[10px] font-sans tabular-nums text-zinc-400">
                  {winCount}W:{lossCount}L
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
