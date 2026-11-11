'use client';

import React from 'react';
import { JournalTrade } from './types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WeeklyBreakdownCardProps {
  trades: JournalTrade[];
  currentYear: number;
  currentMonth: number;
}

export function WeeklyBreakdownCard({
  trades,
  currentYear,
  currentMonth,
}: WeeklyBreakdownCardProps) {
  const now = new Date();
  const isViewingCurrentMonth =
    now.getFullYear() === currentYear && now.getMonth() === currentMonth;
  const currentDay = now.getDate();

  // 4 weekly buckets for the selected month (1-7, 8-14, 15-21, 22-31)
  const weekRanges = [
    { name: 'Week 1', rangeLabel: '1–7', start: 1, end: 7 },
    { name: 'Week 2', rangeLabel: '8–14', start: 8, end: 14 },
    { name: 'Week 3', rangeLabel: '15–21', start: 15, end: 21 },
    { name: 'Week 4', rangeLabel: '22–31', start: 22, end: 31 },
  ];

  const weeks = weekRanges.map((wr) => {
    const matchingTrades = trades.filter((t) => {
      if (!t.entryDate) return false;
      const parts = t.entryDate.split('-');
      if (parts.length !== 3) return false;
      const y = Number(parts[0]);
      const m = Number(parts[1]) - 1;
      const d = Number(parts[2]);
      return y === currentYear && m === currentMonth && d >= wr.start && d <= wr.end;
    });

    const active = isViewingCurrentMonth && currentDay >= wr.start && currentDay <= wr.end;
    const uniqueDays = new Set(matchingTrades.map((t) => t.entryDate)).size;
    const tradeCount = matchingTrades.length;
    const pnl = matchingTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

    return {
      name: wr.name,
      rangeLabel: wr.rangeLabel,
      days: uniqueDays > 0 ? `${uniqueDays} ${uniqueDays === 1 ? 'day' : 'days'}` : '0 days',
      tradeCount,
      pnl,
      active,
    };
  });

  const formatCurrency = (val: number, tradeCount: number) => {
    if (tradeCount === 0) return '-';
    if (val === 0) return '$0.00';
    const sign = val > 0 ? '+' : '-';
    return `${sign}$${Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <Card className="bg-white border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col gap-4 font-sans h-full">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <h2 className="text-sm font-bold text-zinc-950 tracking-tight">Weekly Breakdown</h2>
        <Badge variant="secondary" className="font-sans text-xs font-medium text-zinc-600 bg-zinc-100/90 border border-zinc-200/80 px-2.5 py-0.5 rounded-lg tracking-normal">
          4 Weeks
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3.5 flex-1 items-stretch">
        {weeks.map((w) => {
          return (
            <Card
              key={w.name}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all select-none shadow-none ${
                w.active
                  ? 'border-zinc-950/25 bg-white shadow-2xs'
                  : 'border-zinc-200/70 bg-zinc-50/40 hover:bg-zinc-50 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-700">{w.name}</span>
                <span className="text-[10px] font-sans tabular-nums text-zinc-400">
                  {w.active ? 'Current' : `Day ${w.rangeLabel}`}
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-0.5">
                <span className="text-[11px] font-sans tabular-nums text-zinc-400">
                  {w.days} · {w.tradeCount} {w.tradeCount === 1 ? 'trade' : 'trades'}
                </span>
                <span
                  className={`text-sm sm:text-base font-sans tabular-nums font-medium tracking-tight ${
                    w.tradeCount === 0
                      ? 'text-zinc-400'
                      : w.pnl > 0
                      ? 'text-emerald-600'
                      : w.pnl < 0
                      ? 'text-rose-600'
                      : 'text-zinc-700'
                  }`}
                >
                  {formatCurrency(w.pnl, w.tradeCount)}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
