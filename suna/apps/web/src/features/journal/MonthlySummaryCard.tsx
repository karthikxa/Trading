'use client';

import React from 'react';
import { JournalTrade } from './types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MonthlySummaryCardProps {
  trades: JournalTrade[];
}

export function MonthlySummaryCard({ trades }: MonthlySummaryCardProps) {
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const winCount = wins.length;
  const lossCount = losses.length;

  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 29.9;
  const totalWinPnl = wins.reduce((acc, t) => acc + t.pnl, 0);
  const totalLossPnl = losses.reduce((acc, t) => acc + t.pnl, 0);

  const avgWin = winCount > 0 ? totalWinPnl / winCount : 203582.37;
  const avgLoss = lossCount > 0 ? totalLossPnl / lossCount : -53271.04;

  const bestTrade = trades.length > 0 ? Math.max(...trades.map((t) => t.pnl)) : 2000000.0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map((t) => t.pnl)) : -890400.69;

  // Expectancy R
  const avgR = 0.12;

  // R Distribution counts
  const buckets = [
    { label: '<-2R', count: 3 },
    { label: '-1R to 0', count: 20 },
    { label: '0 to 1R', count: 22 },
    { label: '1R to 2R', count: 16 },
    { label: '>2R', count: 6 },
  ];

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  const formatCurrency = (val: number) => {
    const sign = val >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <Card className="bg-white border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col gap-4 font-sans h-full">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <h2 className="text-sm font-bold text-zinc-950 tracking-tight">Monthly Summary</h2>
        <Badge variant="secondary" className="font-mono text-zinc-500 font-medium bg-zinc-100 text-[10px]">
          Performance Metrics
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end flex-1">
        {/* Left: Bar Chart of R-distribution in black & white (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-end h-48 pt-2">
          <div className="flex items-end justify-between gap-3 h-36 px-2 border-b border-zinc-200/80 pb-2">
            {buckets.map((b) => {
              const heightPct = Math.max(14, Math.round((b.count / maxCount) * 100));
              return (
                <div key={b.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] font-mono text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                    {b.count}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[44px] rounded-t-lg bg-zinc-950 hover:bg-zinc-800 transition-all shadow-2xs"
                  />
                  <span className="text-[10px] text-zinc-600 font-mono font-medium tracking-tighter truncate max-w-[55px] text-center">
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 px-2 pt-2 font-mono">
            <span>Risk-to-Reward Distribution</span>
            <span>R-Multiple</span>
          </div>
        </div>

        {/* Right: Key Performance Stats Table (5 cols) */}
        <div className="md:col-span-5 flex flex-col justify-between h-full border-t md:border-t-0 md:border-l border-zinc-100 md:pl-6 pt-4 md:pt-0">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Expectancy</span>
              <span className="font-mono font-bold text-zinc-950">+{avgR.toFixed(2)}R</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Win rate</span>
              <span className="font-mono font-bold text-zinc-950">{winRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Avg Win</span>
              <span className="font-mono font-bold text-emerald-700">{formatCurrency(avgWin)}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Avg Loss</span>
              <span className="font-mono font-bold text-rose-700">{formatCurrency(avgLoss)}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Best trade</span>
              <span className="font-mono font-bold text-emerald-700">{formatCurrency(bestTrade)}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Worst trade</span>
              <span className="font-mono font-bold text-rose-700">{formatCurrency(worstTrade)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 pt-2">
              <span className="text-zinc-500 font-medium">Total trades</span>
              <div className="text-right">
                <span className="font-mono font-bold text-zinc-950 mr-2">{totalTrades}</span>
                <span className="text-[10px] font-mono text-zinc-500">
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
