'use client';

import React from 'react';
import { JournalTrade } from './types';

interface WeeklyBreakdownCardProps {
  trades: JournalTrade[];
}

export function WeeklyBreakdownCard({ trades }: WeeklyBreakdownCardProps) {
  return (
    <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col gap-4 h-full font-sans">
      <h2 className="text-sm font-bold text-zinc-900 tracking-tight">Weekly Breakdown</h2>

      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Left Column: Week 1 & Week 3 */}
        <div className="flex flex-col justify-between gap-3">
          {/* Week 1 */}
          <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/70">
            <span className="text-xs font-semibold text-zinc-500">Week 1</span>
            <span className="text-sm font-mono text-zinc-400 font-medium">-</span>
          </div>

          {/* Week 3 */}
          <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700">Week 3</span>
              <span className="text-[10px] text-zinc-400 font-mono">5 days</span>
            </div>
            <span className="text-sm font-mono font-bold text-emerald-600">
              +$1,169,060.01
            </span>
          </div>
        </div>

        {/* Right Column: Week 2 & Current */}
        <div className="flex flex-col justify-between gap-3">
          {/* Week 2 */}
          <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700">Week 2</span>
              <span className="text-[10px] text-zinc-400 font-mono">2 days</span>
            </div>
            <span className="text-sm font-mono font-bold text-emerald-600">
              +$640,598.11
            </span>
          </div>

          {/* Current */}
          <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-purple-50/30 border border-purple-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-700">Current</span>
              <span className="text-[10px] text-purple-500 font-mono">1 days</span>
            </div>
            <span className="text-sm font-mono font-bold text-rose-600">
              -$3,900.00
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
