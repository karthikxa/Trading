'use client';

import React from 'react';
import { JournalTrade } from './types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WeeklyBreakdownCardProps {
  trades: JournalTrade[];
}

export function WeeklyBreakdownCard({ trades }: WeeklyBreakdownCardProps) {
  const weeks = [
    {
      name: 'Week 1',
      days: '-',
      pnl: 0,
      active: false,
    },
    {
      name: 'Week 2',
      days: '2 days',
      pnl: 640598.11,
      active: false,
    },
    {
      name: 'Week 3',
      days: '5 days',
      pnl: 1169060.01,
      active: false,
    },
    {
      name: 'Current',
      days: '1 days',
      pnl: -3900.0,
      active: true,
    },
  ];

  const formatCurrency = (val: number) => {
    if (val === 0) return '-';
    const sign = val >= 0 ? '+' : '-';
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
          const isProfitable = w.pnl >= 0;
          return (
            <Card
              key={w.name}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all select-none shadow-none ${
                w.active
                  ? 'border-zinc-300 bg-white shadow-2xs'
                  : 'border-zinc-200/70 bg-zinc-50/40 hover:bg-zinc-50 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-700">{w.name}</span>
              </div>

              <div className="mt-4 flex flex-col gap-0.5">
                <span className="text-[11px] font-mono text-zinc-400">{w.days}</span>
                <span
                  className={`text-sm sm:text-base font-mono font-medium tracking-tight ${
                    w.pnl === 0
                      ? 'text-zinc-400'
                      : isProfitable
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {formatCurrency(w.pnl)}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
