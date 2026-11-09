'use client';

import React from 'react';
import { JournalTrade } from './types';

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
    <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col gap-4 font-sans h-full">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <h2 className="text-sm font-bold text-zinc-950 tracking-tight">Weekly Breakdown</h2>
        <span className="text-xs font-mono text-zinc-500 font-medium">4 Weeks</span>
      </div>

      <div className="grid grid-cols-2 gap-3.5 flex-1 items-stretch">
        {weeks.map((w) => {
          const isProfitable = w.pnl >= 0;
          return (
            <div
              key={w.name}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all select-none ${
                w.active
                  ? 'border-zinc-950 bg-white ring-2 ring-zinc-950/10 shadow-xs'
                  : 'border-zinc-200/80 bg-zinc-50/50 hover:bg-zinc-50 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700">{w.name}</span>
                {w.active && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-950 text-white font-bold">
                    Active
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-0.5">
                <span className="text-[11px] font-mono text-zinc-500">{w.days}</span>
                <span
                  className={`text-sm sm:text-base font-mono font-black tracking-tight ${
                    w.pnl === 0
                      ? 'text-zinc-400'
                      : isProfitable
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}
                >
                  {formatCurrency(w.pnl)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
